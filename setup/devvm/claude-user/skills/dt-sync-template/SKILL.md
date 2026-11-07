---
name: dt-sync-template
description: Bring the current project's agent rules, skills, guardrails and docs skeleton up to date with ~/dev-template/project-template, keeping the project's own changes.
disable-model-invocation: true
---

# Sync a project with the template

Run in the project's folder.

## Update the template first

`~/dev-template` is the copy everything syncs from. Bring it up to `origin/main`, which only the user can merge into, so nothing unreviewed comes in:
1. `git -C ~/dev-template fetch origin`. If it fails, say so and carry on with the local copy.
2. If it's on `main` with no local changes (`git -C ~/dev-template status --porcelain` is empty): `git -C ~/dev-template merge --ff-only origin/main`, and list the commits it brought in (`git -C ~/dev-template log --oneline <old HEAD>..HEAD`).
3. Otherwise (local edits, another branch, or the fast-forward fails): leave it as it is, say why, and carry on, noting that the sync may miss newer template changes.
4. Nothing else there: no `git pull`, reset, stash or checkout. If the new commits changed `setup/devvm/claude-user/` (user-level skills, hooks, `CLAUDE.md`), tell the user to run `/dt-monthly-upkeep` to install them; this run still uses the skill as loaded.

## Steps

1. **Versions:** the project's `.claude/template-version` (the dev-template commit it last synced with; missing in older projects) and `git -C ~/dev-template rev-parse HEAD`. If they're equal, say it's up to date and stop.
2. **Branch:** `chore/sync-template`, made as in `.claude/rules/engineering-style.md` > Version control.
3. **Compare**, file by file, under `~/dev-template/project-template/`:
   - **Template-owned** (update): files in `.claude/rules/` (except `project.md`), `.claude/skills/dt-*/` and `.claude/hooks/` that are in `project-template/` now, or were at the project's version. A file that was there and has since gone is a removal: ask before deleting it. The `dt-` prefix is reserved for template skills.
   - **The project's own** (leave alone, don't list as differences): anything else in those folders, e.g. a rule file or skill the project added (`.claude/rules/game-dev.md`, `.claude/skills/game-*/`).
   - **Retired** (delete without asking, if present): `.claude/skills/` `upgrade-dependencies`, `remote-device`, `write-docs`, `debug-recorder`, now `dt-` prefixed. Only those four names: other folders in `.claude/skills/` are the project's own. Also point out `next-steps/` files that mention the old names or paths (`.claude/skills/remote-device/...`).
   - **Merged** (add what's new, keep the project's entries): `.claude/settings.json` (permissions and hooks), `.gitignore`, `env.example`.
   - **Project-owned** (never overwrite): `.claude/rules/project.md`, `CLAUDE.md`, `README.md`, `TECH_SPEC.md`, `history/`, `docs/` pages. For these, only point out new sections or index files the template added (e.g. a new `docs/<audience>/README.md`) and offer to add them.
4. **Template changes vs project edits:** with a version, `git -C ~/dev-template diff <version> HEAD -- project-template/<path>` is what the template changed; `git diff` against the project's file shows what the project changed. Apply the template's changes and keep the project's edits. Without a version, show both versions of each differing file and ask which way to go.
5. **Show before changing:** a short list, file by file: new, updated, merged, conflicts (both sides changed the same lines). Ask about conflicts and anything removed from the template. Apply once the user agrees.
6. **Finish:** write the new commit hash into `.claude/template-version`. Commit in small commits (rules; skills and hooks; settings and ignores) with "Sync with dev-template <short hash>" in each message. Push the branch (`git push -u origin chore/sync-template`) and report it and what changed; the user opens the pull request.
