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
   - Git name and email for commits. Default: none; they must answer.
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
   - `~/.docker/config.json`, so builds and containers get the proxy too. Create it with the Write tool (the secrets hook blocks shell commands that touch it):
     ```json
     { "proxies": { "default": { "httpProxy": "http://10.10.0.1:3128", "httpsProxy": "http://10.10.0.1:3128",
                                 "noProxy": "localhost,127.0.0.1,::1,10.10.0.0/24" } } }
     ```
   - The group change needs a new login: run the checks below with `sg docker -c '...'`.
   - Check: `docker run --rm hello-world`, and `docker run --rm curlimages/curl -sS -o /dev/null -w '%{http_code}' https://api.anthropic.com` prints a status (not `000`).
3. **Claude Code's user-level config**, from `~/dev-template/setup/devvm/claude-user/`:
   - Copy `hooks/` into `~/.claude/hooks/` and run `node ~/.claude/hooks/test-block-secrets.js`: every case must pass.
   - `CLAUDE.md` → `~/.claude/CLAUDE.md`.
   - Each folder in `skills/` → `~/.claude/skills/<name>/` (`new-project`, `import-project`, `remove-project`, `sync-template`, `monthly-upkeep`). Replace any existing copy.
   - `settings.json` → `~/.claude/settings.json`. If one exists, merge: keep its other keys, add these. If the user said no to bypass mode, leave out `defaultMode`.
4. **Updates:** make sure unattended-upgrades applies security updates daily without rebooting (Ubuntu's default: check `/etc/apt/apt.conf.d/20auto-upgrades` and `50unattended-upgrades`).
5. **Git:** `git config --global user.name/user.email` (their answers), `init.defaultBranch main`, `pull.ff only`. Create `~/projects/`.
6. **Network check:** re-run the checks at the end of `~/dev-template/setup/devvm/bootstrap.sh` by hand (curl through the proxy to api.anthropic.com and github.com should work; example.com, and anything with `--noproxy '*'`, should fail).
7. **Report**, short: what's installed (versions), check results, anything refused. Then tell the user:
   - Disconnect and reconnect (SSH or VS Code) for the `docker` group to take effect.
   - Next: setup/README.md, step 11.
