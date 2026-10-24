# CLAUDE.md

This repo is a template, not an app: setup guides and scripts for the agent workstation (`setup/`), and the files copied into each new project (`project-template/`). Start at [README.md](README.md).

## Always loaded

- @project-template/.claude/rules/working-style.md
- @project-template/.claude/rules/engineering-style.md
- @project-template/.claude/rules/security.md

## Rules for this repo

- `project-template/` is copied as-is into new projects: keep it project-agnostic. Placeholders look like `{{PROJECT_NAME}}`; `AGENT_NEW_PROJECT.md` lists them all.
- `AGENT_*.md` files are instructions for agents; the rest are for people. Keep both concise: numbered steps and bullets.
- Scripts are safe to re-run, and say at the top where they run (Windows admin PowerShell, gateway as root, dev VM with sudo).
- Never run `setup/windows/*.ps1` yourself: they need admin rights on Windows. The user runs them.
- Text files use LF line endings (`.gitattributes`); the shell scripts break with CRLF.
- **Fixed addresses** are repeated across files. If one changes, grep for it and update every file:
  - `192.168.200.` (Windows ↔ gateway network), `10.10.0.` (gateway ↔ dev VM network)
  - MACs `00155D0A00..` / `00:15:5d:0a:00:..`
  - VM names `agent-gateway`, `agent-dev`; switch names `AgentNAT`, `AgentLAN`
- Git: local only, as in `project-template/.claude/rules/engineering-style.md` > Version control. The user pushes.
- Names: folders and files under `project-template/` are kebab-case; only root meta files are UPPERCASE (`README.md`, `CLAUDE.md`, `TECH_SPEC.md`). Rule files say "the user", never a name or "I".
