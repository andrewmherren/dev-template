<#
.SYNOPSIS
    Creates the agent workstation in Hyper-V: the Alpine gateway VM, the Ubuntu dev VM, and
    their two networks (setup/README.md, step 3). The manual equivalent: hyperv-manual.md.

.DESCRIPTION
    Run in an elevated PowerShell, on Windows 11 Pro, Enterprise or Education with Hyper-V on.
    Safe to re-run: anything that already exists is left as it is.

    AgentNAT  internal switch with Windows NAT, 192.168.200.0/24
              Windows 192.168.200.1, gateway 192.168.200.2
    AgentLAN  private switch (VMs only, Windows has no adapter on it), 10.10.0.0/24
              gateway 10.10.0.1, dev VM 10.10.0.10

    The VMs get fixed MAC addresses so the setup scripts inside them can tell the
    adapters apart (setup-gateway.sh, bootstrap.sh).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File setup\windows\create-vms.ps1 `
        -UbuntuIso D:\iso\ubuntu-server.iso -AlpineIso D:\iso\alpine-virt.iso -VmRoot D:\Hyper-V\agent
#>
#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $UbuntuIso,
    [Parameter(Mandatory)] [string] $AlpineIso,
    # Folder for both VMs' configuration and disks.
    [Parameter(Mandatory)] [string] $VmRoot,
    # Dev VM size. Defaults: half the host's logical CPUs and half its RAM, up to 16 GB.
    [int] $DevCpu = 0,
    [int] $DevMemoryGB = 0,
    # Grows as it's used; this is the most it can reach.
    [int] $DevDiskGB = 200
)

$ErrorActionPreference = 'Stop'

$NatSwitch = 'AgentNAT'
$NatPrefix = '192.168.200'
$LanSwitch = 'AgentLAN'
$GatewayName = 'agent-gateway'
$DevName = 'agent-dev'
$Mac = @{ GatewayNat = '00155D0A0001'; GatewayLan = '00155D0A0002'; Dev = '00155D0A0010' }

function Assert-Prerequisites {
    if (-not (Get-Command New-VM -ErrorAction SilentlyContinue)) {
        throw 'Hyper-V is not enabled. Run: Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All, then reboot.'
    }
    foreach ($iso in $UbuntuIso, $AlpineIso) {
        if (-not (Test-Path $iso)) { throw "ISO not found: $iso" }
    }
    New-Item -ItemType Directory -Force -Path $VmRoot | Out-Null
}

function New-Networks {
    if (-not (Get-VMSwitch -Name $NatSwitch -ErrorAction SilentlyContinue)) {
        New-VMSwitch -Name $NatSwitch -SwitchType Internal | Out-Null
        Write-Host "Created switch $NatSwitch"
    }
    $alias = "vEthernet ($NatSwitch)"
    if (-not (Get-NetIPAddress -InterfaceAlias $alias -IPAddress "$NatPrefix.1" -ErrorAction SilentlyContinue)) {
        New-NetIPAddress -InterfaceAlias $alias -IPAddress "$NatPrefix.1" -PrefixLength 24 | Out-Null
    }
    if (-not (Get-NetNat -Name $NatSwitch -ErrorAction SilentlyContinue)) {
        try {
            New-NetNat -Name $NatSwitch -InternalIPInterfaceAddressPrefix "$NatPrefix.0/24" | Out-Null
        }
        catch {
            $existing = (Get-NetNat | ForEach-Object { "$($_.Name) ($($_.InternalIPInterfaceAddressPrefix))" }) -join ', '
            throw "Couldn't create the NAT network. Windows may allow only one, and these exist: $existing. $_"
        }
        Write-Host "Created NAT $NatPrefix.0/24"
    }
    if (-not (Get-VMSwitch -Name $LanSwitch -ErrorAction SilentlyContinue)) {
        New-VMSwitch -Name $LanSwitch -SwitchType Private | Out-Null
        Write-Host "Created switch $LanSwitch"
    }
}

# Creates a Generation 2 VM. $Nics: ordered list of @{ Switch = ...; Mac = ... }.
function New-AgentVm {
    param(
        [string] $Name, [int] $Cpu, [long] $MemoryBytes, [long] $DiskBytes,
        [string] $Iso, [bool] $SecureBoot, [object[]] $Nics
    )
    if (Get-VM -Name $Name -ErrorAction SilentlyContinue) {
        Write-Host "$Name already exists: left as it is."
        return
    }
    $vhd = Join-Path (Join-Path $VmRoot $Name) "$Name.vhdx"
    New-Item -ItemType Directory -Force -Path (Split-Path $vhd) | Out-Null
    New-VM -Name $Name -Generation 2 -Path $VmRoot -MemoryStartupBytes $MemoryBytes `
        -NewVHDPath $vhd -NewVHDSizeBytes $DiskBytes -SwitchName $Nics[0].Switch | Out-Null

    Set-VM -Name $Name -ProcessorCount $Cpu -AutomaticCheckpointsEnabled $false
    Set-VMMemory -VMName $Name -DynamicMemoryEnabled $false
    Get-VMNetworkAdapter -VMName $Name | Set-VMNetworkAdapter -StaticMacAddress $Nics[0].Mac
    foreach ($nic in ($Nics | Select-Object -Skip 1)) {
        Add-VMNetworkAdapter -VMName $Name -SwitchName $nic.Switch -StaticMacAddress $nic.Mac
    }
    Add-VMDvdDrive -VMName $Name -Path $Iso

    if ($SecureBoot) {
        Set-VMFirmware -VMName $Name -EnableSecureBoot On -SecureBootTemplate MicrosoftUEFICertificateAuthority
    }
    else {
        Set-VMFirmware -VMName $Name -EnableSecureBoot Off
    }
    # Disk first: it's empty on the first boot, so the VM falls through to the installer
    # on the DVD; once installed, it boots from the disk without ejecting anything.
    $order = @(Get-VMHardDiskDrive -VMName $Name) + @(Get-VMDvdDrive -VMName $Name) + @(Get-VMNetworkAdapter -VMName $Name)
    Set-VMFirmware -VMName $Name -BootOrder $order
    Write-Host "Created VM $Name"
}

