# Going back, or rebuilding

When a VM seems off (unexpected changes, a setup gone wrong, suspected compromise), going back is cheaper than investigating.

## Back to a checkpoint (minutes)

Admin PowerShell:
```powershell
Get-VMSnapshot -VMName agent-dev                     # list checkpoints
Restore-VMSnapshot -VMName agent-dev -Name clean -Confirm:$false
Start-VM agent-dev
```
Everything since the checkpoint is lost: push project work first. Take new checkpoints after big changes: `Checkpoint-VM -Name agent-dev -SnapshotName <name>`.

## Rebuild the dev VM (about 45 minutes)

1. Make sure everything worth keeping is pushed: in each project, `git status` and `git log origin/main..` show nothing unpushed.
2. Admin PowerShell, in this repo's folder:
   ```powershell
   powershell -ExecutionPolicy Bypass -File setup\windows\remove-vms.ps1 -Name agent-dev
   ssh-keygen -R 10.10.0.10
   ```
3. Re-run [../README.md](../README.md) steps 3 (it only creates what's missing), 6, 7, 8 (the tokens still work: just repeat the commands in the VM), then 9–12.

## Rebuild the gateway (about 20 minutes)

1. Save domains you added with `allow`, then commit them:
   ```powershell
   ssh agent-gateway cat /etc/squid/allowlist.txt > setup\gateway\allowlist.txt
   ```
2. Admin PowerShell:
   ```powershell
   powershell -ExecutionPolicy Bypass -File setup\windows\remove-vms.ps1 -Name agent-gateway
   ssh-keygen -R 192.168.200.2
   ```
3. Re-run [../README.md](../README.md) steps 3, 4 and 5.

## Remove everything

```powershell
powershell -ExecutionPolicy Bypass -File setup\windows\remove-vms.ps1 -Networks
```
