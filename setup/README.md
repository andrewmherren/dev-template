# Agent workstation: setup guide

One-time setup per PC, about 2 hours. Afterwards, agents work in an isolated Linux VM that can only reach an allowlist of sites, and your Windows files, browser sessions and credentials stay out of reach. What it does and doesn't protect against: [threat-model.md](threat-model.md).

```mermaid
flowchart LR
    internet(("Internet"))
    subgraph host["Windows host"]
        win["Windows<br/>192.168.200.1"]
    end
    subgraph nat["AgentNAT 192.168.200.0/24<br/>NAT to the internet"]
        gw["agent-gateway (Alpine)<br/>192.168.200.2 · 10.10.0.1<br/>Squid allowlist, routes nothing"]
    end
    subgraph lan["AgentLAN 10.10.0.0/24<br/>private: VMs only"]
        dev["agent-dev (Ubuntu)<br/>10.10.0.10<br/>Docker, Claude Code, your projects"]
    end
    win -- "SSH (admin), SSH jump to agent-dev" --> gw
    gw -- "SSH jump" --> dev
    dev -- "HTTP(S) proxy :3128, listed domains only" --> gw
    gw -- "allowed requests" --> internet
```

- **agent-gateway:** a tiny Alpine VM (512 MB). The dev VM's only way out is its Squid proxy, which allows only the domains in [gateway/allowlist.txt](gateway/allowlist.txt). It updates and reboots itself weekly.
- **agent-dev:** Ubuntu Server. Agents have sudo and Docker here; that's safe because nothing in this VM can change the gateway.
- **You** reach the gateway by SSH from Windows, and the dev VM through the gateway (VS Code Remote-SSH).

**Needs:** Windows 11 Pro, Enterprise or Education (Hyper-V); 16 GB RAM or more; about 220 GB free disk; virtualization on in the BIOS; Claude Code on Windows for step 1.

## Setup

1. **Prepare (agent).** In this repo on Windows, ask Claude: *"Follow setup/windows/AGENT_PREPARE.md"*. It checks your PC, sizes the VMs, downloads and verifies the ISOs, and gives you the command for step 3. If it says Hyper-V is off, enable it as it says and reboot.

