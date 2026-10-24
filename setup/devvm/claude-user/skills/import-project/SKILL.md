---
name: import-project
description: Bring an existing GitHub repo into ~/projects on the dev VM, optionally adding the dev-template agent rules (setup/README.md, section 3).
disable-model-invocation: true
---

# Bring in an existing project

## Steps

1. **Ask first**, all together:
   - The repo, as `<account>/<repo>`. No default.
   - Add this template's agent rules (`.claude/rules/`, skills, hooks, settings, `docs/`) if it doesn't have them? Default: **yes**.
2. **Access:** `gh repo view <account>/<repo>`. If it fails, the token doesn't cover it: tell the user to add it (GitHub > Settings > Developer settings > Fine-grained tokens > `agent-dev VM` > Repository access) and stop until they say it's done.
3. **Clone:** `gh repo clone <account>/<repo> ~/projects/<repo>`. Stop if the folder already exists.
4. **Agent rules** (if yes): on a new branch (`chore/add-dev-template`, made as in `.claude/rules/engineering-style.md` > Version control once the rules are in; until then `git switch -c chore/add-dev-template origin/<default branch>`):
   - Follow `/sync-template`'s steps 3–5, treating every template file as new. Merge with what's there: an existing `CLAUDE.md`, `.gitignore` or `.claude/settings.json` is extended, never replaced.
   - Fill in `.claude/rules/project.md` from what the repo shows (stack, core logic path, checks); leave a value as "not set yet" if unsure, and ask.
   - Write `git -C ~/dev-template rev-parse HEAD` into `.claude/template-version`.
   - Show the user the diff summary, then commit in small commits (rules; guardrails; docs skeleton).
5. **Secrets:** if the repo has `env.example` (or `.env.example`), tell the user to create `.env` from it with **development-only** keys. Never create or read `.env` yourself.
6. **Domains:** run the project's setup and tests once, in Docker. For every download refused by the proxy (403, "CONNECT tunnel failed"), list the domain and what needed it. The user checks with `ssh agent-gateway denied` and allows what they want.
7. **Report**, short: the folder, the branch (if rules were added), refused domains, and the user's remaining steps (`.env`, domains, reviewing and pushing the branch). Put those steps in `next-steps/01-import.md` in the project too.
