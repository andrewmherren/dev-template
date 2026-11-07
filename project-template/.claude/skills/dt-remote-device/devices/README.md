# Device modules

One folder per kind of device. The skill (`../SKILL.md`) does the parts every device shares: the gateway opening, the key, the VM's ssh config and the check. A module does the device side.

| Module | Devices |
|---|---|
| [raspberry-pi/](raspberry-pi/README.md) | Raspberry Pi OS, and other Debian-based Linux with systemd |

## Adding a module

A module is a folder `devices/<type>/` (kebab-case) with:

- **`README.md`**:
  - **Devices:** what it supports, and what it needs (OS, systemd, a user with sudo to run setup).
  - **What the account can do,** with and without sudo.
  - **Setup:** the user's steps, with placeholders the skill fills in: `<name>`, `<ip>`, `<you>` (their own login on the device), `<name>-agent.pub` (the public key), `<from-ip>`, `<account>`, `<duration>`.
  - **Removing it.**
- **A setup script** run as root on the device, safe to re-run, that:
  - takes the public key from a file, and optionally the address the key may be used from, the account name, how long access lasts, `--sudo` and `--internet`;
  - creates a key-only account (password locked) with access **off**, **no sudo** and **no outbound network** by default (the device is otherwise a way around the gateway), and refuses to turn access on if the network block isn't in place;
  - installs an `agent-access` command with `on [duration] | off | status | remove`, where `on` expires on its own and `off` ends open sessions too;
  - restricts the key (no forwarding, no terminal, `from=` when given);
  - prints the host key fingerprints.

Keep to that interface, so the skill's steps and the user's day-to-day commands stay the same for every device. Test a new module on the real device, or on a container with the same init system, before relying on it.
