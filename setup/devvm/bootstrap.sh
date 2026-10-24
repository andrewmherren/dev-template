#!/usr/bin/env bash
# First setup of the Ubuntu dev VM (setup/README.md, step 7). Run as the dev user, from the
# folder copied over from Windows:
#   sudo bash ~/devvm/bootstrap.sh
# Points everything at the gateway's proxy, locks SSH to your key, gives the dev user
# passwordless sudo (so agents can install what they need), and installs git, the gh CLI,
# Node (for Claude Code hooks) and Claude Code. AGENT_SETUP.md does the rest. Safe to re-run.
set -euo pipefail

PROXY=http://10.10.0.1:3128
NO_PROXY_LIST=localhost,127.0.0.1,::1,10.10.0.0/24

die() { echo "bootstrap: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run with sudo"
DEV_USER=${SUDO_USER:-}
[[ -n $DEV_USER && $DEV_USER != root ]] || die "run with sudo from the dev account, not as root"
DEV_HOME=$(getent passwd "$DEV_USER" | cut -d: -f6)
HERE=$(cd "$(dirname "$0")" && pwd)
[[ -s $HERE/authorized_keys ]] || die "authorized_keys is missing: copy your public key to setup/devvm/authorized_keys (setup/README.md, step 2)"

echo "== SSH: your key only"
install -d -m 700 -o "$DEV_USER" -g "$DEV_USER" "$DEV_HOME/.ssh"
tr -d '\r' < "$HERE/authorized_keys" > "$DEV_HOME/.ssh/authorized_keys"
chown "$DEV_USER:$DEV_USER" "$DEV_HOME/.ssh/authorized_keys"
chmod 600 "$DEV_HOME/.ssh/authorized_keys"
# 10- sorts before the installer's 50-cloud-init.conf, and sshd uses the first value it reads.
cat > /etc/ssh/sshd_config.d/10-agent-dev.conf <<'EOF'
# Written by bootstrap.sh: key-only login, nothing forwarded back to Windows.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
AllowAgentForwarding no
X11Forwarding no
EOF
sshd -t || die "the SSH configuration didn't pass sshd -t"
systemctl reload ssh

echo "== sudo without a password for $DEV_USER"
# The VM is the security boundary (setup/threat-model.md); agents can't type passwords.
echo "$DEV_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-agent-dev
chmod 440 /etc/sudoers.d/90-agent-dev
visudo -cq

echo "== Proxy: everything goes out through the gateway"
set_env() {
    if grep -q "^$1=" /etc/environment; then
        sed -i "s#^$1=.*#$1=$2#" /etc/environment
    else
        echo "$1=$2" >> /etc/environment
    fi
}
for name in http_proxy https_proxy HTTP_PROXY HTTPS_PROXY; do set_env "$name" "$PROXY"; done
for name in no_proxy NO_PROXY; do set_env "$name" "$NO_PROXY_LIST"; done
export http_proxy=$PROXY https_proxy=$PROXY HTTP_PROXY=$PROXY HTTPS_PROXY=$PROXY \
    no_proxy=$NO_PROXY_LIST NO_PROXY=$NO_PROXY_LIST
cat > /etc/apt/apt.conf.d/90agent-proxy <<EOF
Acquire::http::Proxy "$PROXY";
Acquire::https::Proxy "$PROXY";
EOF
# The VM has no DNS or NTP of its own: Hyper-V keeps the clock, and the proxy looks up names.
timedatectl set-ntp false
[[ -f /etc/default/motd-news ]] && sed -i 's/^ENABLED=1/ENABLED=0/' /etc/default/motd-news

echo "== Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q git curl ca-certificates gnupg jq nodejs unattended-upgrades

if ! command -v gh > /dev/null; then
    install -d -m 755 /etc/apt/keyrings
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli-archive-keyring.gpg
    chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list
    apt-get update -q
    apt-get install -y -q gh
fi

echo "== Claude Code"
if [[ ! -x $DEV_HOME/.local/bin/claude ]]; then
    sudo -u "$DEV_USER" -H env HTTPS_PROXY="$PROXY" HTTP_PROXY="$PROXY" \
        bash -c 'curl -fsSL https://claude.ai/install.sh | bash'
fi

echo "== Checking the network"
failed=0
check() {  # check <description> <expected: reach|blocked> <curl args...>
    local what=$1 expect=$2 got; shift 2
    if curl -sS -o /dev/null --max-time 10 "$@" 2> /dev/null; then got=reach; else got=blocked; fi
    if [[ $got == "$expect" ]]; then echo "  ok      $what"; else echo "  FAILED  $what (expected $expect)"; failed=1; fi
}
check "Anthropic API through the proxy" reach https://api.anthropic.com
check "github.com through the proxy" reach https://github.com
check "a site not on the allowlist" blocked https://example.com
check "the internet without the proxy" blocked --noproxy '*' https://1.1.1.1
check "the Windows host" blocked --noproxy '*' http://192.168.200.1

echo
if [[ $failed -eq 0 ]]; then
    echo "Done. Next: setup/README.md, step 8 (GitHub token)."
else
    echo "Some network checks failed: see setup/README.md > Troubleshooting."
    exit 1
fi