Assert-Prerequisites

if ($DevCpu -le 0) { $DevCpu = [Math]::Max(2, [int]([Environment]::ProcessorCount / 2)) }
if ($DevMemoryGB -le 0) {
    $hostGB = [Math]::Floor((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
    $DevMemoryGB = [Math]::Min(16, [Math]::Max(4, [int]($hostGB / 2)))
}

New-Networks

# Alpine's boot loader isn't signed for Secure Boot, so the gateway runs without it.
New-AgentVm -Name $GatewayName -Cpu 1 -MemoryBytes 512MB -DiskBytes 4GB -Iso $AlpineIso -SecureBoot $false -Nics @(
    @{ Switch = $NatSwitch; Mac = $Mac.GatewayNat },
    @{ Switch = $LanSwitch; Mac = $Mac.GatewayLan }
)
Set-VM -Name $GatewayName -AutomaticStartAction Start -AutomaticStopAction ShutDown

New-AgentVm -Name $DevName -Cpu $DevCpu -MemoryBytes ([long]$DevMemoryGB * 1GB) -DiskBytes ([long]$DevDiskGB * 1GB) `
    -Iso $UbuntuIso -SecureBoot $true -Nics @(@{ Switch = $LanSwitch; Mac = $Mac.Dev })

Write-Host ""
Write-Host "Done. Dev VM: $DevCpu CPUs, $DevMemoryGB GB RAM, disk up to $DevDiskGB GB."
Write-Host "Next (setup/README.md, step 4): Start-VM $GatewayName; vmconnect.exe localhost $GatewayName"
