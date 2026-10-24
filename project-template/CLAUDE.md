# CLAUDE.md

{{DESCRIPTION}}

## Rules

Every file in `.claude/rules/` loads automatically. `project.md` wins where it's more specific; `security.md` always applies.

| File | Covers |
|---|---|
| [working-style.md](.claude/rules/working-style.md) | How to work with the user: replies, open questions, `next-steps/`, `ideas/`, the project view |
| [engineering-style.md](.claude/rules/engineering-style.md) | How to build: design, dependencies, debuggability, **git (local only)**, Docker |
| [security.md](.claude/rules/security.md) | **Hard rules:** secrets, untrusted content |
| [documentation.md](.claude/rules/documentation.md) | What to document where (`docs/`), links from code, the timeline |
| [project.md](.claude/rules/project.md) | This project: stack, development rules |

## Where things are

| Need | Go to |
|---|---|
| What the product is, the plan, every decision and why | [TECH_SPEC.md](TECH_SPEC.md) |
| How the system works, for each audience | [docs/](docs/) |
| How the project got here | [history/timeline.md](history/timeline.md) |
| The user's open manual tasks | `next-steps/` (git-ignored) |
| The user's ideas for later | `ideas/` (git-ignored) |
