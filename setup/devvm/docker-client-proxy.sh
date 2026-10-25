#!/usr/bin/env bash
# Points Docker builds and containers at the gateway's proxy: the "proxies" key in ~/.docker/config.json.
# Run in the dev VM as the dev user (no sudo); safe to re-run. Used by the finish-vm-setup skill.
# The file can also hold registry logins, so agents don't read or write it directly; this script
# merges in the proxy settings and keeps everything else, without printing the file.
set -euo pipefail

PROXY=http://10.10.0.1:3128
NO_PROXY_LIST=localhost,127.0.0.1,::1,10.10.0.0/24
CONFIG=$HOME/.docker/config.json

[[ $EUID -ne 0 ]] || { echo "docker-client-proxy: run as the dev user, not with sudo" >&2; exit 1; }
command -v jq > /dev/null || { echo "docker-client-proxy: needs jq (bootstrap.sh installs it)" >&2; exit 1; }

install -d -m 700 "$HOME/.docker"
current='{}'
[[ -s $CONFIG ]] && current=$(< "$CONFIG")
tmp=$(mktemp "$HOME/.docker/config.json.XXXXXX")
jq --arg p "$PROXY" --arg n "$NO_PROXY_LIST" \
    '.proxies.default = {httpProxy: $p, httpsProxy: $p, noProxy: $n}' <<< "$current" > "$tmp"
chmod 600 "$tmp"
mv "$tmp" "$CONFIG"
echo "Docker builds and containers now use the proxy ($PROXY)."
