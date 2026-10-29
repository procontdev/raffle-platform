$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root
Write-Host "WARNING: this resets the local development schema." -ForegroundColor Yellow
pnpm --filter @raffle/api exec prisma migrate reset --force
pnpm db:seed
