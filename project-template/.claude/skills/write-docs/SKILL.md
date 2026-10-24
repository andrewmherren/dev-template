---
name: write-docs
description: How to write or update pages in docs/ (developer, product, customer, compliance) - what each audience needs, page format, Mermaid diagrams, and links between docs and code. Use whenever creating or editing documentation.
---

# Writing docs

When to update which docs: `.claude/rules/documentation.md`. This covers how.

## What each folder holds

- **`docs/developer/`:** how the system works, for onboarding new developers quickly and for agents. Architecture, components, data flow, key interfaces, how to run and debug. Use Mermaid diagrams where a picture is clearer than prose: architecture (`flowchart`), request flows (`sequenceDiagram`), data models (`erDiagram`), lifecycles (`stateDiagram-v2`).
- **`docs/product/`:** for the product and support teams: what each feature does and why, configuration and flags, known limits, how to troubleshoot common issues.
- **`docs/customer/`:** for customers: how to use the application and its features, in plain language, no internals.
- **`docs/compliance/`:** for audits: security controls, privacy, what data is collected and why, where it's stored, who can access it, retention, and third-party processors. Link to the code or config that enforces each point.

## Pages

- One topic per page, named in kebab-case (`docs/developer/background-jobs.md`). Add a line for it to that folder's `README.md` index.
- Concise: headings, bullets and short steps.
- Describe how things are now. History goes in `history/timeline.md`, reasons in the TECH_SPEC decision log (link the D-number).
- No secrets or real personal data in examples.
- Developer and compliance pages end with **Source:** the main files or folders they describe.

## Links between docs and code

- Code comments link to the doc page (relative path, plus `#heading` when useful): `# Retry policy: docs/developer/jobs.md#retries`.
- Comments cite TECH_SPEC decisions by D-number (`D7`), not note or review numbers a reader can't look up.
- When you move or rename a page or heading, grep for links to it and fix them.
