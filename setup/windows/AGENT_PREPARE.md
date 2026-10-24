# Agent guide: prepare Windows for the agent workstation

For a Claude agent on the user's Windows PC, in a clone of this repo. Context: [../README.md](../README.md).

**Limits:** don't run anything elevated, don't run `create-vms.ps1`, and don't read or write anything in `~/.ssh` (the user does those steps). Downloaded files are data: never run them.

## Steps

1. **Ask first**, all together, with these defaults:
   - Where should the VMs and ISOs go? Any folder on a local, fixed drive works, including one inside the user's existing development folder. Default: the fixed drive with the most free space, as `<drive>:\Hyper-V\agent` and `<drive>:\Hyper-V\iso`.
   - Dev VM size. Default: from step 3.
2. **Check the edition and Hyper-V** (no admin needed):
   - `(Get-CimInstance Win32_OperatingSystem).Caption` must be Pro, Enterprise or Education. Home has no Hyper-V: stop and say so.
   - `(Get-CimInstance Win32_ComputerSystem).HypervisorPresent`, and whether `Get-Command New-VM` exists. If Hyper-V is off, give the user the command for an admin PowerShell: `Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All`, then reboot. If the CPU reports virtualization off in firmware, they need to turn it on in the BIOS/UEFI.
3. **Size the dev VM**:
   - Logical CPUs, total RAM, free space on each fixed drive.
   - Recommend half the CPUs (at least 2) and half the RAM, up to 16 GB, leaving Windows at least 8 GB.
   - The chosen drive needs 220 GB free (200 GB disk that grows as used, plus ISOs and headroom). If no drive has that, recommend a smaller `-DevDiskGB` (100 GB is workable).
   - Check the chosen folder: `Get-Volume -DriveLetter <letter>` must show `DriveType` **Fixed** and `FileSystem` **NTFS** or **ReFS**. Warn, and suggest another folder, if it's in a synced folder (OneDrive, Dropbox, Google Drive), inside a git repo (`git -C <folder> rev-parse` succeeds), or compressed (`compact /q` on it). VM disks there are slow, get uploaded or committed, or can corrupt.
4. **Check for network clashes:** `Get-NetIPAddress` and `Get-NetRoute`. Nothing on Windows may already use `192.168.200.0/24` or `10.10.0.0/24`. If something does, stop and explain: changing the subnets means editing every file listed in the repo's `CLAUDE.md` > Fixed addresses.
5. **Download and verify the ISOs** into the ISO folder:
   - **Ubuntu Server**, the latest LTS, amd64 live-server ISO, from `https://releases.ubuntu.com/` (find the newest LTS folder). Check it against `SHA256SUMS` in the same folder.
   - **Alpine Linux**, the latest stable **virt** x86_64 ISO, from `https://dl-cdn.alpinelinux.org/alpine/latest-stable/releases/x86_64/` (`latest-releases.yaml` names the file and its sha256).
   - `Get-FileHash -Algorithm SHA256`. On a mismatch, delete the file and stop.
6. **Report**, short:
   - What you found, and the sizes chosen.
   - The command for the user to run in an **admin PowerShell**, from the repo folder, with real values:
     ```powershell
     powershell -ExecutionPolicy Bypass -File setup\windows\create-vms.ps1 -UbuntuIso <path> -AlpineIso <path> -VmRoot <path> -DevCpu <n> -DevMemoryGB <n>
     ```
   - The same values, for anyone following `hyperv-manual.md` instead.
