// Tests guard-git-push.js against a throwaway repo whose remote's default branch is `trunk`.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const script = path.join(__dirname, 'guard-git-push.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-git-push-'));
const remote = path.join(tmp, 'remote.git');
const repo = path.join(tmp, 'repo');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] });
git(tmp, 'init', '-q', '--bare', '-b', 'trunk', remote);
git(tmp, 'clone', '-q', remote, repo);
git(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgSign=false', 'commit', '-q', '--allow-empty', '-m', 'first');
git(repo, 'push', '-q', 'origin', 'trunk');
git(repo, 'remote', 'set-head', 'origin', 'trunk');
git(repo, '-c', 'tag.gpgSign=false', 'tag', 'v1');
git(repo, 'config', 'alias.ship', 'push origin HEAD');
git(repo, 'switch', '-q', '-c', 'feature/x');
git(repo, 'config', 'branch.feature/x.remote', 'origin');
git(repo, 'config', 'branch.feature/x.merge', 'refs/heads/feature/x');
git(repo, 'branch', '-q', 'feature/y');
git(repo, 'config', 'branch.feature/y.merge', 'refs/heads/trunk');

// A project folder that has its own copy of the guard, for the --user-level cases.
const guardedProject = path.join(tmp, 'guarded');
fs.mkdirSync(path.join(guardedProject, '.claude', 'hooks'), { recursive: true });
fs.copyFileSync(script, path.join(guardedProject, '.claude', 'hooks', 'guard-git-push.js'));

function run(command, { args = [], projectDir = '' } = {}) {
    return execFileSync('node', [script, ...args], {
        input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd: repo }),
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    }).trim();
}

const cases = [
    ['ALLOW: push the current feature branch', 'git push', false],
    ['ALLOW: push -u a feature branch', 'git push -u origin feature/x', false],
    ['ALLOW: push HEAD on a feature branch', 'git push origin HEAD', false],
    ['ALLOW: push a tag', 'git push origin v1', false],
    ['ALLOW: force-push a feature branch', 'git push --force-with-lease origin feature/x', false],
    ['ALLOW: commit message that mentions push to main', 'git commit -m "push to main later; git push origin main"', false],
    ['ALLOW: unrelated command', 'echo git push origin main', false],
    ['DENY: push the default branch by name', 'git push origin trunk', true],
    ['DENY: push main (always protected)', 'git push origin main', true],
    ['DENY: push HEAD:trunk', 'git push origin HEAD:trunk', true],
    ['DENY: force push to refs/heads/trunk', 'git push -f origin +feature/x:refs/heads/trunk', true],
    ['DENY: --all', 'git push --all origin', true],
    ['DENY: --mirror', 'git push --mirror origin', true],
    ['DENY: git -C path push', `git -C ${JSON.stringify(repo)} push origin trunk`, true],
    ['DENY: chained after a commit', 'git commit -m wip && git push origin trunk', true],
    ['DENY: wrapped in bash -c', 'bash -c "git push origin feature/x"', true],
    ['DENY: alias that pushes', 'git ship', true],
    ['DENY: env prefix', 'GIT_TRACE=1 git push origin trunk', true],
    ['DENY: delete the default branch', 'git push origin :trunk', true],
    // The hook reads the repo's state, so this one runs with feature/y checked out.
    ['DENY: bare push on a branch whose upstream is trunk', 'git push', true, 'feature/y'],
    // The VM's user-level copy steps aside only where the project has its own.
    ['DENY: user-level copy, project without its own guard', 'git push origin trunk', true, 'feature/x', { args: ['--user-level'], projectDir: repo }],
    ['ALLOW: user-level copy, project has its own guard', 'git push origin trunk', false, 'feature/x', { args: ['--user-level'], projectDir: guardedProject }],
    ['DENY: project copy ignores --user-level skipping', 'git push origin trunk', true, 'feature/x', { projectDir: guardedProject }],
];

let failures = 0;
for (const [label, command, expectDeny, branch = 'feature/x', options] of cases) {
    git(repo, 'switch', '-q', branch);
    const out = run(command, options);
    const denied = out.length > 0;
    const ok = denied === expectDeny;
    if (!ok) failures++;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label} -> ${denied ? 'DENY' : 'ALLOW'}${out ? ' :: ' + JSON.parse(out).hookSpecificOutput.permissionDecisionReason : ''}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
