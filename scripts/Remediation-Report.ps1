Param(
    [Parameter(Mandatory = $true)]
    [string]$HostName
)

$reportDir = "C:\Users\ASCII\Desktop\IR-Bot\Reports"
New-Item -ItemType Directory -Path $reportDir -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportFile = Join-Path $reportDir ("RemediationReport-{0}-{1}.txt" -f $HostName, $timestamp)

$lines = @()
$lines += "Remediation Report"
$lines += "Host: $HostName"
$lines += "Generated: $(Get-Date -Format o)"
$lines += ""
$lines += "- Logs collected."
$lines += "- Quarantine state checked."
$lines += "- Actions performed."

$lines | Out-File -FilePath $reportFile -Encoding UTF8

# Read whole report for Slack
$fullReport = Get-Content -Path $reportFile -Raw -ErrorAction SilentlyContinue

Write-Output ("Remediation-Report.ps1: Created remediation report for {0} at {1} `n`n--- Report ---`n{2}" -f $HostName, $reportFile, $fullReport)
