# VS Code settings on Windows

VS Code connects your Windows session to the dev VM. By default it passes some of your Windows credentials across; these settings stop that. They go in your Windows **user** settings, which nothing in the VM can change.

1. Install the **Remote - SSH** extension (Microsoft).
2. Ctrl+Shift+P > **Preferences: Open User Settings (JSON)**, and add:

```jsonc
// Agent workstation (dev-template/setup/windows/vscode-settings.md)
// Don't lend your SSH keys to the VM.
"remote.SSH.enableAgentForwarding": false,
// Don't let git in the VM sign in with your Windows GitHub session or credential prompts.
"github.gitAuthentication": false,
"git.terminalAuthentication": false,
// Download the VS Code server and extensions on Windows and copy them over,
// so the VM needs no Microsoft domains on its allowlist.
"remote.SSH.localServerDownload": "always",
"remote.downloadExtensionsLocally": true,
"remote.SSH.remotePlatform": { "agent-dev": "linux" },
// Install the Claude Code extension in the VM on first connect (and after a rebuild).
"remote.SSH.defaultExtensions": ["anthropic.claude-code"],
```

3. Ctrl+Shift+P > **Remote-SSH: Connect to Host** > `agent-dev`. Open `/home/dev/projects/<name>`.
4. Claude Code: VS Code installs the extension in the VM on the first connect (the setting above). If you added the settings after connecting, install it yourself: Extensions > Claude Code > **Install in SSH: agent-dev**. Either way it's once per VM: remote extensions live in the VM (`~/.vscode-server/`), not on Windows, so it's needed again only after a rebuild.

**Good to know**

- `git.terminalAuthentication: false` also applies to your Windows terminals. Git on Windows still signs in through Git Credential Manager.
- VS Code forwards ports from the VM automatically: a dev server on port 5173 opens at `http://localhost:5173` on Windows.
- VS Code can ask to open a link from the VM in your Windows browser. Only open links you expect: a link can carry data out.
- For the strictest separation, skip VS Code and run `claude` in a plain `ssh agent-dev` terminal.
