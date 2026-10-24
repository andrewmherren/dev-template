# Project: {{PROJECT_NAME}}

Rules specific to this project. They take precedence over the other files in `.claude/rules/` where they're more specific (except [security.md](security.md), which always applies).

## The project

{{DESCRIPTION}} The spec, plan and decision log: [TECH_SPEC.md](../../TECH_SPEC.md).

## Stack

{{STACK}}

## Development rules

- The "core logic" [engineering-style.md](engineering-style.md) refers to: {{CORE_LOGIC_PATH}}.
- Checks before committing (all in Docker): {{CHECKS}}
- Debuggability variant ([engineering-style.md](engineering-style.md) > Debuggability) and how an agent reads it: not chosen yet.
