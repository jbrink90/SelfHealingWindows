param(
    [Parameter(Mandatory=$true)][string]$PidFile,
    [Parameter(Mandatory=$true)][string]$ResultFile,
    [string]$SafePids = ''
)

$inner = "try { & `"$PSScriptRoot\kill_proc.ps1`" -PidFile `"$PidFile`" -ResultFile `"$ResultFile`" -SafePids `"$SafePids`" } catch { `$_ | Out-File `"$ResultFile.err`" -Encoding utf8 }"
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($inner))
try {
    Start-Process powershell.exe -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',$encoded
} catch {
    $_ | Out-File "$ResultFile.err" -Encoding utf8
}
