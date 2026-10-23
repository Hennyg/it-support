#requires -Version 5.1
<#
.SYNOPSIS
  Backup Windows printers to a per-user ZIP on NAS; restore selectively or fully.
.DESCRIPTION
  Export includes a complete PrintBRM safety backup plus an inventory of active
  printer queues and their referenced ports/drivers. Import defaults to selective
  restoration (only inventoried printer queues). -FullRestore invokes PrintBRM
  and can restore unused drivers/ports too, but best preserves vendor settings.
.EXAMPLE
  .\PrinterMigration.ps1 -Mode Export
.EXAMPLE
  .\PrinterMigration.ps1 -Mode Import -UserName HenrikNygaard
.EXAMPLE
  .\PrinterMigration.ps1 -Mode Import -ZipPath 'C:\Temp\printer-HenrikNygaard.zip' -FullRestore
#>
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact='High')]
param(
    [Parameter(Mandatory=$true)][ValidateSet('Export','Import')][string]$Mode,
    [string]$ZipPath,
    [string]$UserName,
    [switch]$FullRestore
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$backupRoot = '\\192.168.10.5\Deling\IT\Printere\Brugerbackup'

function Get-ConsoleUser {
    $account = (Get-CimInstance Win32_ComputerSystem).UserName
    if ([string]::IsNullOrWhiteSpace($account)) { throw 'Ingen interaktiv Windows-bruger fundet. Angiv -UserName eller -ZipPath.' }
    return ($account -split '\\')[-1]
}
function Assert-UserName([string]$value) {
    if ($value -notmatch '^[a-zA-Z0-9._-]+$') { throw "Ugyldigt brugernavn: $value" }
}
function Get-PrintBRM {
    foreach ($path in @("$env:windir\System32\spool\tools\PrintBrm.exe", "$env:windir\Sysnative\spool\tools\PrintBrm.exe")) {
        if (Test-Path -LiteralPath $path) { return $path }
    }
    throw 'PrintBrm.exe findes ikke.'
}
function Get-ActiveInventory {
    $printers = @(Get-Printer | Select-Object Name,DriverName,PortName,Shared,ShareName,Comment,Location,Type)
    $driverNames = @($printers | ForEach-Object { $_.DriverName } | Where-Object { $_ } | Select-Object -Unique)
    $portNames = @($printers | ForEach-Object { $_.PortName -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
    $drivers = @(Get-PrinterDriver | Where-Object { $driverNames -contains $_.Name } | Select-Object Name,Manufacturer,MajorVersion,InfPath)
    $ports = @(Get-PrinterPort | Where-Object { $portNames -contains $_.Name } | Select-Object Name,PrinterHostAddress,PortNumber,Protocol,SNMPEnabled,SNMPCommunity,Description)
    $configurations = @()
    foreach ($printer in $printers) {
        try {
            $cfg = Get-PrintConfiguration -PrinterName $printer.Name -ErrorAction Stop
            $configurations += [pscustomobject]@{
                PrinterName=$printer.Name; Color=$cfg.Color; DuplexingMode=[string]$cfg.DuplexingMode
                PaperSize=[string]$cfg.PaperSize; Collate=$cfg.Collate
            }
        } catch { Write-Warning "Kan ikke læse standardindstillinger for $($printer.Name): $_" }
    }
    return [ordered]@{
        FormatVersion=2; Created=(Get-Date).ToString('o'); SourceComputer=$env:COMPUTERNAME
        Printers=$printers; Ports=$ports; Drivers=$drivers; Configurations=$configurations
    }
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Start Windows PowerShell som administrator.' }
Import-Module PrintManagement -ErrorAction Stop
if ([string]::IsNullOrWhiteSpace($ZipPath)) {
    if ([string]::IsNullOrWhiteSpace($UserName)) { $UserName = Get-ConsoleUser }
    Assert-UserName $UserName
    $ZipPath = Join-Path (Join-Path $backupRoot $UserName) "printer-$UserName.zip"
}
$zipFull = [IO.Path]::GetFullPath($ZipPath)
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$work = Join-Path $env:TEMP ("PrinterMigration_" + [guid]::NewGuid().ToString('N'))
New-Item -Path $work -ItemType Directory -Force | Out-Null
$localLog = Join-Path $work "PrinterMigration_${Mode}_$stamp.log"
$transcriptStarted = $false
$success = $false
try {
    Start-Transcript -Path $localLog -Force | Out-Null
    $transcriptStarted = $true
    $brm = Get-PrintBRM
    if ($Mode -eq 'Export') {
        Write-Host "Backup for: $UserName" -ForegroundColor Cyan
        $inventory = Get-ActiveInventory
        $inventory | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $work 'inventory.json') -Encoding UTF8
        $backup = Join-Path $work 'printers.printerExport'
        & $brm -b -f $backup -o force
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $backup)) { throw "PrintBRM fejlede med kode $LASTEXITCODE" }
        @'
PRINTER MIGRATION
- inventory.json lists only installed printer queues and their referenced drivers/ports.
- printers.printerExport is a FULL PrintBRM safety backup, including unused components.
- Default import is selective and will not restore unused printer queues/ports.
- Vendor-specific paper tray settings may require FullRestore or manual configuration.
- FullRestore can change existing printer configuration and import unused components.
'@ | Set-Content -LiteralPath (Join-Path $work 'README.txt') -Encoding UTF8
        $package = Join-Path $env:TEMP ("PrinterMigrationPackage_" + [guid]::NewGuid().ToString('N') + '.zip')
        try {
            Compress-Archive -LiteralPath @((Join-Path $work 'inventory.json'),$backup,(Join-Path $work 'README.txt')) -DestinationPath $package -CompressionLevel Optimal -Force
            $dest = Split-Path -Parent $zipFull
            if (-not (Test-Path -LiteralPath $dest)) { New-Item -Path $dest -ItemType Directory -Force | Out-Null }
            if (Test-Path -LiteralPath $zipFull) {
                $previous = Join-Path $dest ("{0}_previous_{1}.zip" -f [IO.Path]::GetFileNameWithoutExtension($zipFull),$stamp)
                Copy-Item -LiteralPath $zipFull -Destination $previous -ErrorAction Stop
                Write-Host "Forrige backup gemt: $previous" -ForegroundColor Yellow
            }
            Copy-Item -LiteralPath $package -Destination $zipFull -Force -ErrorAction Stop
            Write-Host "Eksport fuldført: $zipFull" -ForegroundColor Green
            Write-Host "Aktive printere: $(@($inventory.Printers).Count); porte: $(@($inventory.Ports).Count); drivere: $(@($inventory.Drivers).Count)"
            $success = $true
        } finally { Remove-Item -LiteralPath $package -Force -ErrorAction SilentlyContinue }
    } else {
        if (-not (Test-Path -LiteralPath $zipFull)) { throw "ZIP findes ikke: $zipFull" }
        Expand-Archive -LiteralPath $zipFull -DestinationPath $work -Force
        $inventoryPath = Join-Path $work 'inventory.json'
        if (-not (Test-Path -LiteralPath $inventoryPath)) { throw 'inventory.json mangler i ZIP.' }
        $inv = Get-Content -LiteralPath $inventoryPath -Raw | ConvertFrom-Json
        if ($inv.FormatVersion -ne 2) { throw 'Backup er fra en ældre version. Brug den tidligere import eller lav en ny eksport.' }
        $backup = Join-Path $work 'printers.printerExport'
        if (-not (Test-Path -LiteralPath $backup)) { throw 'PrintBRM-backup mangler.' }
        Write-Host "Kilde: $($inv.SourceComputer)" -ForegroundColor Cyan
        @($inv.Printers) | Format-Table Name,DriverName,PortName -AutoSize
        if ($FullRestore) {
            if ($PSCmdlet.ShouldProcess($env:COMPUTERNAME,'FULD PrintBRM-gendannelse (inklusive ubrugte porte/drivere)')) {
                & $brm -r -f $backup -o force
                if ($LASTEXITCODE -ne 0) { throw "PrintBRM-gendannelse fejlede: $LASTEXITCODE" }
                $success = $true
            }
        } else {
            Write-Warning 'Selektiv import gendanner almindelige printerindstillinger. Producent-specifikke bakkevalg kan kræve manuel opsætning eller -FullRestore.'
            if ($PSCmdlet.ShouldProcess($env:COMPUTERNAME,'Selektiv gendannelse af aktive printere')) {
                # Stage drivers from PrintBRM archive when possible; some OEM packages may require their original installer.
                $driverFolder = Join-Path $work 'DriverExtract'
                New-Item -Path $driverFolder -ItemType Directory -Force | Out-Null
                $expandExe = Join-Path $env:windir 'System32\expand.exe'
                & $expandExe -F:* $backup $driverFolder 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Get-ChildItem -Path $driverFolder -Filter '*.inf' -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
                        & pnputil.exe /add-driver $_.FullName /install 2>&1 | Out-Null
                    }
                } else { Write-Warning 'Kunne ikke udpakke driverarkivet. Drivere skal muligvis installeres manuelt.' }
                foreach ($port in @($inv.Ports)) {
                    if (Get-PrinterPort -Name $port.Name -ErrorAction SilentlyContinue) { continue }
                    if (-not [string]::IsNullOrWhiteSpace($port.PrinterHostAddress)) {
                        try {
                            $args = @{Name=$port.Name;PrinterHostAddress=$port.PrinterHostAddress;ErrorAction='Stop'}
                            if ($port.PortNumber -gt 0) { $args.PortNumber=[uint32]$port.PortNumber }
                            Add-PrinterPort @args
                        } catch { Write-Warning "Port $($port.Name) kunne ikke oprettes: $_" }
                    } else { Write-Warning "Port $($port.Name) er ikke en almindelig TCP/IP-port og skal muligvis oprettes manuelt." }
                }
                foreach ($printer in @($inv.Printers)) {
                    if (Get-Printer -Name $printer.Name -ErrorAction SilentlyContinue) {
                        Write-Warning "Printer $($printer.Name) findes allerede og overskrives ikke."
                        continue
                    }
                    if (-not (Get-PrinterDriver -Name $printer.DriverName -ErrorAction SilentlyContinue)) {
                        try { Add-PrinterDriver -Name $printer.DriverName -ErrorAction Stop }
                        catch { Write-Warning "Driver $($printer.DriverName) mangler. Installer producentdriveren. $_"; continue }
                    }
                    $portName = [string]$printer.PortName
                    if ($portName -match ',') { Write-Warning "Printer $($printer.Name) bruger flere porte og kræver manuel opsætning."; continue }
                    if (-not (Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue)) {
                        Write-Warning "Printer $($printer.Name) springes over: port $portName findes ikke."
                        continue
                    }
                    try {
                        Add-Printer -Name $printer.Name -DriverName $printer.DriverName -PortName $portName -ErrorAction Stop
                        $cfg = @($inv.Configurations | Where-Object { $_.PrinterName -eq $printer.Name } | Select-Object -First 1)
                        if ($cfg.Count -gt 0) {
                            $params = @{PrinterName=$printer.Name;ErrorAction='Stop'}
                            if ($null -ne $cfg[0].Color) { $params.Color=[bool]$cfg[0].Color }
                            if ($cfg[0].DuplexingMode -in @('OneSided','TwoSidedLongEdge','TwoSidedShortEdge')) { $params.DuplexingMode=$cfg[0].DuplexingMode }
                            if ($cfg[0].PaperSize) { $params.PaperSize=$cfg[0].PaperSize }
                            try { Set-PrintConfiguration @params } catch { Write-Warning "Indstillinger for $($printer.Name) kræver kontrol: $_" }
                        }
                        Write-Host "Printer installeret: $($printer.Name)" -ForegroundColor Green
                    } catch { Write-Warning "Printer $($printer.Name) kunne ikke installeres: $_" }
                }
                $success = $true
                Write-Host 'Selektiv import afsluttet. Kontrollér advarsler, bakkevalg og lav testudskrift.' -ForegroundColor Yellow
            }
        }
    }
} finally {
    if ($transcriptStarted) { Stop-Transcript | Out-Null }
    try {
        $logDir = if ($Mode -eq 'Export' -and $success) { Split-Path -Parent $zipFull } else { $env:TEMP }
        $logTarget = Join-Path $logDir (Split-Path -Leaf $localLog)
        Copy-Item -LiteralPath $localLog -Destination $logTarget -Force -ErrorAction Stop
        Write-Host "Log: $logTarget"
    } catch { Write-Warning "Kunne ikke gemme log: $_" }
    Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
}
