const { execFileSync } = require('child_process');
const path = require('path');
const script = path.join(__dirname, 'block-secrets.js');

function run(payloadObj) {
    const out = execFileSync('node', [script], {
        input: JSON.stringify(payloadObj),
        encoding: 'utf8',
    });
    return out.trim();
}

const cases = [
    ['DENY: Read Windows-style ~/.ssh key', { tool_name: 'Read', tool_input: { file_path: 'C:\\Users\\user\\.ssh\\philco-pi-agent\\claude_agent_key' } }, true],
    ['ALLOW: Read normal project file', { tool_name: 'Read', tool_input: { file_path: 'd:\\sandbox\\philco\\README.md' } }, false],
    ['ALLOW: ssh -i using key for auth', { tool_name: 'Bash', tool_input: { command: 'ssh -i ~/.ssh/philco-pi-agent/claude_agent_key claude-agent@192.168.1.50' } }, false],
    ['DENY: cat a private key', { tool_name: 'Bash', tool_input: { command: 'cat ~/.ssh/id_rsa' } }, true],
    ['DENY: Grep inside .aws', { tool_name: 'Grep', tool_input: { pattern: 'aws_secret', path: '~/.aws/credentials' } }, true],
    ['ALLOW: .env.example template', { tool_name: 'Bash', tool_input: { command: 'cat .env.example' } }, false],
    ['DENY: PowerShell Get-Content on .env', { tool_name: 'PowerShell', tool_input: { command: 'Get-Content .env' } }, true],
    ['ALLOW: unrelated PowerShell command', { tool_name: 'PowerShell', tool_input: { command: 'Get-ChildItem C:\\Users\\user\\project' } }, false],
    ['DENY: Read Docker config', { tool_name: 'Read', tool_input: { file_path: '~/.docker/config.json' } }, true],
    ['DENY: Read gcloud creds', { tool_name: 'Read', tool_input: { file_path: '~/.config/gcloud/credentials.db' } }, true],
    ['DENY: Read TLS .key file', { tool_name: 'Read', tool_input: { file_path: '/etc/ssl/private/server.key' } }, true],
    ['DENY: cat bash_history', { tool_name: 'Bash', tool_input: { command: 'cat ~/.bash_history' } }, true],
    ['ALLOW: ssh -i keyfile with remote command containing a read-verb-like word', { tool_name: 'Bash', tool_input: { command: 'ssh -i ~/.ssh/philco-pi-agent/claude_agent_key claude-agent@192.168.68.53 "sudo find /var/log -type f -size +5M"' } }, false],
    ['DENY: ssh -i keyfile but ALSO cats a real secret remotely', { tool_name: 'Bash', tool_input: { command: 'ssh host "cat ~/.aws/credentials"' } }, true],
];

let failures = 0;
for (const [label, payload, expectDeny] of cases) {
    const out = run(payload);
    const denied = out.length > 0;
    const ok = denied === expectDeny;
    if (!ok) failures++;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label} -> ${denied ? 'DENY' : 'ALLOW'}${out ? ' :: ' + out : ''}`);
}
process.exit(failures ? 1 : 0);
