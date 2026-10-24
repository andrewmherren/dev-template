// Tests guard-remote-device.js with a throwaway devices config (one device, radio-pi).
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const script = path.join(__dirname, 'guard-remote-device.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-remote-device-'));
const config = path.join(tmp, 'ssh_config');
fs.writeFileSync(config, [
    'Host radio-pi',
    '    HostName 192.168.1.50',
    '    ProxyCommand nc -X connect -x 10.10.0.1:3129 %h %p',
    '',
].join('\n'));
const F = '-F ~/.config/agent-devices/ssh_config';

function run(command, mode = 'default', args = []) {
    const out = execFileSync('node', [script, ...args], {
        input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, permission_mode: mode }),
        encoding: 'utf8',
        env: { ...process.env, AGENT_DEVICES_CONFIG: config },
    }).trim();
    return out ? JSON.parse(out).hookSpecificOutput : { permissionDecision: 'allow' };
}

const cases = [
    // [label, command, expected decision, permission mode, extra args]
    ['allow: a plain command on the device', `ssh ${F} radio-pi 'hostname; uptime'`, 'allow'],
    ['allow: reading logs', `ssh ${F} radio-pi 'journalctl -u radio --since -1h'`, 'allow'],
    ['allow: copying from the device', `scp ${F} radio-pi:/var/log/syslog ./syslog`, 'allow'],
    ['allow: ssh to an unrelated host', 'ssh git@github.com', 'allow'],
    ['allow: unrelated command', 'ls -la && git status', 'allow'],
    ['ask: curl on the device', `ssh ${F} radio-pi 'curl -s https://example.com'`, 'ask'],
    ['ask: apt install on the device', `ssh ${F} radio-pi 'sudo apt-get install -y mpv'`, 'ask'],
    ['ask: git clone on the device', `ssh ${F} radio-pi git clone https://github.com/x/y`, 'ask'],
    ['ask: python socket on the device', `ssh ${F} radio-pi "python3 -c 'import socket'"`, 'ask'],
    ['ask: /dev/tcp on the device', `ssh ${F} radio-pi 'cat < /dev/tcp/1.2.3.4/80'`, 'ask'],
    ['ask: piping local data to the device', `tar c src | ssh ${F} radio-pi 'tar x -C /opt/app'`, 'ask'],
    ['ask: redirecting a local file to the device', `ssh ${F} radio-pi 'cat > /tmp/x' < .env.example`, 'ask'],
    ['ask: scp upload', `scp ${F} dist/app.tar.gz radio-pi:/opt/`, 'ask'],
    ['ask: rsync upload', `rsync -a -e "ssh ${F}" dist/ radio-pi:/opt/app/`, 'ask'],
    ['ask: by address instead of name', 'ssh claude-agent@192.168.1.50 curl x.com', 'ask'],
    ['deny: dynamic forwarding (SOCKS)', `ssh ${F} -D 1080 radio-pi`, 'deny'],
    ['deny: local forwarding', `ssh ${F} -L 8080:example.com:80 radio-pi`, 'deny'],
    ['deny: ProxyJump through the device', `ssh -J radio-pi user@example.com`, 'deny'],
    ['deny: -o ProxyCommand with a device', `ssh -o ProxyCommand=foo radio-pi`, 'deny'],
    ['deny: raw tunnel through the device port', 'nc -X connect -x 10.10.0.1:3129 192.168.1.50 22', 'deny'],
    ['deny: device command inside bash -c', `bash -c "ssh ${F} radio-pi uptime"`, 'deny'],
    ['deny: turning the firewall off', `ssh ${F} radio-pi 'sudo nft flush ruleset'`, 'deny'],
    ['deny: changing agent access', `ssh ${F} radio-pi 'sudo agent-access on forever'`, 'deny'],
    ['deny: editing authorized_keys', `ssh ${F} radio-pi 'echo k >> ~/.ssh/authorized_keys'`, 'deny'],
    ['deny: rsync with a forwarding ssh', `rsync -e "ssh -D 1080" a radio-pi:b`, 'deny'],
    ['deny (bypass mode): curl on the device', `ssh ${F} radio-pi 'curl x.com'`, 'deny', 'bypassPermissions'],
    ['ask (bypass mode, --ask-in-bypass): curl on the device', `ssh ${F} radio-pi 'curl x.com'`, 'ask', 'bypassPermissions', ['--ask-in-bypass']],
    ['allow (bypass mode): a plain command', `ssh ${F} radio-pi uptime`, 'allow', 'bypassPermissions'],
];

let failures = 0;
for (const [label, command, expected, mode, args] of cases) {
    const out = run(command, mode, args);
    const ok = out.permissionDecision === expected;
    if (!ok) failures++;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label} -> ${out.permissionDecision}${out.permissionDecisionReason ? ' :: ' + out.permissionDecisionReason : ''}`);
}
// No devices set up: the guard stays out of the way.
fs.rmSync(config);
const none = run(`ssh ${F} radio-pi 'curl x.com'`);
const noneOk = none.permissionDecision === 'allow';
if (!noneOk) failures++;
console.log(`[${noneOk ? 'PASS' : 'FAIL'}] allow: no devices set up -> ${none.permissionDecision}`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
