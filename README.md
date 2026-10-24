# dev-template

A starting point for projects built with Claude Code running with a high level of autonomy, without exposing your personal computer.

- **The workstation:** one Ubuntu VM where agents work, behind a tiny gateway VM that only lets traffic out to an allowlist of domains. Both run in Hyper-V on Windows and cost nothing beyond a Claude plan.
- **The project template:** the agent instruction files (working style, engineering style, security, documentation and project rules, secrets guardrails) copied into every new project.

## Start here

| I want to | Go to |
|---|---|
| Set up the workstation on a new PC (once) | [setup/README.md](setup/README.md) > 1 (the master guide) |
| Understand what it protects against, and what it doesn't | [setup/threat-model.md](setup/threat-model.md) |
| Start a new project | [setup/README.md](setup/README.md) > 2 |
| Bring in a repo I already have | [setup/README.md](setup/README.md) > 3 |
| Remove a project | [setup/README.md](setup/README.md) > 4 |
| Keep things up to date | [setup/README.md](setup/README.md) > Day to day |

## Layout

| Path | What |
|---|---|
| `setup/windows/` | VM creation (script and manual), SSH and VS Code settings for Windows |
| `setup/gateway/` | The Alpine gateway: Squid proxy, allowlist, firewall |
| `setup/devvm/` | The Ubuntu dev VM: bootstrap script, Claude's user-level config and skills (`/new-project`, `/import-project`, `/remove-project`, `/sync-template`, `/monthly-upkeep`) |
| `setup/maintenance/` | Going back to a checkpoint, rebuilding |
| `project-template/` | Copied into each new project by `/new-project` |
| `.claude/skills/` | Agent skills run in this repo: `/prepare-windows`, `/finish-vm-setup` |

Agent procedures are Claude Code skills (`SKILL.md` files), run by typing `/<name>`; everything else is for people.

## Making it yours

The rule files in `project-template/.claude/rules/` describe one way of working. If you use this template, edit them to suit you. Projects keep their own copies; `/sync-template` brings one up to date with the template.
