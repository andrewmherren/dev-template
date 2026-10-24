---
name: sync-template
description: Bring the current project's agent rules, skills, guardrails and docs skeleton up to date with ~/dev-template/project-template, keeping the project's own changes.
disable-model-invocation: true
---

# Sync a project with the template

Run in the project's folder. The user pulls `~/dev-template` first (`git -C ~/dev-template pull`); you don't.

## Steps

1. **Versions:** the project's `.claude/template-version` (the dev-template commit it last synced with; missing in older projects) and `git -C ~/dev-template rev-parse HEAD`. If they're equal, say it's up to date and stop.
2. **Branch:** `chore/sync-template`, made as in `.claude/rules/engineering-style.md` > Version control.
3. **Compare**, file by file, under `~/dev-template/project-template/`:
   - **Template-owned** (update): `.claude/rules/*.md` except `project.md`, `.claude/skills/`, `.claude/hooks/`.
   - **Merged** (add what's new, keep the project's entries): `.claude/settings.json` (permissions and hooks), `.gitignore`, `env.example`.
   - **Project-owned** (never overwrite): `.claude/rules/project.md`, `CLAUDE.md`, `README.md`, `TECH_SPEC.md`, `history/`, `docs/` pages. For these, only point out new sections or index files the template added (e.g. a new `docs/<audience>/README.md`) and offer to add them.
4. **Template changes vs project edits:** with a version, `git -C ~/dev-template diff <version> HEAD -- project-template/<path>` is what the template changed; `git diff` against the project's file shows what the project changed. Apply the template's changes and keep the project's edits. Without a version, show both versions of each differing file and ask which way to go.
5. **Show before changing:** a short list, file by file: new, updated, merged, conflicts (both sides changed the same lines). Ask about conflicts and anything removed from the template. Apply once the user agrees.
6. **Finish:** write the new commit hash into `.claude/template-version`. Commit in small commits (rules; skills and hooks; settings and ignores) with "Sync with dev-template <short hash>" in each message. Push the branch (`git push -u origin chore/sync-template`) and report it and what changed; the user opens the pull request.
