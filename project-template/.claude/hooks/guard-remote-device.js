#!/usr/bin/env node
// PreToolUse guardrail for devices set up with the remote-device skill. While its access is on, a
// device is a way around the gateway: whatever reaches it can go on to the internet from there. So:
// - denied: forwarding and jump options, a raw tunnel through the gateway's device port, tunnels
//   hidden in bash -c and the like, and changing the device's access, firewall or SSH setup;
// - asked: remote commands that reach the network or install things (curl, git clone, apt install,
//   ...), and sending data to the device (piped or redirected input, scp/rsync uploads).
// "Ask" shows the user the command; it also prompts in auto mode (the dev VM's default). In
// bypassPermissions mode those are denied instead, unless --ask-in-bypass is passed (once the user
// has checked that Claude Code still asks there).
//
// Devices are the Host entries in ~/.config/agent-devices/ssh_config. Defense in depth, not the
// boundary: dev-template/setup/threat-model.md.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { splitCommands, commandStart, SHELLS } = require('./shell-words');

const CONFIG = process.env.AGENT_DEVICES_CONFIG || path.join(os.homedir(), '.config', 'agent-devices', 'ssh_config');

let data = '';
process.stdin.on('data', (d) => { data += d; });
process.stdin.on('end', () => {
    let input;
    try {
        input = JSON.parse(data);
    } catch (e) {
        decide('deny', 'could not read the tool call, so the device guard could not check it.');
    }
    if (input.tool_name !== 'Bash' && input.tool_name !== 'PowerShell') process.exit(0);
    // The dev VM runs a copy for every repo with --user-level; it steps aside where the project has its own.
    const projectDir = process.env.CLAUDE_PROJECT_DIR;
    if (process.argv.includes('--user-level') && projectDir
        && fs.existsSync(path.join(projectDir, '.claude', 'hooks', 'guard-remote-device.js'))) process.exit(0);
    const cmd = (input.tool_input || {}).command || '';
    const devices = readDevices();
    const mentionsDevice = (text) => devices.names.some((n) => new RegExp(`(^|[\\s@'"])${escape(n)}([\\s:'"]|$)`).test(text))
        || devices.addresses.some((a) => text.includes(a)) || text.includes('agent-devices/ssh_config');

    // A raw tunnel through the gateway's device port skips everything below.
    if (/10\.10\.0\.1\D{1,3}3129\b/.test(cmd)) {
        decide('deny', 'it opens a tunnel through the gateway\'s device port directly. Use `ssh -F ~/.config/agent-devices/ssh_config <device> \'<command>\'`.');
    }
    if (!devices.names.length || !/\b(ssh|scp|rsync|sftp)\b|agent-devices/.test(cmd)) process.exit(0);

    let ask = null;
    for (const words of splitCommands(cmd)) {
        const { verb, rest } = commandStart(words);
        let result = null;
        if (verb === 'ssh') result = checkSsh(rest, words, devices);
        else if (verb === 'scp' || verb === 'sftp') result = checkCopy(verb, rest, devices);
        else if (verb === 'rsync') result = checkCopy(verb, rest, devices);
        else if (SHELLS.has(verb) && mentionsDevice(rest.join(' '))) {
            result = ['deny', `\`${verb}\` runs a device command the guard can't check. Run ssh directly.`];
        }
        if (result && result[0] === 'deny') decide('deny', result[1]);
        if (result && !ask) ask = result[1];
    }
    if (ask) {
        if (input.permission_mode === 'bypassPermissions' && !process.argv.includes('--ask-in-bypass')) {
            decide('deny', `${ask} In bypass mode the guard can't ask the user, so it refuses: tell the user what you want to run on the device and why; they can run it themselves.`);
        }
        decide('ask', ask);
    }
    process.exit(0);
});

function decide(decision, reason) {
    const why = 'The device can reach the internet, so it could carry data past the gateway (remote-device skill).';
    console.log(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: decision,
            permissionDecisionReason: `Device guard: ${reason} ${why}`,
        },
    }));
    process.exit(0);
}

function escape(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readDevices() {
    const names = [];
    const addresses = [];
    let text = '';
    try { text = fs.readFileSync(CONFIG, 'utf8'); } catch (e) { return { names, addresses }; }
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*(Host|HostName)\s+(.+?)\s*$/i);
        if (!m) continue;
        const values = m[2].split(/\s+/).filter((v) => !/[*?!]/.test(v));
        (m[1].toLowerCase() === 'host' ? names : addresses).push(...values);
    }
    return { names, addresses };
}

const SSH_OPTS_WITH_VALUE = new Set('BbcDEeFIiJLlmOoPpQRSWw'.split(''));
const SSH_FORBIDDEN_FLAGS = new Set(['L', 'R', 'D', 'W', 'J', 'A', 'X', 'Y', 'M', 'S', 'O', 'w']);
const FORBIDDEN_OPTIONS = /^(ProxyCommand|ProxyJump|LocalForward|RemoteForward|DynamicForward|LocalCommand|PermitLocalCommand|ForwardAgent|ForwardX11|Tunnel|TunnelDevice|ControlMaster|ControlPath|ControlPersist|StreamLocalBindUnlink|GatewayPorts)\b/i;

