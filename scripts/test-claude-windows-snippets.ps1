# Offline Windows PowerShell 5.1 checks. Never runs the installer or real Claude.
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1) {
    throw 'Run these checks in Windows PowerShell 5.1.'
}
$articlePath = Join-Path $PSScriptRoot 'content\claude-code-not-recognized-windows-2026.md'
$article = [IO.File]::ReadAllText($articlePath).Replace("`r`n", "`n")
$blocks = @([regex]::Matches($article, '(?ms)^```powershell\n(.*?)^```[ \t]*$') | ForEach-Object { $_.Groups[1].Value })
if ($blocks.Count -ne 9) { throw 'Expected the exact nine PowerShell article examples.' }
$checks = New-Object 'System.Collections.Generic.List[string]'
function Assert-Check([bool]$Condition, [string]$Name) {
    if (-not $Condition) { throw "FAIL: $Name" }
    $checks.Add($Name)
    Write-Output "PASS: $Name"
}
foreach ($block in $blocks) {
    $tokens = $null
    $parseErrors = $null
    [void][System.Management.Automation.Language.Parser]::ParseInput($block, [ref]$tokens, [ref]$parseErrors)
    if ($parseErrors.Count -gt 0) { throw 'An exact article block failed the PowerShell 5.1 parser.' }
}
Assert-Check $true 'All nine exact PowerShell article blocks parse in Windows PowerShell 5.1'
Assert-Check ($blocks[8].Trim() -eq 'irm https://claude.ai/install.ps1 | iex') 'Installer is identified but never executed'

$originalPath = $env:Path
$originalHome = $env:USERPROFILE
$originalLocation = Get-Location
$userPathBefore = [Environment]::GetEnvironmentVariable('Path', 'User')
$machinePathBefore = [Environment]::GetEnvironmentVariable('Path', 'Machine')
$root = Join-Path ([IO.Path]::GetTempPath()) ('ByteVerse Claude Fixture ' + [Guid]::NewGuid().ToString('N'))
$fixtureHome = Join-Path $root 'Example User'
$native = Join-Path $fixtureHome '.local\bin'
$alternate = Join-Path $root 'Alternate Install'
$work = Join-Path $root 'Empty Working Folder'
$prefix = Join-Path $root 'Custom Npm Prefix'
$tools = Join-Path $root 'Synthetic Package Tools'
$systemOnly = "$env:SystemRoot\System32;$PSHOME"
$PSModuleAutoLoadingPreference = 'None'
if (Test-Path Alias:claude) { throw 'Pre-existing claude alias detected; no fixture changes made.' }
if (Test-Path Function:claude) { throw 'Pre-existing claude function detected; no fixture changes made.' }

