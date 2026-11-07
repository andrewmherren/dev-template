---
name: dt-help
description: Explain how to use this dev-template setup - list its /dt- commands and routine tasks (/dt-help), or answer a question about using it (/dt-help <question>).
disable-model-invocation: true
---

# Help with the dev-template setup

Works from any folder in the VM. The READMEs are the source of truth: read them each time, don't answer from memory, and don't copy their content into this skill.

## Steps

1. **Read:** `~/dev-template/README.md` (the Skills table lists every command) and `~/dev-template/setup/README.md` (sections 2–4, Optional extras, Day to day, Troubleshooting). For a question, also read the guide they link to for it (e.g. `setup/windows/ollama.md`, `setup/maintenance/*.md`).
2. **No question:** reply with, short:
   - **Commands:** each `/dt-` command from the Skills table, with where to run it and one line on what it does. Mark the ones that run inside a project.
   - **Routine:** the Day to day tasks, one line each (monthly upkeep, dependency sweeps, template sync, gateway commands, blocked sites).
   - **In this project** (only if the current folder is a project with a `.claude/` folder): any `.claude/skills/` the project added itself, beyond the template's `dt-` ones.
   - End with: "Ask `/dt-help <question>`, or just ask me how to do something."
3. **A question:** answer it from those files: where to run it (Windows PowerShell, admin PowerShell, the VM, a project), the exact command, and a link to the section it came from (`~/dev-template/setup/README.md` > Day to day). If the READMEs don't cover it, say so instead of guessing.
4. **Out of date?** If `git -C ~/dev-template status -sb` shows it behind `origin`, say the answer may be out of date: the user pulls it (`git -C ~/dev-template pull`); you don't.
