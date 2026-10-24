# Creating the VMs by hand

The click-through version of `create-vms.ps1`. Use one or the other. Sizes and the VM folder come from `/prepare-windows`, or use half your CPUs and half your RAM (at most 16 GB) for the dev VM.

**VM folder:** Hyper-V's default is on `C:`. To use another drive, pick a folder (`/prepare-windows` step 3 says which work) and, in each **New Virtual Machine** wizard:
- **Specify Name and Location:** tick **Store the virtual machine in a different location** and enter the folder. The VM's configuration and checkpoints go in `<folder>\<VM name>\`.
- **Connect Virtual Hard Disk:** set **Location** to `<folder>\<VM name>\`.

## Networks

1. Hyper-V Manager > **Virtual Switch Manager** > **New virtual network switch** > **Internal** > name `AgentNAT` > OK.
2. Windows has no screen for NAT, so run these two commands in an **admin PowerShell**:
   ```powershell
   New-NetIPAddress -InterfaceAlias "vEthernet (AgentNAT)" -IPAddress 192.168.200.1 -PrefixLength 24
   New-NetNat -Name AgentNAT -InternalIPInterfaceAddressPrefix 192.168.200.0/24
   ```
3. Virtual Switch Manager > New > **Private** > name `AgentLAN` > OK.

## Gateway VM

1. **New > Virtual Machine**: name `agent-gateway`, **Generation 2**, 512 MB, **untick** dynamic memory, connection `AgentNAT`, new disk 4 GB, install from the Alpine ISO. Don't start it yet.
2. **Settings**:
   - **Security**: untick **Enable Secure Boot** (Alpine isn't signed for it).
   - **Add Hardware** > Network Adapter > `AgentLAN`.
   - First network adapter (`AgentNAT`) > Advanced Features > **Static** MAC `00-15-5D-0A-00-01`.
   - Second (`AgentLAN`) > Advanced Features > **Static** MAC `00-15-5D-0A-00-02`.
   - **Firmware**: order Hard Drive, DVD Drive, then the network adapters.
   - **Checkpoints**: untick **Use automatic checkpoints**.
   - **Automatic Start Action**: Always start. **Automatic Stop Action**: Shut down.

## Dev VM

1. **New > Virtual Machine**: name `agent-dev`, **Generation 2**, your chosen memory, **untick** dynamic memory, connection `AgentLAN`, new disk 200 GB (it grows as used), install from the Ubuntu Server ISO.
2. **Settings**:
   - **Security**: Secure Boot on, template **Microsoft UEFI Certificate Authority**.
   - **Processor**: your chosen count.
   - Network adapter > Advanced Features > **Static** MAC `00-15-5D-0A-00-10`.
   - **Firmware**: Hard Drive, DVD Drive, Network Adapter.
   - **Checkpoints**: untick **Use automatic checkpoints**.

The MAC addresses matter: the setup scripts find each adapter by its MAC.
