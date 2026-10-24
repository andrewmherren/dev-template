<#
.SYNOPSIS
    Deletes the agent workstation VMs and their disks, to rebuild them (setup/maintenance/rebuild.md).

.DESCRIPTION
    Run in an elevated PowerShell. Asks before deleting each VM. Anything in a VM that isn't
    pushed somewhere else is lost.

.EXAMPLE
    # Just the dev VM:
    powershell -ExecutionPolicy Bypass -File setup\windows\remove-vms.ps1 -Name agent-dev
    # Everything, networks too:
    powershell -ExecutionPolicy Bypass -File setup\windows\remove-vms.ps1 -Networks
#>
#Requires -RunAsAdministrator
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param(
    [string[]] $Name = @('agent-dev', 'agent-gateway'),
    # Also remove the AgentNAT / AgentLAN switches and the NAT.
    [switch] $Networks
)

$ErrorActionPreference = 'Stop'

foreach ($vmName in $Name) {
    $vm = Get-VM -Name $vmName -ErrorAction SilentlyContinue
    if (-not $vm) { Write-Host "$vmName doesn't exist."; continue }
    if (-not $PSCmdlet.ShouldProcess($vmName, 'Delete the VM, its checkpoints and its disks')) { continue }

    if ($vm.State -ne 'Off') { Stop-VM -Name $vmName -TurnOff -Force }
    Get-VMSnapshot -VMName $vmName | Remove-VMSnapshot
    # Wait for checkpoints to merge back into the disk before deleting it.
    while ((Get-VM -Name $vmName).Status -match 'Merging') { Start-Sleep -Seconds 2 }
    $disks = @(Get-VMHardDiskDrive -VMName $vmName | ForEach-Object { $_.Path })
    Remove-VM -Name $vmName -Force
    $disks | ForEach-Object { Remove-Item -Force $_ }
    # create-vms.ps1 puts each VM's disk and configuration in <VmRoot>\<name>\.
    $folder = if ($disks) { Split-Path $disks[0] }
    if ($folder -and (Split-Path $folder -Leaf) -eq $vmName -and (Test-Path $folder)) {
        Remove-Item -Recurse -Force $folder
    }
    Write-Host "Deleted $vmName"
}

if ($Networks -and $PSCmdlet.ShouldProcess('AgentNAT, AgentLAN', 'Delete the switches and the NAT')) {
    Get-NetNat -Name AgentNAT -ErrorAction SilentlyContinue | Remove-NetNat -Confirm:$false
    Get-VMSwitch -Name AgentNAT, AgentLAN -ErrorAction SilentlyContinue | Remove-VMSwitch -Force
    Write-Host 'Deleted the networks'
}
