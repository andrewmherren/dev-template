---
name: monthly-upkeep
description: Monthly upkeep of the agent dev VM - packages, Claude Code, disk, network fence, secrets guard, user-level config and projects behind the template.
disable-model-invocation: true
---

# Monthly upkeep of the dev VM

The gateway updates itself weekly; this covers the dev VM. Best run after the user has pulled the template (`git -C ~/dev-template pull`); you don't pull.

**Limits:** don't delete Docker volumes or project files without asking: volumes hold project databases.

## Steps

1. **System packages:** `sudo apt-get update && sudo apt-get upgrade -y`. Note whether `/var/run/reboot-required` exists.
2. **Claude Code:** `claude update`.
3. **Disk:**
   - `df -h /` and `docker system df`.
   - `docker system prune -f` (stopped containers, unused networks, dangling images; volumes are kept).
   - If the disk is over 80% full, list the biggest images and volumes and ask before removing any.
4. **Network still fenced in:** run every `check` at the end of `~/dev-template/setup/devvm/bootstrap.sh` by hand, with the same curl arguments. If a blocked check succeeds, stop and tell the user straight away: the gateway isn't doing its job.
5. **Secrets guard:** `node ~/.claude/hooks/test-block-secrets.js` passes.
6. **User-level config:** compare `~/dev-template/setup/devvm/claude-user/` (`CLAUDE.md`, `hooks/`, `skills/`, `settings.json`) with `~/.claude/`. Show what differs and ask; then copy the changed files (merge `settings.json`: keep keys that aren't in the template) and re-run step 5.
7. **Projects behind the template:** for each `~/projects/*`, compare `.claude/template-version` (missing in older projects) with `git -C ~/dev-template rev-parse HEAD`. List the ones behind; the user runs `/sync-template` in each when convenient.
8. **Report**, short:
   - What was updated (old → new versions where notable), disk before and after.
   - Whether a reboot is needed (the user runs `sudo reboot` when convenient).
   - Projects behind the template.
   - Reminders: check the GitHub token's expiry date; pull `~/dev-template` if it changed elsewhere.
