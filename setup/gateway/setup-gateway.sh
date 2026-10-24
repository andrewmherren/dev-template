#!/bin/sh
# Configures the Alpine gateway VM (setup/README.md, step 5). Run as root on the gateway,
# from the folder copied over from Windows:
#   sh /root/gateway/setup-gateway.sh
# Afterwards the gateway takes SSH from Windows by key only, routes nothing, and lets the
# dev VM out only through Squid to the domains in allowlist.txt. Safe to re-run: domains
# already added with `allow` are kept.
set -eu
cd "$(dirname "$0")"

NAT_MAC=00:15:5d:0a:00:01   # create-vms.ps1 / hyperv-manual.md set these MACs
LAN_MAC=00:15:5d:0a:00:02
NAT_IP=192.168.200.2
WINDOWS_IP=192.168.200.1
LAN_IP=10.10.0.1
DEV_IP=10.10.0.10

die() { echo "setup-gateway: $*" >&2; exit 1; }

iface_for_mac() {
    for dev in /sys/class/net/*; do
        if [ "$(cat "$dev/address")" = "$1" ]; then basename "$dev"; return; fi
    done
}

NAT_IF=$(iface_for_mac $NAT_MAC)
LAN_IF=$(iface_for_mac $LAN_MAC)
[ -n "$NAT_IF" ] && [ -n "$LAN_IF" ] || die "no adapters with the expected MACs; was the VM made by create-vms.ps1 or hyperv-manual.md?"
[ -s authorized_keys ] || die "authorized_keys is missing: copy your public key to setup/gateway/authorized_keys (setup/README.md, step 2)"
echo "Adapters: $NAT_IF = Windows/NAT side, $LAN_IF = dev VM side"

echo "Installing packages..."
apk update -q
apk add -q squid nftables openssh

echo "Network..."
cat > /etc/network/interfaces <<EOF
auto lo
iface lo inet loopback

auto $NAT_IF
iface $NAT_IF inet static
    address $NAT_IP/24
    gateway $WINDOWS_IP

auto $LAN_IF
iface $LAN_IF inet static
    address $LAN_IP/24
EOF
printf 'nameserver 1.1.1.1\nnameserver 9.9.9.9\n' > /etc/resolv.conf
ip link set "$LAN_IF" up
ip addr show "$LAN_IF" | grep -q "inet $LAN_IP/" || ip addr add "$LAN_IP/24" dev "$LAN_IF"

cat > /etc/sysctl.d/90-agent-gateway.conf <<'EOF'
# The gateway never routes: the dev VM gets out only through Squid.
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0
net.ipv6.conf.all.disable_ipv6 = 1
EOF
sysctl -q -p /etc/sysctl.d/90-agent-gateway.conf

echo "Firewall..."
sed -e "s/@NAT_IF@/$NAT_IF/g" -e "s/@LAN_IF@/$LAN_IF/g" nftables.nft > /etc/nftables.nft
nft -c -f /etc/nftables.nft
rc-update add nftables default > /dev/null
rc-service nftables restart

echo "Squid..."
cp squid.conf /etc/squid/squid.conf
if [ -f /etc/squid/allowlist.txt ]; then
    # Keep the gateway's list (it may have domains added with `allow`); add any new repo entries.
    grep -Ev '^[[:space:]]*(#|$)' allowlist.txt | while read -r domain; do
        grep -qxF "$domain" /etc/squid/allowlist.txt || echo "$domain" >> /etc/squid/allowlist.txt
    done
else
    cp allowlist.txt /etc/squid/allowlist.txt
fi
install -m 755 allow remove denied ollama /usr/local/bin/
# Ollama access stays as it was; a new gateway starts with it off.
[ -f /etc/squid/ollama.conf ] || echo "# Ollama access is off (\`ollama on\` turns it on)." > /etc/squid/ollama.conf
squid -k parse > /dev/null 2>&1 || die "Squid rejected its configuration; details: squid -k parse"
rc-update add squid default > /dev/null
rc-service squid restart

echo "Scheduled upkeep..."
cat > /etc/periodic/weekly/agent-upgrade <<'EOF'
#!/bin/sh
# Weekly (Saturday 03:00): apply Alpine updates, then reboot so a new kernel or Squid
# takes effect. The dev VM loses internet access for about 15 seconds.
apk update -q && apk upgrade -q --available > /var/log/agent-upgrade.log 2>&1
reboot
EOF
cat > /etc/periodic/daily/squid-rotate <<'EOF'
#!/bin/sh
squid -k rotate
EOF
chmod 755 /etc/periodic/weekly/agent-upgrade /etc/periodic/daily/squid-rotate
rc-update add crond default > /dev/null
rc-service crond start > /dev/null 2>&1 || true

echo "SSH..."
# A hop-only account for reaching the dev VM (ProxyJump): no shell, no password.
if ! id jump > /dev/null 2>&1; then
    adduser -D -s /sbin/nologin jump
fi
# Alpine creates the account locked ("!"), and sshd refuses locked accounts even for keys.
sed -i 's/^jump:!:/jump:*:/' /etc/shadow
for home in /root /home/jump; do
    owner=$(basename "$home"); [ "$home" = /root ] && owner=root
    install -d -m 700 -o "$owner" -g "$owner" "$home/.ssh"
    tr -d '\r' < authorized_keys > "$home/.ssh/authorized_keys"
    chown "$owner:$owner" "$home/.ssh/authorized_keys"
    chmod 600 "$home/.ssh/authorized_keys"
done

mkdir -p /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/10-agent-gateway.conf <<EOF
# Written by setup-gateway.sh. Windows reaches the gateway at $NAT_IP, by key only.
ListenAddress $NAT_IP
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
AllowAgentForwarding no
AllowTcpForwarding no
X11Forwarding no
EOF
# Include must come first (sshd uses the first value it reads). The Match block must come
# last: it applies to everything after it, so it goes at the end of the main file.
grep -q '^Include /etc/ssh/sshd_config.d/\*\.conf' /etc/ssh/sshd_config \
    || sed -i '1i Include /etc/ssh/sshd_config.d/*.conf' /etc/ssh/sshd_config
sed -i '/^# BEGIN agent-gateway jump/,/^# END agent-gateway jump/d' /etc/ssh/sshd_config
cat >> /etc/ssh/sshd_config <<EOF
# BEGIN agent-gateway jump (setup-gateway.sh)
Match User jump
    AllowTcpForwarding local
    PermitOpen $DEV_IP:22
    PermitTTY no
    ForceCommand /sbin/nologin
# END agent-gateway jump
EOF
sshd -t || die "the SSH configuration didn't pass sshd -t; password login still works, nothing restarted"
rc-service sshd restart

echo
echo "Done. From Windows, check:  ssh agent-gateway denied"
echo "Password login is now off: use the key (setup/README.md, step 5)."