try {
    foreach ($directory in @($native, $alternate, $work, $prefix, $tools)) { [void][IO.Directory]::CreateDirectory($directory) }
    $env:USERPROFILE = $fixtureHome
    $env:Path = $systemOnly
    Set-Location -LiteralPath $work

    # A failed where.exe lookup writes stderr; observe it without treating the
    # expected missing-command case as a terminating harness failure.
    $ErrorActionPreference = 'Continue'
    $initial = @(& ([scriptblock]::Create($blocks[0])) 2>&1)
    $ErrorActionPreference = 'Stop'
    Assert-Check ($initial[0] -eq $false) 'Missing native file reports False in the exact diagnostic block'
    Assert-Check (@(Get-Command claude -All -ErrorAction SilentlyContinue).Count -eq 0) 'No real Claude can resolve through the isolated fixture PATH'

    $exe = Join-Path $native 'claude.exe'
    [void][IO.Directory]::CreateDirectory($exe)
    Assert-Check (-not (Test-Path -LiteralPath $exe -PathType Leaf)) 'A directory named claude.exe is not accepted as a file'
    [IO.Directory]::Delete($exe)

    $className = 'ByteVerseFixture' + [Guid]::NewGuid().ToString('N')
    $source = @"
using System;
public static class $className {
    public static int Main(string[] args) {
        if (args.Length == 1 && args[0] == "--version") { Console.WriteLine("ByteVerseFixture 1.0"); return 0; }
        if (args.Length == 1 && args[0] == "--fixture-path") { Console.WriteLine(Environment.GetEnvironmentVariable("PATH")); return 0; }
        return 3;
    }
}
"@
    Add-Type -TypeDefinition $source -Language CSharp -OutputAssembly $exe -OutputType ConsoleApplication
    Assert-Check (Test-Path -LiteralPath $exe -PathType Leaf) 'Harmless native fixture exists outside PATH'
    Assert-Check (@(Get-Command claude -All -ErrorAction SilentlyContinue).Count -eq 0) 'File existence alone does not make the bare command resolvable'
    $output = & ([scriptblock]::Create($blocks[1]))
    Assert-Check ($output -eq 'ByteVerseFixture 1.0') 'Exact full-path article invocation works through a username containing spaces'

    . ([scriptblock]::Create($blocks[2])) | Out-Null
    Assert-Check ((Get-Command claude).Path -eq $exe) 'Exact process-PATH experiment makes the intended executable resolve'
    Assert-Check ((claude --version) -eq 'ByteVerseFixture 1.0') 'Bare command now executes only the harmless fixture'
    Assert-Check ((& $exe --fixture-path) -eq $env:Path) 'A child executable inherits the process-only PATH'
    . ([scriptblock]::Create($blocks[3]))
    Assert-Check ($env:Path -eq $systemOnly) 'Exact restore block restores the pre-experiment process PATH'

    $otherExe = Join-Path $alternate 'claude.exe'
    [IO.File]::Copy($exe, $otherExe)
    $env:Path = "$alternate;$native;$systemOnly"
    Assert-Check ((Get-Command claude).Path -eq $otherExe) 'A competing executable can win by PATH order'
    . ([scriptblock]::Create($blocks[2])) | Out-Null
    Assert-Check ((Get-Command claude).Path -eq $exe) 'Prepending changes executable priority unlike merely appending'
    . ([scriptblock]::Create($blocks[3]))
    Assert-Check ((Get-Command claude).Path -eq $otherExe) 'Restoring PATH also restores the original executable precedence'

    function claude { 'Synthetic function, not Claude' }
    Assert-Check ((Get-Command claude).CommandType -eq 'Function') 'A loaded function shadows executable lookup'
    Set-Alias -Name claude -Value Write-Output -Scope Local
    Assert-Check ((Get-Command claude).CommandType -eq 'Alias') 'A loaded alias takes precedence over a same-named function'
    Assert-Check ((& $exe --version) -eq 'ByteVerseFixture 1.0') 'Explicit trusted path bypasses alias and function shadowing'
    Remove-Item Alias:claude
    Remove-Item Function:claude

    $env:Path = $systemOnly
    Set-Location -LiteralPath $native
    Assert-Check (@(where.exe claude).Contains($exe)) 'where.exe also finds an executable only in the current directory'
    Assert-Check (@(Get-Command claude -All -ErrorAction SilentlyContinue).Count -eq 0) 'PowerShell bare-name lookup does not imply current-directory execution'
    Set-Location -LiteralPath $work

    $invalid = Join-Path $root 'invalid.exe'
    [IO.File]::WriteAllText($invalid, 'Not a Windows executable')
    $invalidFailed = $false
    try { & $invalid --version 2>$null } catch { $invalidFailed = $true }
    Assert-Check $invalidFailed 'An existing invalid executable fails full-path execution'

    $npm = Join-Path $tools 'npm.cmd'
    [IO.File]::WriteAllText($npm, "@echo off`r`necho $prefix`r`nexit /b 0`r`n")
    [IO.File]::WriteAllText((Join-Path $prefix 'claude.cmd'), "@echo off`r`n`"$exe`" --version`r`n")
    [IO.File]::WriteAllText((Join-Path $prefix 'claude.ps1'), "throw 'Synthetic shim: not invoked by this harness.'")
    $env:Path = "$tools;$prefix;$systemOnly"
    $prefixResult = . ([scriptblock]::Create($blocks[5]))
    Assert-Check ($prefixResult -eq $true -and $npmPrefix -eq $prefix) 'Exact npm-prefix block accepts a custom prefix with spaces'
    Assert-Check ((& ([scriptblock]::Create($blocks[6]))) -eq 'ByteVerseFixture 1.0') 'Exact explicit CMD-shim invocation works without changing execution policy'
    [IO.File]::WriteAllText($npm, "@echo off`r`nexit /b 1`r`n")
    $prefixFailed = $false
    try { . ([scriptblock]::Create($blocks[5])) | Out-Null } catch { $prefixFailed = $_.Exception.Message -match '^Could not read the npm global prefix' }
    Assert-Check $prefixFailed 'An npm-prefix failure stops before constructing a misleading launcher path'

    Assert-Check (@(& ([scriptblock]::Create($blocks[7]))).Count -eq 0) 'Exact backup-inspection block returns nothing when no backups exist'
    foreach ($suffix in @('1791400000000', '1791500000000')) { [IO.File]::WriteAllText((Join-Path $native "claude.exe.old.$suffix"), 'Synthetic backup, never executable') }
    $backup = & ([scriptblock]::Create($blocks[7]))
    Assert-Check ($backup.Name -eq 'claude.exe.old.1791500000000') 'Exact backup block selects the newest timestamped fixture without renaming it'
    Assert-Check (Test-Path -LiteralPath $exe -PathType Leaf) 'Inspection did not change the working executable'
    Assert-Check ([Environment]::GetEnvironmentVariable('Path', 'User') -eq $userPathBefore) 'Persistent User PATH is unchanged'
    Assert-Check ([Environment]::GetEnvironmentVariable('Path', 'Machine') -eq $machinePathBefore) 'Persistent Machine PATH is unchanged'
} finally {
    $env:Path = $originalPath
    $env:USERPROFILE = $originalHome
    Set-Location -LiteralPath $originalLocation.Path
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}

Write-Output ("PASS: {0} fixture assertions; PowerShell {1}; no real Claude, network, installer, WinGet repair, WSL, security-policy or persistent environment changes." -f $checks.Count, $PSVersionTable.PSVersion)