2. **SSH key** (PowerShell, in this repo's folder):
   ```powershell
   ssh-keygen -t ed25519 -f $HOME\.ssh\agent_vms -C agent-vms
   Copy-Item $HOME\.ssh\agent_vms.pub setup\gateway\authorized_keys
   Copy-Item $HOME\.ssh\agent_vms.pub setup\devvm\authorized_keys
   Get-Content setup\windows\ssh-config.example | Add-Content $HOME\.ssh\config
   ```
   A passphrase is optional: the key only opens these two VMs. The copies are git-ignored.

3. **Create the VMs:** run the command from step 1 in an **admin** PowerShell. Or click through [windows/hyperv-manual.md](windows/hyperv-manual.md).

4. **Install the gateway OS** (about 10 minutes). Admin PowerShell: `Start-VM agent-gateway; vmconnect.exe localhost agent-gateway`. Log in as `root` (no password), run `ip link` and note which adapter has MAC `00:15:5d:0a:00:01`. Then run `setup-alpine` and answer:

   | Question | Answer |
   |---|---|
   | Keyboard, hostname | yours, `agent-gateway` |
   | Interface to initialize | the one with MAC `...:00:01` |
   | Its IP / netmask / gateway | `192.168.200.2` / `255.255.255.0` / `192.168.200.1` |
   | Next interface | `done`; manual network configuration: `no` |
   | DNS domain / nameserver | blank / `1.1.1.1` |
   | Root password | a strong one (you'll only need it until step 5, then at the console) |
   | Timezone, proxy, NTP | yours, `none`, `chrony` |
   | Mirror | `f` (fastest) |
   | Set up a user | `no` |
   | SSH server / root login / root key | `openssh` / `yes` / `none` (step 5 turns off password login) |
   | Disk / how / erase | `sda` / `sys` / `y` |

   Then `reboot`. Leave the console open: the gateway boots from its disk.

5. **Configure the gateway** (PowerShell, this repo's folder; enter the root password when asked):
   ```powershell
   scp -r setup\gateway root@192.168.200.2:/root/
   ssh root@192.168.200.2 sh /root/gateway/setup-gateway.sh
   ssh agent-gateway denied
   ```
   The last command should run without asking for a password (it prints nothing yet).

6. **Install Ubuntu on the dev VM** (about 15 minutes). Admin PowerShell: `Start-VM agent-dev; vmconnect.exe localhost agent-dev`. Answer:

   | Screen | Answer |
   |---|---|
   | Installer update | **Continue without updating** |
   | Type of install | Ubuntu Server |
   | Network | edit the adapter > IPv4 **Manual**: subnet `10.10.0.0/24`, address `10.10.0.10`, gateway, name servers and search domains **blank** |
   | Proxy | `http://10.10.0.1:3128` |
   | Mirror | the default; its check should pass (through the gateway) |
   | Storage | use the entire disk; **untick** "Set up this disk as an LVM group" |
   | Profile | your name, server `agent-dev`, username **`dev`**, a password |
   | Ubuntu Pro | skip |
   | SSH | **Install OpenSSH server**, allow password authentication (step 7 turns it off), no key import |
   | Snaps | none |

   Reboot when it's done. If the installer starts again, turn the VM off and on.

7. **Bootstrap the dev VM** (PowerShell, this repo's folder; enter the `dev` password when asked):
   ```powershell
   scp -r setup\devvm agent-dev:
   ssh -t agent-dev sudo bash devvm/bootstrap.sh
   ```
   Every network check should say `ok`. Then check `ssh agent-dev` connects **without** a password before closing anything; if it doesn't, the VM console still works.

8. **GitHub access for the VM.**
   - GitHub > Settings > Developer settings > **Fine-grained tokens** > Generate:
     - Name `agent-dev VM`, expiry 90 days (put a reminder in your calendar).
     - Repository access: **Only select repositories**: `dev-template`, plus each project as you create it.
     - Permissions: Contents **read and write**, Pull requests **read**, Actions **read**.
   - In the VM (`ssh agent-dev`):
     ```bash
     gh auth login          # GitHub.com > HTTPS > Paste an authentication token
     gh auth setup-git
     gh repo clone <your-account>/dev-template ~/dev-template
     ```
   This token is the most valuable thing in the VM. Keep it to the repos it needs.

9. **Log in to Claude:** in the VM, `cd ~/dev-template && claude`. Open the login link in your Windows browser and paste the code back.

10. **Finish the VM (agent).** In that Claude session: *"Follow setup/devvm/AGENT_SETUP.md"*. It asks two questions, installs Docker and Claude's user settings, and checks the network.

11. **VS Code:** follow [windows/vscode-settings.md](windows/vscode-settings.md), then connect to `agent-dev`.

12. **Checkpoint** (admin PowerShell): `Checkpoint-VM -Name agent-gateway, agent-dev -SnapshotName clean`. A clean state to go back to.

13. **Start a project:** in the VM, `cd ~ && claude`, then *"Follow ~/dev-template/AGENT_NEW_PROJECT.md"*.

## Day to day

- **A site is blocked:** from Windows, `ssh agent-gateway denied` lists recent refusals; `ssh agent-gateway allow <domain>` adds one (`.domain.com` for its subdomains too). If every setup will need it, add it to [gateway/allowlist.txt](gateway/allowlist.txt) as well.
- **Monthly:** in the VM, ask Claude: *"Follow ~/dev-template/setup/maintenance/AGENT_MONTHLY.md"*.
- **Something seems off:** go back to the checkpoint, or rebuild: [maintenance/rebuild.md](maintenance/rebuild.md).
- **Ending a project:** `docker compose down -v`, delete its folder, and remove the repo from the GitHub token.
- **Bringing in an existing project:** add the repo to the token, `gh repo clone` it into `~/projects/`, and create its `.env` with development-only keys. Allow any extra domains it needs.

## Troubleshooting

- **Ubuntu's mirror check fails, or `bootstrap.sh` can't reach the Anthropic API:** is the gateway running? `ssh agent-gateway rc-service squid status`. Look for refused names with `ssh agent-gateway denied`.
- **`ssh agent-dev` fails:** the gateway must be running. `ssh -v agent-dev` shows which hop fails. `ssh agent-jump` on its own failing is normal: that account has no shell.
- **"Host key changed" after a rebuild:** `ssh-keygen -R 192.168.200.2` or `ssh-keygen -R 10.10.0.10`.
- **The subnets clash with your network:** see the repo's `CLAUDE.md` > Fixed addresses for every file to change.
