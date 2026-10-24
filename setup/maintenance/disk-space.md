# Getting disk space back on Windows

The dev VM's disk (`agent-dev.vhdx`) grows as the VM uses space, but **never shrinks by itself**. Deleting files, images or projects frees space inside the VM, not on Windows. Do this when the file has grown well past what the VM uses (`df -h /` in the VM).

**Checkpoints:** while a checkpoint exists, every write goes into a separate `.avhdx` file that only grows, and the main disk can't be compacted. Keep the `clean` checkpoint from setup for a while, then replace it once the VM has proven itself (step 3 removes it; step 6 takes a new one).

1. **In the VM:** free space, then tell the disk which blocks are unused:
   ```bash
   docker system prune -f && docker builder prune -f
   sudo fstrim -av
   ```
   Ubuntu also runs `fstrim` weekly on its own.
2. **Admin PowerShell:** `Stop-VM agent-dev`
3. **Remove checkpoints** (skip if `Get-VMSnapshot -VMName agent-dev` lists none). This merges them into the disk, which can take a while:
   ```powershell
   Get-VMSnapshot -VMName agent-dev | Remove-VMSnapshot
   while ((Get-VMHardDiskDrive -VMName agent-dev).Path -like '*.avhdx') { Start-Sleep 5 }
   ```
4. **Compact:**
   ```powershell
   $vhd = (Get-VMHardDiskDrive -VMName agent-dev).Path
   (Get-Item $vhd).Length / 1GB               # before
   Mount-VHD $vhd -ReadOnly
   Optimize-VHD $vhd -Mode Full
   Dismount-VHD $vhd
   (Get-Item $vhd).Length / 1GB               # after
   ```
5. `Start-VM agent-dev`, and check `ssh agent-dev` works.
6. **New checkpoint:** `Checkpoint-VM -Name agent-dev -SnapshotName clean`.

The gateway's disk is 4 GB at most and doesn't need this.
