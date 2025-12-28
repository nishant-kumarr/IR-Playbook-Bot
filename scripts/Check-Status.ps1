Param(
    [Parameter(Mandatory = $true)]
    [string]$HostName
)

$quarantinePath = "C:\Users\ASCII\Desktop\IR-Bot\QuarantineState"
$markerFile = Join-Path $quarantinePath ("{0}.quarantined.txt" -f $HostName)

$status = "Not quarantined"
if (Test-Path $markerFile) {
    $status = "Quarantined"
}

Write-Output ("Check-Status.ps1: Host {0} `nstatus = {1}" -f $HostName, $status)
