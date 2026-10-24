---
name: remove-project
description: Remove a project from ~/projects on the dev VM - check nothing is unpushed, delete its containers, volumes and folder, and list the user's remaining steps (setup/README.md, section 4).
disable-model-invocation: true
---

# Remove a project

Destructive: every deletion below needs the user's explicit yes, for this project, in this chat.

## Steps

1. **Ask which project** (a folder in `~/projects/`), unless the user named it.
2. **Check for unsaved work**, in that folder, and show the results:
   - `git status --short` (uncommitted changes), `git stash list`
   - `git log --branches --not --remotes --oneline` (commits not pushed)
   - files in `next-steps/` and `ideas/` (git-ignored, so not on GitHub)
   - Docker volumes it owns: `docker compose ls`, `docker volume ls --filter label=com.docker.compose.project=<name>` (local databases)
   If anything is unsaved, stop and ask: the user pushes, or copies what they want out, or says to discard it.
3. **Confirm**, in one question: "Delete the containers, volumes and images, and `~/projects/<name>`? This can't be undone." Go on only on a clear yes.
4. **Delete:**
   - `docker compose down -v --rmi local --remove-orphans` (if it has a compose file)
   - `rm -rf ~/projects/<name>`
   - `docker system prune -f` (volumes of other projects are kept)
5. **Report**, short, with the user's remaining steps (there's no project left to hold a `next-steps/` file, so list them in chat):
   - Remove the repo from the `agent-dev VM` token (GitHub > Settings > Developer settings > Fine-grained tokens > Repository access).
   - Revoke the development keys that were in its `.env`.
   - Optional: `ssh agent-gateway remove <domain>` for domains only it needed (name any you know of), and delete them from `~/dev-template/setup/gateway/allowlist.txt` if listed there.
   - Optional: archive or delete the GitHub repo.
