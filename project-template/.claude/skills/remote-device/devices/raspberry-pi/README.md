# Raspberry Pi module

**Devices:** Raspberry Pi OS, and other Debian-based Linux with systemd (Ubuntu, Debian). Needs SSH enabled on the Pi (Raspberry Pi Imager > OS customisation > Services, or `sudo raspi-config` > Interface Options > SSH) and your own login with sudo, for setup.

**What the account can do:** with sudo (the default), anything on the Pi: install packages, change services, read every file. Without sudo (`--no-sudo`), only what a normal user can: its own home folder, readable files, running programs; add it to groups (`gpio`, `i2c`, `video`, ...) for hardware it needs. Either way: no password, no terminal, no port or agent forwarding, and only while you have access on.

Adapted from [philco/scripts/remote-access](https://github.com/andrewmherren/philco/tree/main/scripts/remote-access): the same account and on/off design, plus expiry, a restricted key, the gateway opening and a `remove` command.

## Setup

From **Windows PowerShell**, with the real values:

1. **Gateway opening:** `ssh agent-gateway access add ssh <name> <ip>`
2. **Copy the script and the agent's public key** to the Pi (through your Windows temp folder):
   ```powershell
   scp "agent-dev:projects/<project>/.claude/skills/remote-device/devices/raspberry-pi/setup-agent-account.sh" "agent-dev:.ssh/<name>-agent.pub" $env:TEMP\
   scp $env:TEMP\setup-agent-account.sh $env:TEMP\<name>-agent.pub <you>@<ip>:/tmp/
   ```
3. **Run it on the Pi:**
   ```powershell
   ssh -t <you>@<ip> "sudo bash /tmp/setup-agent-account.sh --key-file /tmp/<name>-agent.pub --from <from-ip> --user <account> --duration <duration>; rm /tmp/setup-agent-account.sh /tmp/<name>-agent.pub"
   ```
   Leave out `--from` if you chose not to restrict it; add `--no-sudo` for an account without sudo. Note the host key fingerprints it prints.
4. **Turn access on:** `ssh -t <you>@<ip> sudo agent-access on`, then tell the agent to check the connection, and compare the fingerprint it shows with step 3's.

## Removing it

`ssh -t <you>@<ip> sudo agent-access remove`, then `ssh agent-gateway access remove <name>`. The skill's "Removing it" section has the VM side.
