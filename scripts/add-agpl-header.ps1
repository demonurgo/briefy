# (c) 2026 Briefy contributors — AGPL-3.0
# Idempotent AGPL-3.0 header injector (PowerShell variant — native Windows fallback).
# Usage: pwsh scripts/add-agpl-header.ps1  (or)  powershell -File scripts/add-agpl-header.ps1
# Mirrors scripts/add-agpl-header.sh for devs without git-bash/WSL.

$ErrorActionPreference = 'Stop'

$HeaderText = '// (c) 2026 Briefy contributors — AGPL-3.0'
$Marker     = 'Briefy contributors'

$phpFiles = @()
foreach ($root in @('app', 'database/migrations', 'config')) {
  if (Test-Path $root) {
    $phpFiles += Get-ChildItem -Path $root -Recurse -Filter '*.php' -File | Select-Object -ExpandProperty FullName
  }
}

$tsFiles = @()
if (Test-Path 'resources/js') {
  $tsFiles += Get-ChildItem -Path 'resources/js' -Recurse -Include '*.ts','*.tsx' -File | Select-Object -ExpandProperty FullName
}

$added = 0
$skipped = 0

# UTF-8 without BOM — matches bash output byte-for-byte to avoid spurious diffs.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Inject-Php($path) {
  $text = Get-Content -LiteralPath $path -Raw -Encoding UTF8
  if ($text -match [regex]::Escape($script:Marker)) { $script:skipped++; return }

  $lines = Get-Content -LiteralPath $path -Encoding UTF8
  if ($lines.Count -eq 0 -or $lines[0] -notmatch '^<\?php') {
    Write-Warning "skip (no <?php opener): $path"
    $script:skipped++
    return
  }

  $new = @($lines[0], $script:HeaderText) + $lines[1..($lines.Count - 1)]
  [System.IO.File]::WriteAllLines($path, $new, $script:utf8NoBom)
  $script:added++
}

function Inject-Ts($path) {
  $text = Get-Content -LiteralPath $path -Raw -Encoding UTF8
  if ($text -match [regex]::Escape($script:Marker)) { $script:skipped++; return }

  $lines = Get-Content -LiteralPath $path -Encoding UTF8
  $new = @($script:HeaderText) + $lines
  [System.IO.File]::WriteAllLines($path, $new, $script:utf8NoBom)
  $script:added++
}

foreach ($f in $phpFiles) { Inject-Php -path $f }
foreach ($f in $tsFiles)  { Inject-Ts  -path $f }

Write-Host "AGPL header injection complete. Added: $added. Skipped (already headered or non-standard): $skipped."

# CI-friendly verification.
$missing = @()
foreach ($f in ($phpFiles + $tsFiles)) {
  if (-not (Select-String -Path $f -Pattern $Marker -Quiet)) { $missing += $f }
}
if ($missing.Count -gt 0) {
  Write-Error ("FAIL: the following files are missing the AGPL header:`n" + ($missing -join "`n"))
  exit 1
}
