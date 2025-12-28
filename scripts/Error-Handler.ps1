Param(
    [Parameter(Mandatory = $true)]
    [string]$HostName,

    [Parameter(Mandatory = $true)]
    [string]$ErrorMessage
)

$logDir = "C:\IR-Bot\ErrorLogs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logDir ("Error-{0}-{1}.txt" -f $HostName, $timestamp)

$lines = @()
$lines += "IR-Bot Error Handler"
$lines += "Host: $HostName"
$lines += "Time: $(Get-Date -Format o)"
$lines += "Error: $ErrorMessage"

$lines | Out-File -FilePath $logFile -Encoding UTF8

Write-Output "Error-Handler.ps1: Logged error for $HostName to $logFile"
