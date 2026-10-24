# CLAUDE.md

This repo is a template, not an app: setup guides and scripts for the agent workstation (`setup/`), and the files copied into each new project (`project-template/`). Start at [README.md](README.md).

## Always loaded

- @project-template/.claude/rules/working-style.md
- @project-template/.claude/rules/engineering-style.md
- @project-template/.claude/rules/security.md

## Rules for this repo

- `project-template/` is copied as-is into new projects: keep it project-agnostic. Placeholders look like `{{PROJECT_NAME}}`; the `new-project` skill lists them all.
- Agent procedures are skills, set to run only when the user types their name (`disable-model-invocation: true`): `.claude/skills/` runs in this repo (Windows, or the dev VM in `~/dev-template`); `setup/devvm/claude-user/skills/` is installed to `~/.claude/skills/` in the VM; `project-template/.claude/skills/` go into every project. Everything else is for people. Keep both concise: numbered steps and bullets.
- When `project-template/` changes in a way existing projects should get, make sure `/sync-template` handles it (a new file type, a file that moves).
- Scripts are safe to re-run, and say at the top where they run (Windows admin PowerShell, gateway as root, dev VM with sudo).
- Never run `setup/windows/*.ps1` yourself: they need admin rights on Windows. The user runs them.
- Text files use LF line endings (`.gitattributes`); the shell scripts break with CRLF.
- **Fixed addresses** are repeated across files. If one changes, grep for it and update every file:
  - `192.168.200.` (Windows ↔ gateway network), `10.10.0.` (gateway ↔ dev VM network)
  - MACs `00155D0A00..` / `00:15:5d:0a:00:..`
  - VM names `agent-gateway`, `agent-dev`; switch names `AgentNAT`, `AgentLAN`
  - Ollama port `11434` (`setup/gateway/access`, `setup/windows/ollama.md`)
  - Squid ports `3128` (web) and `3129` (device tunnels): `squid.conf`, `nftables.nft`, the dev VM proxy settings, the `remote-device` skill
- This repo's `.claude/settings.json` applies the same secret rules as projects: its deny list mirrors `project-template/.claude/settings.json` (keep them in step), and its hooks run the copies in `project-template/.claude/hooks/` and `setup/devvm/claude-user/hooks/`.
- Git: as in `project-template/.claude/rules/engineering-style.md` > Version control: feature branches may be pushed, never the default branch. In the dev VM this repo is read-only (`setup/README.md`, step 8).
- Names: folders and files under `project-template/` are kebab-case; only root meta files are UPPERCASE (`README.md`, `CLAUDE.md`, `TECH_SPEC.md`). Rule files say "the user", never a name or "I".
