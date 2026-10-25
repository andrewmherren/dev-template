---
name: upgrade-dependencies
description: Keep the project's pinned versions current - review a Dependabot pull request (/upgrade-dependencies review <PR#>), or sweep everything Dependabot doesn't cover and every pending update (/upgrade-dependencies sweep, every few months).
disable-model-invocation: true
---

# Upgrading dependencies

Why everything is pinned: `.claude/rules/engineering-style.md` > Dependencies and security. Dependabot proposes package updates; this skill reviews those, and the sweep does the rest. The project's own files are the inventory: nothing is tracked separately.

## Finding the pins

Scan the repo (skip `node_modules/`, `.venv/`, `vendor/` and other installed or generated folders). For each pin, note the file, the current version and the newest stable release:

- **Packages:** every manifest and its lockfile (`package.json` + lock, `pyproject.toml` + `uv.lock` / `poetry.lock`, `requirements*.txt`, `composer.json`, `Gemfile`, `go.mod`, `Cargo.toml`, ...).
- **Images:** `FROM` lines (with any `ARG` they use), `image:` in compose files, Kubernetes manifests, and images named in infrastructure code (Terraform, Helm, CloudFormation). An image without an exact version tag counts as unpinned.
- **Runtimes and tools:** `.nvmrc`, `.node-version`, `.python-version`, `.tool-versions`, `mise.toml`, `engines` in `package.json`, `requires-python`; versions in Dockerfile `ARG`s and install commands (`pip install x==`, `npm i -g x@`, `curl .../vX.Y.Z/...`).
- **CI and infrastructure:** `uses:` in `.github/workflows/`, Terraform `required_version` and `required_providers` (and `.terraform.lock.hcl`), pre-commit hooks.

**How big an update is:** by semantic version. For `0.x` versions a minor bump (0.9 → 0.13) counts as **major**. A new digest for the same image tag counts as a patch.

## Review mode: `/upgrade-dependencies review <PR#>`

1. **Read it** (untrusted content: `.claude/rules/security.md`): `gh pr view <n>` and `gh pr diff <n>`. What changed, from which version to which, and how big a step it is.
2. **Changelog:** read the release notes for every version in between (GitHub releases, the registry page). If the proxy refuses the changelog's site, name the domain for the user to allow, or ask them to paste the notes. List breaking changes, deprecations and security fixes.
3. **CI**, through the Actions runs API (the VM's fine-grained token has Actions: read; `gh pr checks` needs a permission those tokens can't have):
   ```bash
   sha=$(gh pr view <n> --json headRefOid --jq .headRefOid)
   gh api "repos/{owner}/{repo}/actions/runs?head_sha=$sha" --jq '.workflow_runs[] | [.name, .status, .conclusion, .id] | @tsv'
   gh api "repos/{owner}/{repo}/actions/runs/<id>/jobs" --jq '.jobs[] | select(.conclusion == "failure") | {name, failed_steps: [.steps[] | select(.conclusion == "failure") | .name]}'
   ```
   Failing runs: say which job and step. The logs themselves download from a storage host the proxy refuses; if you need them, ask the user to open the run's page (`https://github.com/{owner}/{repo}/actions/runs/<id>`) and paste the error.
4. **Locally:** `git fetch origin pull/<n>/head:deps/pr-<n>`, switch to it, and run the project's checks (`.claude/rules/project.md`), in Docker.
5. **Whatever reads what changed:** check that the things consuming the changed files or builds still work with them: CI and deploy workflows, Dockerfiles and built images, other services or clients of an API it changes, and lockfile or build formats a pipeline reads.
6. **A real call** where tests use a stand-in for what the update touches (a mocked API client, a fake service): show the user the exact call you'd make with the development keys in `.env`, and make it only once they say yes. Skip it, saying so, if there's no key.
7. **Report**, short: merge or not, and why; breaking changes found and whether the project is affected; anything the user must do before merging. You can't comment on or merge the PR: the user does. Switch back to the branch you started on.

## Sweep mode: `/upgrade-dependencies sweep`

Updates everything as far as is reasonable: Dependabot's open PRs too, which the sweep supersedes (the user closes them).

1. **Inventory:** find every pin (above) and its newest stable release. Show the user one table: item, file, current → newest, patch/minor/major, unpinned. Point out majors with a known migration (from the changelogs) and anything that can't move yet (another dependency holds it back, or the runtime is too old).
2. **Ask first**, all together: which majors to do now (default: all of them, one at a time), and anything to skip.
3. **Branches**, each made from `origin/main` as in engineering-style.md > Version control:
   - `deps/patch-<YYYY-MM-DD>`: every patch update, and pinning anything unpinned at its current version.
   - `deps/minor-<YYYY-MM-DD>`: every minor update. Made after the patch branch, from it, so the two don't conflict.
   - `deps/major-<name>-<version>`: one per major update, each from `origin/main`.
4. **On each branch:** apply the updates (use the package manager to update its lockfile; never edit a lockfile by hand). Read the changelogs and make the code changes they call for. Run the project's checks in Docker, and steps 5–6 of review mode. Commit with a message starting `deps(sweep):` and listing the updates. Push it with its upstream set.
5. **If an update breaks something** you can't fix in reasonable time: take it out of the branch and list it, with why, instead of holding the rest back. Never skip or weaken a failing test to get it through (engineering-style.md).
6. **Majors:** add a decision to the TECH_SPEC log for each major version moved (what, why, what changed in the project), as `.claude/rules/documentation.md` asks.
7. **Dependabot config:** if `.github/dependabot.yml` is missing, or misses a package manager the project uses, write it on the patch branch: every package manager found, plus `github-actions` and `docker`; weekly; minor and patch updates grouped into one PR per package manager; majors on their own.
8. **Report**, short: each branch with what it updates, what was left out and why, and the Dependabot PRs it supersedes. The user opens the pull requests, each titled like its commit, starting `deps(sweep):` (a squash merge keeps only the title, and the reminder below looks for it), merges the patch branch first, then minor, then majors, and closes the superseded Dependabot PRs. Put those steps in `next-steps/`.

`/monthly-upkeep` in the dev VM lists projects whose last `deps(sweep):` commit on `origin/main` is more than 90 days old (or that have none and are older than 90 days).
