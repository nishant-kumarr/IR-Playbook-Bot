Param(
    [Parameter(Mandatory = $true)]
    [string]$HostName
)

$basePath = "C:\Users\ASCII\Desktop\IR-Bot\QuarantineState"
New-Item -ItemType Directory -Path $basePath -Force | Out-Null

$markerFile = Join-Path $basePath ("{0}.quarantined.txt" -f $HostName)

$lines = @()
$lines += "IR-Bot quarantine record"
$lines += "Host: $HostName"
$lines += "Time: $(Get-Date -Format o)"
$lines += ""
$lines += "Action taken"
$lines += "- Host QUARANTINED."
$lines += "."

$lines | Out-File -FilePath $markerFile -Encoding UTF8

# Short tail for Slack
$tail = Get-Content -Path $markerFile -Tail 3 -ErrorAction SilentlyContinue
$tailText = ($tail -join "; ")

Write-Output ("Quarantine-Host.ps1: Host {0} recorded as QUARANTINED in IR-Bot state file {1}`n`nTail: {2}" -f $HostName, $markerFile, $tailText)
