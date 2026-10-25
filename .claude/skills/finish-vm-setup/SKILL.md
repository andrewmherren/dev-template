---
name: finish-vm-setup
description: Finish setting up the agent dev VM after bootstrap.sh (setup/README.md, step 10) - Docker, Claude Code user config and skills, updates, git, network checks.
disable-model-invocation: true
---

# Finish setting up the dev VM

For Claude Code in the dev VM, started in `~/dev-template` after `bootstrap.sh` has run. You have passwordless sudo. Context: `setup/README.md` and `setup/threat-model.md`.

**Limits:** don't change the proxy settings (`/etc/environment`, `/etc/apt/apt.conf.d/90agent-proxy`), sshd or sudoers. If a download is refused by the proxy, name the domain to the user and stop that step; they decide whether to allow it.

## Steps

1. **Ask first**, all together:
   - Git name and email for commits (ask in plain text: they type both). Default: none; they must answer. Explain: both go into every commit, and on GitHub anyone can read them. GitHub's private address hides the real email and still links the commits to their account: GitHub > Settings > Emails > tick **Keep my email addresses private**, then use the address shown there (`<id>+<username>@users.noreply.github.com`). Recommend it.
   - Start Claude Code in bypass-permissions mode by default? Default: **yes**. The VM and gateway are the boundary, and that's what lets agents work without prompts. Deny rules and the secrets hook still apply.
2. **Docker Engine**, from Docker's apt repository (docs.docker.com/engine/install/ubuntu):
   - Packages: `docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin`.
   - Add the user to the `docker` group.
   - `/etc/docker/daemon.json`, so the daemon pulls images through the proxy:
     ```json
     { "proxies": { "http-proxy": "http://10.10.0.1:3128", "https-proxy": "http://10.10.0.1:3128",
                    "no-proxy": "localhost,127.0.0.1,::1,10.10.0.0/24" } }
     ```
     Then `sudo systemctl restart docker`.
   - Builds and containers get the proxy too: `bash ~/dev-template/setup/devvm/docker-client-proxy.sh` (as the dev user, not sudo). It merges the setting into `~/.docker/config.json`, which agents don't read or write themselves: it can hold registry logins, and the deny rules guard it.
   - The group change needs a new login: run the checks below with `sg docker -c '...'`.
   - Check: `docker run --rm hello-world`, and `docker run --rm curlimages/curl -sS -o /dev/null -w '%{http_code}' https://api.anthropic.com` prints a status (not `000`).
3. **Claude Code's user-level config**, from `~/dev-template/setup/devvm/claude-user/`:
   - Copy `hooks/` into `~/.claude/hooks/`, plus from `~/dev-template/project-template/.claude/hooks/`: `shell-words.js`, `guard-git-push.js`, `guard-remote-device.js`, and the two guards' tests `test-guard-git-push.js` and `test-guard-remote-device.js` (one copy each, in the project template; the VM runs them for every repo; `shell-words.js` is a helper they share, tested through them). Run each `node ~/.claude/hooks/test-*.js`: every case must pass.
   - `CLAUDE.md` → `~/.claude/CLAUDE.md`.
   - Each folder in `skills/` → `~/.claude/skills/<name>/` (`new-project`, `import-project`, `remove-project`, `sync-template`, `monthly-upkeep`). Replace any existing copy.
   - `settings.json` → `~/.claude/settings.json`. If one exists, merge: keep its other keys, add these. If the user said no to bypass mode, leave out `defaultMode`. Its `env` turns off Claude Code's telemetry, error reports and auto-updater (the gateway would refuse them; `/monthly-upkeep` updates Claude Code).
4. **Updates:** make sure unattended-upgrades applies security updates daily without rebooting (Ubuntu's default: check `/etc/apt/apt.conf.d/20auto-upgrades` and `50unattended-upgrades`).
5. **Git:** `git config --global user.name/user.email` (their answers), `init.defaultBranch main`, `pull.ff only`. Create `~/projects/`.
6. **Network check:** re-run every `check` at the end of `~/dev-template/setup/devvm/bootstrap.sh` by hand, with the same curl arguments; each must give its expected result.
7. **Report**, short: what's installed (versions), check results, anything refused. Then tell the user:
   - Disconnect and reconnect (SSH or VS Code) for the `docker` group to take effect.
   - Next: setup/README.md, step 11.
