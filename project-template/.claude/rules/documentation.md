# Documentation

How to keep the project's documentation. Followed by every agent that changes code, settings or behavior, including subagents.

## Keep it current

**Whenever a change makes documentation wrong or incomplete, update it as part of the change:** in the same branch, in the same commit or the one after.

| When you change | Update |
|---|---|
| A technical decision (made, changed, reversed) | [TECH_SPEC.md](../../TECH_SPEC.md): the decision log, with status and date. Mark replaced decisions *Superseded*; don't delete them |
| A setup step, a setting, a command | `README.md`, and `env.example` for a setting |
| How a component works, its data flow or interfaces | `docs/developer/` |
| A feature's behavior, options or limits | `docs/product/` and `docs/customer/` |
| Security, data collected, data handling or retention, third parties | `docs/compliance/` |

## Writing it

- `docs/` has one folder per audience: `developer/` (how the system works, with Mermaid diagrams), `product/`, `customer/`, `compliance/`. Each has a `README.md` index.
- Code comments link to the relevant doc page, and cite TECH_SPEC decisions by D-number.
- How to write pages and links: the `write-docs` skill.

## Timeline

- **[history/timeline.md](../../history/timeline.md):** a documentary-style account of how the project evolves. Add an entry at meaningful milestones: a stage completed, a pivot, a key decision and why, a surprising finding, a dead end abandoned. Narrative prose, not a changelog; a few short paragraphs each.
