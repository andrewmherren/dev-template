#!/usr/bin/env node
// PreToolUse guardrail: agents may push feature branches, never the default branch.
// Blocks a `git push` whose target is the remote's default branch (origin/HEAD, plus main
// and master always), pushes of every branch (--all, --mirror), and pushes it can't check:
// git run through bash -c, eval or xargs, or a git alias that expands to push.
//
// Runs from the project's .claude/settings.json. The agent dev VM also runs a copy of this
// file for every repo, with --user-level: that copy steps aside where the project has its own.
// With --no-push it blocks every push (dev-template itself: the user pushes it).
//
// Defense in depth, not the boundary (dev-template/setup/threat-model.md): a ruleset on the
// default branch is what GitHub itself enforces.

const { execFileSync } = require('child_process');
const path = require('path');

let data = '';
process.stdin.on('data', (d) => { data += d; });
process.stdin.on('end', () => {
    let input;
    try {
        input = JSON.parse(data);
    } catch (e) {
        deny('could not read the tool call, so the push guard could not check it.');
    }
    if (input.tool_name !== 'Bash' && input.tool_name !== 'PowerShell') process.exit(0);
    if (process.argv.includes('--user-level') && projectHasOwnGuard()) process.exit(0);
    const cmd = (input.tool_input || {}).command || '';
    // Not only commands that say "push": a git alias can push under another name.
    if (!/\bgit\b/.test(cmd)) process.exit(0);

    let cwd = input.cwd || process.cwd();
    for (const words of splitCommands(cmd)) {
        if (words[0] === 'cd' && words[1]) {
            cwd = path.resolve(cwd, words[1].replace(/^~(?=\/|$)/, process.env.HOME || '~'));
            continue;
        }
        const problem = checkCommand(words, cwd);
        if (problem) deny(problem);
    }
    process.exit(0);
});

function projectHasOwnGuard() {
    const dir = process.env.CLAUDE_PROJECT_DIR;
    return Boolean(dir) && require('fs').existsSync(path.join(dir, '.claude', 'hooks', 'guard-git-push.js'));
}

const NO_PUSH = process.argv.includes('--no-push');

function deny(reason) {
    const rule = NO_PUSH
        ? 'Agents don\'t push this repo: commit locally and tell the user, who pushes.'
        : 'Push feature branches only; the user merges into the default branch.';
    console.log(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: `Blocked by the push guard: ${reason} ${rule}`,
        },
    }));
    process.exit(0);
}

// Splits a shell command into simple commands (lists of words), honoring quotes.
// Separators: ; & | && || and newlines. Good enough for a guardrail, not a shell parser.
function splitCommands(cmd) {
    const commands = [];
    let words = [];
    let word = null;
    const endWord = () => { if (word !== null) { words.push(word); word = null; } };
    const endCommand = () => { endWord(); if (words.length) commands.push(words); words = []; };
    for (let i = 0; i < cmd.length; i++) {
        const c = cmd[i];
        if (c === "'") {
            const j = cmd.indexOf("'", i + 1);
            const end = j < 0 ? cmd.length : j;
            word = (word || '') + cmd.slice(i + 1, end);
            i = end;
        } else if (c === '"') {
            let s = '';
            for (i++; i < cmd.length && cmd[i] !== '"'; i++) {
                if (cmd[i] === '\\' && i + 1 < cmd.length) i++;
                s += cmd[i];
            }
            word = (word || '') + s;
        } else if (c === '\\' && i + 1 < cmd.length) {
            if (cmd[i + 1] !== '\n') word = (word || '') + cmd[i + 1];
            i++;
        } else if (/[;&|\n()]/.test(c)) {
            endCommand();
        } else if (/\s/.test(c)) {
            endWord();
        } else {
            word = (word || '') + c;
        }
    }
    endCommand();
    return commands;
}

const WRAPPERS = new Set(['env', 'command', 'builtin', 'exec', 'nohup', 'time', 'sudo', 'nice']);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'eval', 'xargs', 'watch', 'ssh']);

