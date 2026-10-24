# {{PROJECT_NAME}}: Tech Spec

## What it is

{{DESCRIPTION}}

## Plan

Stages, each a thin slice of the real product. The current status is in `next-steps/project-view.md`.

1. ...

## Decision log

Each decision: what was chosen, the alternatives considered, and why. Status is *Accepted*, *Superseded by Dn* or *Reversed*.

### D1: Project template and agent workstation
- **Status:** Accepted ({{DATE}})
- **Decision:** Start from `dev-template`: agent rules in `.claude/rules/`, documentation in `docs/`, secrets guardrails in `.claude/`, development inside the agent dev VM behind an allowlisting gateway.
- **Why:** agents can work with high autonomy while personal data and credentials stay off the machine they run on.
