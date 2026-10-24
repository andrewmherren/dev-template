# Agent guide: monthly upkeep of the dev VM

For a Claude agent in the dev VM. The gateway updates itself weekly; this covers the dev VM.

**Limits:** don't delete Docker volumes or project files without asking: volumes hold project databases.

## Steps

1. **System packages:** `sudo apt-get update && sudo apt-get upgrade -y`. Note whether `/var/run/reboot-required` exists.
2. **Claude Code:** `claude update`.
3. **Disk:**
   - `df -h /` and `docker system df`.
   - `docker system prune -f` (stopped containers, unused networks, dangling images; volumes are kept).
   - If the disk is over 80% full, list the biggest images and volumes and ask before removing any.
4. **Network still fenced in:** through the proxy, `curl -sS -o /dev/null https://api.anthropic.com` works and `https://example.com` fails; `curl --noproxy '*' --max-time 5 https://1.1.1.1` fails. If a blocked check succeeds, stop and tell the user straight away: the gateway isn't doing its job.
5. **Secrets guard:** `node ~/.claude/hooks/test-block-secrets.js` passes.
6. **Report**, short:
   - What was updated (old → new versions where notable), disk before and after.
   - Whether a reboot is needed (the user runs `sudo reboot` when convenient).
   - Reminders: check the GitHub token's expiry date; if the template changed elsewhere, `git -C ~/dev-template pull`.
