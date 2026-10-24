#!/bin/bash
# Sets up an SSH account for a coding agent on a Raspberry Pi (Raspberry Pi OS, or any Debian-based
# system with systemd). Run on the device as root; safe to re-run. Access starts OFF.
#   sudo bash setup-agent-account.sh --key-file agent-key.pub [--from <ip>] [--user claude-agent]
#                                    [--duration 2h] [--no-sudo]
# Afterwards, on the device: sudo agent-access on [duration] | off | status | remove
# Adapted from github.com/andrewmherren/philco scripts/remote-access.
set -euo pipefail

SERVICE_USER=claude-agent
DURATION=2h
FROM=
KEY_FILE=
SUDO=yes

die() { echo "setup-agent-account: $*" >&2; exit 1; }

while [ $# -gt 0 ]; do
    case $1 in
        --key-file) KEY_FILE=${2:-}; shift 2 ;;
        --from) FROM=${2:-}; shift 2 ;;
        --user) SERVICE_USER=${2:-}; shift 2 ;;
        --duration) DURATION=${2:-}; shift 2 ;;
        --no-sudo) SUDO=no; shift ;;
        *) die "unknown option: $1" ;;
    esac
done

[ "$(id -u)" -eq 0 ] || die "run as root (sudo)"
[ -d /run/systemd/system ] || die "needs systemd (access expires through a systemd timer)"
[[ $SERVICE_USER =~ ^[a-z][a-z0-9-]{0,30}$ ]] || die "--user: lower-case letters, digits and dashes"
[[ $DURATION =~ ^([0-9]+(min|m|h)|forever)$ ]] || die "--duration: like 30min, 2h, or forever"
[ -z "$FROM" ] || [[ $FROM =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || die "--from: an IPv4 address"
[ -s "$KEY_FILE" ] || die "--key-file: the agent's public key file (made in the dev VM)"
KEY=$(tr -d '\r' < "$KEY_FILE" | head -n 1)
[[ $KEY =~ ^ssh-(ed25519|rsa)\ [A-Za-z0-9+/=]+(\ .*)?$ ]] || die "$KEY_FILE doesn't look like an SSH public key"

echo "== Account $SERVICE_USER (no password; key only)"
if ! id "$SERVICE_USER" > /dev/null 2>&1; then
    adduser --disabled-password --gecos "" "$SERVICE_USER" > /dev/null
fi
passwd -l "$SERVICE_USER" > /dev/null
HOME_DIR=$(getent passwd "$SERVICE_USER" | cut -d: -f6)
install -d -m 700 -o "$SERVICE_USER" -g "$SERVICE_USER" "$HOME_DIR/.ssh"
# Empty until `agent-access on`.
install -m 600 -o "$SERVICE_USER" -g "$SERVICE_USER" /dev/null "$HOME_DIR/.ssh/authorized_keys"

# restrict: no port, agent or X11 forwarding and no terminal; commands run one by one.
OPTIONS=restrict
[ -z "$FROM" ] || OPTIONS="$OPTIONS,from=\"$FROM\""
install -d -m 700 /etc/agent-access
echo "$OPTIONS $KEY" > /etc/agent-access/key
chmod 600 /etc/agent-access/key
cat > /etc/agent-access/config <<EOF
SERVICE_USER=$SERVICE_USER
DEFAULT_DURATION=$DURATION
EOF

SUDOERS=/etc/sudoers.d/90-$SERVICE_USER
if [ $SUDO = yes ]; then
    echo "== sudo without a password (the agent can't type one)"
    echo "$SERVICE_USER ALL=(ALL) NOPASSWD:ALL" > "$SUDOERS.tmp"
    chmod 440 "$SUDOERS.tmp"
    visudo -cqf "$SUDOERS.tmp" || { rm -f "$SUDOERS.tmp"; die "sudoers check failed; nothing changed"; }
    mv "$SUDOERS.tmp" "$SUDOERS"
else
    rm -f "$SUDOERS"
fi

echo "== The agent-access command"
cat > /usr/local/sbin/agent-access <<'SCRIPT'
#!/bin/bash
# Turns the coding agent's SSH access on (for a while) or off. Written by setup-agent-account.sh.
#   sudo agent-access on [30min|2h|forever]    sudo agent-access off
#   sudo agent-access status                   sudo agent-access remove   (deletes the account)
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "run with sudo" >&2; exit 1; }
. /etc/agent-access/config
HOME_DIR=$(getent passwd "$SERVICE_USER" | cut -d: -f6)
KEYS=$HOME_DIR/.ssh/authorized_keys
TIMER=agent-access-expire

stop_timer() {
    systemctl stop "$TIMER.timer" > /dev/null 2>&1 || true
    systemctl reset-failed "$TIMER.service" "$TIMER.timer" > /dev/null 2>&1 || true
}
revoke() {
    : > "$KEYS"
    pkill -u "$SERVICE_USER" 2> /dev/null || true   # end sessions already open
}

case "${1:-status}" in
on)
    duration=${2:-$DEFAULT_DURATION}
    [[ $duration =~ ^([0-9]+(min|m|h)|forever)$ ]] || { echo "duration: like 30min, 2h, or forever" >&2; exit 2; }
    install -m 600 -o "$SERVICE_USER" -g "$SERVICE_USER" /etc/agent-access/key "$KEYS"
    stop_timer
    if [ "$duration" = forever ]; then
        echo "$SERVICE_USER access ON, until: sudo agent-access off"
    else
        # AccuracySec: systemd timers otherwise fire up to a minute late.
        systemd-run --quiet --unit="$TIMER" --on-active="$duration" --timer-property=AccuracySec=1s \
            /usr/local/sbin/agent-access expire
        echo "$SERVICE_USER access ON for $duration (sudo agent-access off ends it sooner)"
    fi
    ;;