// Changing how the device is reached, or its own defenses: the user's job, not the agent's.
const TAMPER = /\b(nft|iptables|ip6tables|ufw|agent-access|visudo|usermod|chpasswd)\b|authorized_keys|sshd_config|sudoers|\/etc\/agent-access/;
// Reaching the network or installing things from the device.
const NETWORK = new RegExp([
    '\\b(curl|wget|nc|ncat|netcat|socat|telnet|ftp|sftp|scp|rsync|ssh|dig|nslookup|ping|aria2c|tftp)\\b',
    '\\bgit\\s+(clone|fetch|pull|push|remote|submodule|ls-remote)\\b',
    '\\b(pip3?|pipx|uv|poetry)\\s+(install|download|add|sync)\\b',
    '\\b(npm|pnpm|yarn|npx)\\b',
    '\\b(apt|apt-get|aptitude|snap|flatpak)\\s+(install|update|upgrade|dist-upgrade|full-upgrade|download)\\b',
    '\\b(docker|podman)\\s+(pull|push|run|login|build)\\b',
    '/dev/(tcp|udp)/',
    '\\b(python3?|perl|ruby|node|php)\\b.*\\b(socket|urllib|requests|http\\.client|Net::|net/http|fetch\\()',
    '\\bopenssl\\s+s_client\\b',
].join('|'));

// Splits ssh/scp-style options; returns the forbidden one if any, and the remaining words.
function parseOptions(args, withValue) {
    const rest = [];
    let configFile = '';
    for (let k = 0; k < args.length; k++) {
        const a = args[k];
        if (rest.length || !a.startsWith('-') || a === '-') { rest.push(a); continue; }
        if (a === '--') { rest.push(...args.slice(k + 1)); break; }
        for (let c = 1; c < a.length; c++) {
            const flag = a[c];
            if (SSH_FORBIDDEN_FLAGS.has(flag)) return { forbidden: `-${flag}` };
            if (withValue.has(flag)) {
                const value = a.length > c + 1 ? a.slice(c + 1) : args[++k] || '';
                if (flag === 'o' && FORBIDDEN_OPTIONS.test(value)) return { forbidden: `-o ${value}` };
                if (flag === 'F') configFile = value;
                break;
            }
        }
    }
    return { rest, configFile };
}

function isDevice(host, configFile, devices) {
    const h = host.replace(/^[^@]*@/, '');
    return devices.names.includes(h) || devices.addresses.includes(h) || /agent-devices\/ssh_config$/.test(configFile);
}

function checkSsh(args, words, devices) {
    const parsed = parseOptions(args, SSH_OPTS_WITH_VALUE);
    if (parsed.forbidden) {
        return mentionsAny(args, devices) ? ['deny', `\`ssh ${parsed.forbidden}\` (forwarding, jumping or control sockets) isn't allowed with a device.`] : null;
    }
    const [host, ...remote] = parsed.rest;
    if (!host || !isDevice(host, parsed.configFile, devices)) return null;
    const remoteCommand = remote.join(' ');
    if (TAMPER.test(remoteCommand)) {
        return ['deny', 'it changes the device\'s access, firewall, accounts or SSH setup; that\'s the user\'s to do.'];
    }
    if (NETWORK.test(remoteCommand)) {
        return ['ask', `the command on ${host} reaches the network or installs something: ${remoteCommand}`];
    }
    if (words.pipedIn || words.includes('<') || words.some((w) => w.startsWith('<'))) {
        return ['ask', `it sends local data to ${host}.`];
    }
    return null;
}

function checkCopy(verb, args, devices) {
    if (verb === 'rsync') {
        const e = args.findIndex((a) => a === '-e' || a.startsWith('--rsh'));
        if (e >= 0) {
            const shell = args[e].includes('=') ? args[e].split('=').slice(1).join('=') : args[e + 1] || '';
            if (/\s-[LRDWJAXY]\b|ProxyCommand|ProxyJump|Forward/i.test(shell)) return ['deny', 'rsync\'s ssh command forwards or jumps; not allowed with a device.'];
        }
    } else {
        const parsed = parseOptions(args, new Set('cFiJloPSX'.split('')));
        if (parsed.forbidden && mentionsAny(args, devices)) return ['deny', `\`${verb} ${parsed.forbidden}\` isn't allowed with a device.`];
    }
    const remoteArgs = args.filter((a) => /^[^/-][^/]*:/.test(a) && isDevice(a.split(':')[0], '', devices));
    if (!remoteArgs.length) return null;
    if (verb === 'sftp') return ['ask', 'it opens a file transfer session with the device.'];
    const target = args[args.length - 1];
    if (remoteArgs.includes(target)) return ['ask', `it copies local files to the device (${target}).`];
    return null;
}

function mentionsAny(args, devices) {
    return args.some((a) => isDevice(a.split(':')[0], '', devices)) || args.some((a) => a.includes('agent-devices/ssh_config'));
}
