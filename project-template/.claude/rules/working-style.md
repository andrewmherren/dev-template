# Working Style

How to work with the user. Project-agnostic, reused across projects.

**Who follows this:** any agent that talks with the user directly. Subagents and background agents that never talk to the user can skip it.

## Communication

- Chat replies are short and easy to scan, never one dense paragraph. Use this format, in this order:
  - **Done:** bullet points of the main things done, high level, with links to the files involved.
  - **To test:** (optional, when there's something the user can try) short bullet steps for seeing the latest changes: links, what to click, what to look for. Build on earlier rounds instead of repeating them; for example, once you've explained logging in, just link the page and say what's new.
  - **Next:** 1–3 sentences or bullets.
  - **Open questions:** (only when there are any) always the last section. Questions for the user and callouts that need a response: a risk, a conflict, a blocked step, a reminder.
- **Repeat until acknowledged.** If the user's reply doesn't answer a question or acknowledge a callout, carry it into the Open questions of every following message until they do. Drop it once answered, acknowledged or explicitly deferred (then move it to a `next-steps/` file if it still matters).
- The user asks for more detail when they need it.
- **Questions first.** Before starting a block of work (a feature, a list of tasks, a review's fixes), ask every question it needs, all together, each with a recommended default. Then do the work. Don't build the parts that are clear and come back later with questions about the rest.
- **Questions that need typed answers** (a name, an email, a path): ask them in plain text, not in a multiple-choice box. If a box is used anyway, don't name its free-text option ("Other" in one app is "Type something" in another): say "type your answer in the free-text option".
- **Direct questions** (e.g. "how does X work?") skip Done/To test/Next. Answer with whatever mix of short sentences and bullets fits the question, leading with the key point. Stay concise. Open questions still go last.
- Don't repeat instructions in chat. Put them in a `next-steps/` file and link to it.
- Be concise in files too: bullets or numbered steps, not essays.

## `next-steps/` (manual tasks for the user)

- Manual tasks go in `next-steps/` at the project root. It's git-ignored.
- **One concise .md file per task**, written as numbered steps or bullets.
- Prefix file names with numbers (`01-…`) when order matters. Put tasks for a later phase in a subfolder (e.g. `next-steps/stage-2/`); those aren't due until that phase starts.
- In chat, just say "created a step for X" and give a direct link.
- The user deletes each file when the task is done. **Before starting new work, check `next-steps/`.** If a file that's due still exists and the new work depends on it, or the user is moving to a new phase, remind them that step isn't finished before continuing.
- The user writes answers and questions into these files, in brackets after the step. When checking the folder, read them: answer their questions in the file, and update the steps their answers change.
- **If the main branch can't be deployed right now** (half a feature committed, a migration waiting on a manual step), create `next-steps/00-do-not-deploy.md` straight away. Say why, and what has to happen first. Delete it yourself once the branch is deployable again. A warning only in chat is easy to miss.

## `ideas/` (the user's backlog)

- `ideas/` at the project root holds the user's ideas and to-dos for later, one .md file each. It's git-ignored.
- **Not due.** Don't act on an idea until the user asks for it. When they do, treat it as a new block of work: questions first.
- When planning work that overlaps an idea, mention the idea file and ask whether to fold it in.
- When the user says to park something for later, or you spot worthwhile out-of-scope work, offer to add an idea file; write it only once they agree.
- The user deletes idea files. Once one is built, say so in Done so they know it can go.

## Finishing what was asked

- An interruption isn't the end of the request. If the user stops you to ask for something else (say, "commit this"), do it, then carry on with the original work, unless they say to stop.
- If you do stop partway, say what's left in Next and in a `next-steps/` file, so it's still visible once the chat has moved on. What the user has already agreed to is still part of the job: don't ask again whether to build it. If they give you something new before it's done, say up front that it's still open and whether the new work depends on it.

## Project view

- Maintain `next-steps/project-view.md`: a high-level list of the whole project's steps in order, one line each.
- Put the tag at the **start** of the line: `(complete)` on finished steps, `(in progress)` on the current step. Leave future steps untagged.
- Update it whenever a step starts or finishes, or when the plan changes. Never delete this file; it's the only one the user doesn't remove.
