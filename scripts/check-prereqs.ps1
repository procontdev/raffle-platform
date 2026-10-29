$ErrorActionPreference = "Stop"

Write-Host "== Raffle Platform / prerequisites ==" -ForegroundColor Cyan

$checks = @(
  @{ Name = "git"; Command = "git" },
  @{ Name = "node"; Command = "node" },
  @{ Name = "corepack"; Command = "corepack" },
  @{ Name = "psql"; Command = "psql" }
)

foreach ($check in $checks) {
  if (Get-Command $check.Command -ErrorAction SilentlyContinue) {
    Write-Host ("[OK] " + $check.Name) -ForegroundColor Green
  } else {
    Write-Host ("[MISSING] " + $check.Name) -ForegroundColor Red
  }
}

if (Get-Command node -ErrorAction SilentlyContinue) { node --version }
if (Get-Command psql -ErrorAction SilentlyContinue) { psql --version }
