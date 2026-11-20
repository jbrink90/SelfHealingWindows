$sig = '[DllImport("kernel32.dll")] public static extern System.IntPtr GetStdHandle(int h); [DllImport("kernel32.dll")] public static extern bool GetConsoleMode(System.IntPtr h, out uint m); [DllImport("kernel32.dll")] public static extern bool SetConsoleMode(System.IntPtr h, uint m);'
Add-Type -MemberDefinition $sig -Name CMode -Namespace Win
$h = [Win.CMode]::GetStdHandle(-10)
$m = 0; [Win.CMode]::GetConsoleMode($h, [ref]$m) | Out-Null
[Win.CMode]::SetConsoleMode($h, ($m -band (-bnot 0x40))) | Out-Null
Set-Location $PSScriptRoot
node server.js