function checkCommand(words, cwd) {
    let i = 0;
    // Skip VAR=value assignments and wrappers (and their options) in front of the command.
    while (i < words.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]) || WRAPPERS.has(words[i]) || (i > 0 && words[i].startsWith('-')))) i++;
    const verb = path.basename(words[i] || '');
    const rest = words.slice(i + 1);
    if (SHELLS.has(verb)) {
        const text = rest.join(' ');
        if (/\bgit\b/.test(text) && /\bpush\b/.test(text)) {
            return `\`${verb}\` runs a git push the guard can't check. Run git push directly.`;
        }
        return null;
    }
    if (verb !== 'git') return null;

    // Global options before the subcommand.
    let j = 0;
    while (j < rest.length && rest[j].startsWith('-')) {
        const opt = rest[j];
        if (opt === '-C' && j + 1 < rest.length) { cwd = path.resolve(cwd, rest[j + 1]); j += 2; continue; }
        if (['-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env'].includes(opt)) { j += 2; continue; }
        if (opt.startsWith('--git-dir=') || opt.startsWith('--work-tree=')) return 'git push with --git-dir/--work-tree can\'t be checked.';
        j++;
    }
    const sub = rest[j];
    const args = rest.slice(j + 1);
    if (sub === undefined) return null;
    if (sub !== 'push') {
        const alias = git(cwd, ['config', '--get', `alias.${sub}`]);
        if (alias && /\bpush\b/.test(alias)) return `the git alias \`${sub}\` runs push, which the guard can't check. Run git push directly.`;
        return null;
    }
    return checkPush(args, cwd);
}

function git(cwd, args) {
    try {
        return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch (e) {
        return '';
    }
}

const PUSH_OPTS_WITH_VALUE = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);

function checkPush(args, cwd) {
    if (NO_PUSH) return 'this is a git push.';
    const positional = [];
    for (let k = 0; k < args.length; k++) {
        const a = args[k];
        if (a === '--') { positional.push(...args.slice(k + 1)); break; }
        if (['--all', '--mirror', '--branches'].includes(a)) return `\`git push ${a}\` would push the default branch too.`;
        if (a.startsWith('--repo=')) return '`git push --repo` can\'t be checked.';
        if (PUSH_OPTS_WITH_VALUE.has(a)) { k++; continue; }
        if (a.startsWith('-')) continue;
        positional.push(a);
    }
    const remote = positional[0] || git(cwd, ['config', '--get', `branch.${currentBranch(cwd)}.pushRemote`]) || git(cwd, ['config', '--get', 'remote.pushDefault']) || 'origin';
    const protectedBranches = defaultBranches(cwd, remote);
    const targets = positional.length > 1 ? positional.slice(1).map((r) => refspecTarget(r, cwd)) : [implicitTarget(cwd)];
    for (const t of targets) {
        if (t === null) return 'couldn\'t tell which branch this push updates.';
        if (protectedBranches.has(t)) return `it pushes to \`${t}\`, the default branch of \`${remote}\`.`;
    }
    return null;
}

function currentBranch(cwd) {
    return git(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
}

function defaultBranches(cwd, remote) {
    const set = new Set(['main', 'master']);
    const head = git(cwd, ['symbolic-ref', '--quiet', '--short', `refs/remotes/${remote}/HEAD`]);
    if (head) set.add(head.slice(remote.length + 1));
    return set;
}

// The branch a refspec updates on the remote. Tags and other refs aren't branches: ''.
function refspecTarget(spec, cwd) {
    let s = spec.replace(/^\+/, '');
    const colon = s.indexOf(':');
    let dst = colon >= 0 ? s.slice(colon + 1) : s;
    if (colon < 0 && (dst === 'HEAD' || dst === '@')) return implicitTarget(cwd);
    if (dst === '' || dst === 'HEAD' || dst === '@') return null;
    if (dst.startsWith('refs/heads/')) return dst.slice('refs/heads/'.length);
    if (dst.startsWith('refs/')) return '';
    if (dst.includes('*')) return null;
    // A short name with no colon may be a tag: then it's not a branch push.
    const isRef = (ref) => git(cwd, ['rev-parse', '--verify', '--quiet', ref]) !== '';
    if (colon < 0 && !isRef(`refs/heads/${dst}`) && isRef(`refs/tags/${dst}`)) return '';
    return dst;
}

// What a bare `git push [remote]` updates: the current branch's upstream, or its own name.
function implicitTarget(cwd) {
    const branch = currentBranch(cwd);
    if (!branch) return null;
    const merge = git(cwd, ['config', '--get', `branch.${branch}.merge`]);
    return merge.startsWith('refs/heads/') ? merge.slice('refs/heads/'.length) : branch;
}
