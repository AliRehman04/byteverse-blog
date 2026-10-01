$ErrorActionPreference = 'Stop'
$articlePath = Join-Path $PSScriptRoot 'content\n8n-webhook-not-working-2026.md'
$articleText = [System.IO.File]::ReadAllText($articlePath)
$match = [regex]::Match($articleText, '(?ms)^```powershell\r?\n(.*?)^```')
if (-not $match.Success) { throw 'PowerShell sample missing' }
$sample = $match.Groups[1].Value
$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseInput($sample, [ref]$tokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count -gt 0) { throw 'PowerShell sample contains syntax errors' }
Write-Output 'PASS: article sample parses in Windows PowerShell 5.1'

foreach ($testCase in @(@{ Path = 'success'; Status = 200 }, @{ Path = 'not-found'; Status = 404 }, @{ Path = 'redirect'; Status = 302 })) {
  $localSample = $sample.Replace('https://n8n.example.invalid/webhook-test/replace-me', "http://127.0.0.1:3033/probe/$($testCase.Path)")
  $result = & ([scriptblock]::Create($localSample))
  if ($result.Status -ne $testCase.Status) { throw "Incorrect captured status for $($testCase.Path)" }
  if ($testCase.Path -eq 'redirect' -and $result.Location -ne '/probe/must-not-follow') { throw 'Redirect location lost' }
  Write-Output "PASS: $($testCase.Path) returned $($result.Status), without following redirects"
}
$captures = Invoke-RestMethod -Uri 'http://127.0.0.1:3033/probe-results' -TimeoutSec 5
if ($captures | Where-Object { $_.forbiddenRedirectFollow }) { throw 'Unexpected redirect follow' }
if (@($captures | Where-Object { $_.validSyntheticBody }).Count -ne 3) { throw 'Expected three synthetic POST requests' }
Write-Output 'PASS: exact article sample sent valid synthetic JSON only to loopback; no n8n, API credentials or real workflow used'