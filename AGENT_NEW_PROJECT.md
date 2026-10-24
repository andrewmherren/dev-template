# Agent guide: start a new project

For a Claude agent in the dev VM. Creates `~/projects/<name>` from `~/dev-template/project-template/`.

## Steps

1. **Ask first**, all together, each with its default:
   - **Name:** lower-case with dashes; used for the folder and the GitHub repo. No default.
   - **Description:** one or two sentences: what it is and who it's for. No default.
   - **Stack:** default *decide later*. If they name one, record it; scaffolding is a separate piece of work, planned with them after this guide.
2. **Copy the template:** `cp -a ~/dev-template/project-template/. ~/projects/<name>/` (the `.` keeps the dotfiles). Stop if the folder already exists.
3. **Fill in the placeholders** in every copied file (`grep -rn '{{' .` must find nothing afterwards):

   | Placeholder | Value |
   |---|---|
   | `{{PROJECT_NAME}}` | the name |
   | `{{DESCRIPTION}}` | the description |
   | `{{DATE}}` | today, `YYYY-MM-DD` |
   | `{{STACK}}` | the stack, or "Not chosen yet." |
   | `{{CORE_LOGIC_PATH}}` | "not set yet" (filled in once there's code) |
   | `{{CHECKS}}` | "none yet" (filled in once there's code) |

4. **next-steps/** (git-ignored, for the user):
   - `next-steps/project-view.md`, following `.claude/rules/working-style.md` > Project view: `1. (complete) Create the project from dev-template`, then `2. Choose the stack and plan the first slice`.
   - `next-steps/01-github-repo.md`:
     1. On GitHub, create an **empty private** repo named `<name>` (no README, licence or .gitignore).
     2. Add it to the `agent-dev VM` token: GitHub > Settings > Developer settings > Fine-grained tokens > the token > Repository access.
     3. In the VM: `cd ~/projects/<name> && git remote add origin https://github.com/<account>/<name>.git && git push -u origin main`.
5. **Git:** `git init -b main`, `git add -A`, and one commit: "Start <name> from dev-template".
6. **Report**, short: the folder, the `next-steps/` file to do, and the suggested next piece of work (choosing the stack, with questions first).
