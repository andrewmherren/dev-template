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
| See every agent skill and when to run it | [Skills](#skills), below |
| Use local AI models (Ollama on Windows, with its GPU) instead of paid APIs | [setup/windows/ollama.md](setup/windows/ollama.md) (optional) |
| Let a project's agent SSH into a device on my network (e.g. a Raspberry Pi) | the project's `/remote-device` skill: [setup/README.md](setup/README.md) > Optional extras |

## Layout

| Path | What |
|---|---|
| `setup/windows/` | VM creation (script and manual), SSH and VS Code settings for Windows |
| `setup/gateway/` | The Alpine gateway: Squid proxy, allowlist, firewall |
| `setup/devvm/` | The Ubuntu dev VM: bootstrap script, Claude's user-level config and skills (`/new-project`, `/import-project`, `/remove-project`, `/sync-template`, `/monthly-upkeep`) |
| `setup/maintenance/` | Going back to a checkpoint, rebuilding, getting disk space back |
| `setup/github-repo-settings.md` | GitHub settings for repos agents push to (rulesets, Actions, security) |
| `project-template/` | Copied into each new project by `/new-project` |
| `.claude/skills/` | Agent skills run in this repo: `/prepare-windows`, `/finish-vm-setup` ([Skills](#skills)) |

## Skills

Agent procedures are Claude Code skills (`SKILL.md` files). You run them by typing `/<name>` in Claude, in the place shown; everything else is for people.

| Skill | Run in | When | What it does |
|---|---|---|---|
| `/prepare-windows` | this repo, on Windows | setting up (step 1) | Checks the PC, sizes the VMs, downloads and verifies the ISOs |
| `/finish-vm-setup` | `~/dev-template` in the VM | setting up (step 10) | Docker, Claude's user settings, hooks and skills, network checks |
| `/new-project` | the VM, any folder | each new project | Creates `~/projects/<name>` from the template, with its GitHub checklist |
| `/import-project` | the VM, any folder | each existing repo | Clones it, checks what would run on its own, adds the template's rules on a branch |
| `/remove-project` | the VM, any folder | when a project ends | Checks nothing is unpushed, then deletes its containers, data and folder |
| `/sync-template` | a project | after the template changes | Brings its rules, skills and guardrails up to date, keeping its own edits |
| `/monthly-upkeep` | the VM, any folder | monthly | Updates the VM and Claude, checks the network fence and hooks, lists projects behind the template or due a dependency sweep |
| `/upgrade-dependencies` | a project | `review <PR#>` for each Dependabot pull request; `sweep` every few months | Reviews an update (changelog, CI, local checks), or updates every pinned version on patch, minor and per-major branches |
| `/remote-device` | a project | optional | Lets the project's agent SSH into one device on your network (Raspberry Pi first) |

Two more load by themselves when an agent needs them: `write-docs` (writing `docs/` pages) and `debug-recorder` (building debug recording).

## Making it yours

The rule files in `project-template/.claude/rules/` describe one way of working. If you use this template, edit them to suit you. Projects keep their own copies; `/sync-template` brings one up to date with the template.
