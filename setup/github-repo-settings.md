# GitHub settings for a repo agents push to

Agents in the dev VM push feature branches; you merge. These settings make GitHub enforce that, and keep a planted instruction from doing much with the VM's token. `/new-project` and `/import-project` write the ones that fit into the project's `next-steps/`.

Which ones are available:

| Setting | Public repo | Private, GitHub Free | Private, Pro / Team |
|---|---|---|---|
| Ruleset on the default branch | yes | **no** (the VM's push guard is the only check) | yes |
| Actions restrictions | yes | yes | yes |
| Dependabot alerts and updates | yes | yes | yes |
| Secret scanning and push protection | yes | no (paid add-on) | no (paid add-on) |
| Private vulnerability reporting | yes | n/a | n/a |

## Ruleset on the default branch

Repo > **Settings** > **Rules** > **Rulesets** > **New ruleset** > **New branch ruleset**:

1. **Name** `main`, **Enforcement status** Active.
2. **Bypass list:** empty, so it applies to you too (a stolen credential can't push to `main` either).
3. **Target branches:** Add target > **Include default branch**.
4. Tick:
   - **Restrict deletions** and **Block force pushes**.
   - **Require a pull request before merging**: required approvals **0** (you can't approve your own), and **Dismiss stale pull request approvals when new commits are pushed**.
   - **Require status checks to pass**, once the project has CI: add its checks.
   - **Require linear history** (optional): `main` stays easy to review commit by commit.
5. **Check:** from a throwaway branch, `git push origin HEAD:main` is refused.

You merge through pull requests from then on, from Windows too.

## Actions

Settings > **Actions** > **General**:
- No workflows yet: **Disable actions**. Turn them on when CI is added.
- With workflows:
  - **Allow** actions by GitHub and verified creators only (plus any you name).
  - **Workflow permissions:** Read repository contents; untick **Allow GitHub Actions to create and approve pull requests**.
  - Public repo: **Require approval for all external contributors** to run workflows from forks.
- Deploy secrets go in an **environment** with required reviewers (Settings > Environments; public repos, or Pro/Team for private), never in the VM (`threat-model.md`).

## Security

Settings > **Advanced Security** (or **Code security**):
- **Dependabot alerts** and **Dependabot security updates**: on. Version updates come from `.github/dependabot.yml`, which the project's `/upgrade-dependencies sweep` writes; `/upgrade-dependencies review <PR#>` checks each pull request Dependabot opens.
- Public repos: **Secret Protection** (secret scanning) with **Push protection**, and **Private vulnerability reporting**: on.

## General

Settings > **General**:
- **Automatically delete head branches**: on, so merged agent branches don't pile up.
- Turn off **Wikis**, **Issues** or **Projects** if you won't use them: less surface for planted text.
- **Collaborators:** only people you'd trust with the VM itself.
