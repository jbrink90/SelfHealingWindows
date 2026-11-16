param(
    [Parameter(Mandatory=$true)][string]$PidFile,
    [Parameter(Mandatory=$true)][string]$ResultFile,
    [string]$SafePids = ''
)

$protected_names = @('idle','system','registry','memory compression','secure system','smss','csrss','wininit','winlogon','services','lsass','lsaiso','svchost','dwm','fontdrvhost','sihost','taskhostw','spoolsv','dashost','wudfhost','msmpeng','securityhealthservice','searchindexer','ctfmon','conhost','powershell','pwsh','cmd','pi')
$safe = @($PID) + @($SafePids -split ',' | Where-Object { $_ -match '^\d+$' } | ForEach-Object { [int]$_ })

$results = @{ killed = @(); skipped = @() }
foreach ($id in (Get-Content $PidFile | ConvertFrom-Json)) {
    $proc = Get-Process -Id $id -ErrorAction SilentlyContinue
    if (-not $proc) {
        $results.skipped += @{ id = $id; reason = 'not found' }
    } elseif ($safe -contains [int]$id) {
        $results.skipped += @{ id = $id; name = $proc.Name; reason = 'protected (self)' }
    } elseif ($protected_names -contains $proc.Name.ToLower()) {
        $results.skipped += @{ id = $id; name = $proc.Name; reason = 'protected system process' }
    } else {
        try {
            Stop-Process -Id $id -Force -ErrorAction Stop
            $results.killed += @{ id = $id; name = $proc.Name }
        } catch {
            $results.skipped += @{ id = $id; name = $proc.Name; reason = $_.Exception.Message }
        }
    }
}
ConvertTo-Json -Compress -Depth 3 -InputObject $results | Out-File $ResultFile -Encoding utf8
