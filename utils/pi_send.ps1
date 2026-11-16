param(
    [Parameter(Mandatory=$true)][string]$PromptFile,
    [Parameter(Mandatory=$true)][string]$ReplyFile,
    [string]$PiArgs = ''
)

$inner = "pi.cmd --model gpt-4o-mini $PiArgs -p `"@$PromptFile`" | Out-File -FilePath `"$ReplyFile`" -Encoding utf8"
Start-Process powershell.exe -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList "-NoProfile -Command `"$inner`""