off)
    revoke
    stop_timer
    echo "$SERVICE_USER access OFF"
    ;;
expire)
    # Run by the timer: it mustn't stop its own unit.
    revoke
    echo "$SERVICE_USER access expired"
    ;;
status)
    if [ -s "$KEYS" ]; then
        left=$(systemctl list-timers "$TIMER.timer" --no-legend 2> /dev/null | awk '{ for (i = 1; i <= NF; i++) if ($i == "left") { print $(i-1); exit } }')
        echo "ON${left:+, $left left}"
    else
        echo "OFF"
    fi
    echo "Recent logins:"; journalctl -q --since -7d -g "Accepted publickey for $SERVICE_USER" 2> /dev/null | tail -n 5 || true
    ;;
remove)
    revoke
    stop_timer
    userdel -r "$SERVICE_USER" 2> /dev/null || true
    rm -rf /etc/agent-access "/etc/sudoers.d/90-$SERVICE_USER"
    rm -f /usr/local/sbin/agent-access
    echo "Removed $SERVICE_USER, its sudo rule and agent-access."
    ;;
*)
    echo "usage: sudo agent-access on [30min|2h|forever] | off | status | remove" >&2
    exit 2
    ;;
esac
SCRIPT
chmod 700 /usr/local/sbin/agent-access

echo "== SSH server"
systemctl enable --now ssh > /dev/null 2>&1 || systemctl enable --now sshd > /dev/null 2>&1 || true
allow=$(sshd -T 2> /dev/null | awk '$1 == "allowusers" { $1 = ""; print }')
if [ -n "$allow" ] && ! echo " $allow " | grep -q " $SERVICE_USER "; then
    echo "WARNING: sshd only lets in: $allow. Add $SERVICE_USER to AllowUsers in /etc/ssh/sshd_config." >&2
fi

echo
echo "Done. Access is OFF. Turn it on with:  sudo agent-access on   (default $DURATION)"
echo "Host key fingerprints, to compare with the agent's first connection:"
for k in /etc/ssh/ssh_host_ed25519_key.pub /etc/ssh/ssh_host_ecdsa_key.pub; do
    [ -e "$k" ] && ssh-keygen -lf "$k"
done
