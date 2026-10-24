#!/usr/bin/env node
// Global PreToolUse guardrail: blocks Claude from reading common secret/credential
// locations (~/.ssh, ~/.aws, ~/.gnupg, .env files, private keys, etc.) via the
// Read/Grep/Glob tools, and blocks shell commands that would print a secret's
// raw value into Claude's context - either by dumping a secret FILE directly
// (cat/type/head/...) or by echoing a secret-shaped ENV VAR after it's been
// loaded (echo $TOKEN, printenv, Get-ChildItem Env:, verbose curl headers, ...).
//
// Loading a secret into the environment (`source .env`, `. .env`) is
// intentionally NOT blocked - only display of its value is. That's what lets
// a command like:
//   source .env && curl -u "$SONAR_TOKEN:" https://api.example.com/...
// work: the token flows into curl's argument list and out over the network
// without ever appearing in a tool result Claude can see. Same for
// length-only introspection like `${#SONAR_TOKEN}`.
//
// This is regex-based defense-in-depth, not a hard security boundary - it
// does not attempt to catch every possible exfiltration path (e.g. writing
// the variable to a file and reading that back, or piping through an
// interpreter that prints it under a different name).

let data = '';
process.stdin.on('data', (d) => { data += d; });
process.stdin.on('end', () => {
    let input;
    try {
        input = JSON.parse(data);
    } catch (e) {
        process.exit(0);
    }

    const tool = input.tool_name;
    const ti = input.tool_input || {};

    const norm = (s) => (s || '').replace(/\\/g, '/');

    const secretPathRe = new RegExp(
        [
            '(^|/)\\.ssh(/|$)',
            '(^|/)\\.aws(/|$)',
            '(^|/)\\.gnupg(/|$)',
            '(^|/)\\.env$',
            '(^|/)\\.env\\.[A-Za-z0-9_-]+$',
            'credentials\\.json$',
            '(^|/)id_(rsa|ed25519|ecdsa|dsa)(\\.pub)?$',
            '\\.pem$',
            '\\.pfx$',
            '\\.p12$',
            '(^|/)\\.netrc$',
            '(^|/)\\.npmrc$',
            '(^|/)\\.git-credentials$',
            '(^|/)secrets?\\.ya?ml$',
            '(^|/)\\.kube/config$',
            '(^|/)\\.docker/config\\.json$',
            '(^|/)\\.config/gcloud(/|$)',
            '(^|/)\\.azure(/|$)',
            '(^|/)\\.config/gh/hosts\\.ya?ml$',
            '(^|/)\\.terraform\\.d/credentials\\.tfrc\\.json$',
            '(^|/)\\.pgpass$',
            '\\.key$',
            '(^|/)\\.(bash|zsh|python|psql)_history$',
        ].join('|'),
        'i'
    );

    const envTemplateRe = /\.env\.(example|sample|template)$/i;

    // Env-var NAMES that look secret-shaped, for the "don't print this var"
    // checks below. Intentionally broad - a false positive here just means
    // "use the value without printing it," which is always still possible
    // (as an argument to another program, e.g. curl -u "$VAR:").
    const secretVarNameRe = /(^|_)(TOKEN|SECRET|KEY|PASSWORD|PASSWD|PASS|CREDENTIAL|APIKEY|AUTH)(_|$)/i;

    function isSecretPath(p) {
        if (!p) return false;
        const n = norm(p);
        if (envTemplateRe.test(n)) return false;
        return secretPathRe.test(n);
    }

    function deny(reason) {
        console.log(JSON.stringify({
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: reason,
            },
        }));
        process.exit(0);
    }

    if (tool === 'Read' || tool === 'Grep' || tool === 'Glob') {
        const p = ti.file_path || ti.path;
        if (isSecretPath(p)) {
            deny(`Blocked by global secrets-guard hook: "${p}" looks like a credential/secret location.`);
        }
        process.exit(0);
        return;
    }

    if (tool !== 'Bash' && tool !== 'PowerShell') {
        process.exit(0);
        return;
    }

    const cmd = ti.command || '';

    // Extract the variable name referenced by a $VAR / ${VAR} / $env:VAR
    // token, if any. Deliberately does NOT match ${#VAR} (bash length-of
    // operator) - introspecting a variable's length isn't printing its
    // value.
    function referencedVarName(token) {
        const m = token.match(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)|\$env:([A-Za-z_][A-Za-z0-9_]*)/i);
        return m && (m[1] || m[2] || m[3]);
    }

    // Split into individual pipeline/chain/line segments so a read-verb or
    // display-verb in one segment (e.g. `| head`, or an unrelated later
    // line) doesn't get blamed for a secret path/var that only appears in a
    // different, unrelated segment.
    const segments = cmd
        .split(/&&|\|\||\r?\n|[|;&]/)
        .map((s) => s.trim())
        .filter(Boolean);

    const readVerbRe = /\b(cat|type|more|less|head|tail|strings|xxd|od|hexdump|bat|get-content|gc)\b/i;
    const displayVerbRe = /^(echo|printf|print|write-output|write-host)$/i;
    const envDumpCmdRe = /^(env|printenv|set)$/i;
    const envListCmdRe = /^(get-childitem|gci|dir|ls)$/i;
    const httpClientRe = /^(curl|wget)$/i;
    const verboseFlagRe = /^(-v|--verbose|--trace|--trace-ascii)$/i;

    for (const seg of segments) {
        const tokens = seg
            .split(/\s+/)
            .filter(Boolean)
            .map((t) => t.replace(/^["']|["']$/g, ''));
        const verb = (tokens[0] || '').toLowerCase();

        // Direct read of a secret FILE (cat/type/head/... targeting a
        // credential path). Skip the argument to ssh/scp's -i (identity
        // file) flag - using a key for auth isn't "reading" it.
        if (readVerbRe.test(seg)) {
            const flaggedIdentityIndexes = new Set();
            tokens.forEach((t, i) => {
                if (t === '-i' && i + 1 < tokens.length) flaggedIdentityIndexes.add(i + 1);
            });
            const suspect = tokens.some((t, i) => !flaggedIdentityIndexes.has(i) && isSecretPath(t));
            if (suspect) {
                deny('Blocked by global secrets-guard hook: command appears to read a credential/secret file.');
            }
        }

        // Bare env-dump: prints every variable, secret or not.
        if (envDumpCmdRe.test(verb) && tokens.length === 1) {
            deny('Blocked by global secrets-guard hook: command dumps all environment variables.');
        }
        if (envListCmdRe.test(verb) && tokens.some((t) => /^env:?$/i.test(t))) {
            deny('Blocked by global secrets-guard hook: command lists all environment variables.');
        }

        // Explicit display of a secret-shaped variable's value.
        if (displayVerbRe.test(verb)) {
            const leaks = tokens.slice(1).some((t) => {
                const name = referencedVarName(t);
                return name && secretVarNameRe.test(name);
            });
            if (leaks) {
                deny('Blocked by global secrets-guard hook: command appears to print a secret-shaped environment variable.');
            }
        }

        // Verbose/trace HTTP client flags can echo Authorization headers
        // built from a secret variable back into the command output.
        if (httpClientRe.test(verb)) {
            const hasVerbose = tokens.some((t) => verboseFlagRe.test(t));
            const referencesSecret = tokens.some((t) => {
                const name = referencedVarName(t);
                return name && secretVarNameRe.test(name);
            });
            if (hasVerbose && referencesSecret) {
                deny('Blocked by global secrets-guard hook: verbose/trace HTTP flags could leak a secret-shaped variable referenced in this command via echoed request headers.');
            }
        }
    }

    process.exit(0);
});
