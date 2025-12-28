Param(
    [Parameter(Mandatory = $true)]
    [string]$HostName
)

$basePath = "C:\Users\ASCII\Desktop\IR-Bot\CollectedLogs"
$hostPath = Join-Path $basePath $HostName

New-Item -ItemType Directory -Path $hostPath -Force | Out-Null

# Simulated log files with realistic‑looking lines
$logs = @(
    @{ Name = "security.log";    Source = "Security"    },
    @{ Name = "application.log"; Source = "Application" },
    @{ Name = "system.log";      Source = "System"      }
)

foreach ($log in $logs) {
    $filePath = Join-Path $hostPath $log.Name

    $line = "[{0}] [{1}] [{2}] User=demo\\analyst Action=LOGIN_SUCCESS SrcIP=10.0.0.5" -f `
        (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $log.Source, $HostName

    $line | Out-File -FilePath $filePath -Encoding UTF8
}

$files  = Get-ChildItem -Path $hostPath -File
$count  = $files.Count
$sample = $files | Select-Object -First 1

$sampleInfo = ""
if ($sample) {
    $sampleLine = Get-Content -Path $sample.FullName -TotalCount 1
    $sampleInfo = $sampleLine
}

Write-Output ("Collect-Logs.ps1: Collected {0} log files for {1} into {2}`n`n{3}" -f $count, $HostName, $hostPath, $sampleInfo)
