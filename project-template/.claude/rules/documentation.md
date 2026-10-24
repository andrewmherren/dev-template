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

## `docs/` layout

One folder per audience. Each has a `README.md` index linking its pages; add a line there for each new page.

- **`docs/developer/`:** how the system works, for onboarding new developers quickly and for agents. Architecture, components, data flow, key interfaces, how to run and debug. Use Mermaid diagrams where a picture is clearer than prose.
- **`docs/product/`:** for the product and support teams: what each feature does and why, configuration and flags, known limits, how to troubleshoot common issues.
- **`docs/customer/`:** for customers: how to use the application and its features, in plain language, no internals.
- **`docs/compliance/`:** for audits: security controls, privacy, what data is collected and why, where it's stored, who can access it, retention, and third-party processors. Link to the code or config that enforces each point.

## Writing it

- Concise: headings, bullets and short steps. One topic per page.
- Docs describe how things are now; history goes in the timeline, reasons in the decision log.
- No secrets or real personal data in examples.

## Links from code

- Code comments link to the relevant doc page (relative path, plus `#heading` when useful), so humans and agents can find the details: `# Retry policy: docs/developer/jobs.md#retries`.
- Comments cite TECH_SPEC decisions by D-number (`D7`), not note or review numbers a reader can't look up.
- A doc page lists the main source files it describes, so the link works both ways.

## Timeline

- **[history/timeline.md](../../history/timeline.md):** a documentary-style account of how the project evolves. Add an entry at meaningful milestones: a stage completed, a pivot, a key decision and why, a surprising finding, a dead end abandoned. Narrative prose, not a changelog; a few short paragraphs each.
