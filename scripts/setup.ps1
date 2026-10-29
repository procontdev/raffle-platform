$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "== Raffle Platform setup ==" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js not found. Install Node 24 LTS." }
if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) { throw "Corepack not found." }
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env"; Write-Host "Created .env from .env.example. Edit passwords before database commands." -ForegroundColor Yellow }

node --version
corepack enable
corepack prepare pnpm@10.18.3 --activate
pnpm --version
pnpm install
pnpm db:generate

Write-Host "Dependencies installed and Prisma Client generated." -ForegroundColor Green
Write-Host "Next: bootstrap PostgreSQL (if not already done), then run pnpm db:migrate and pnpm db:seed." -ForegroundColor Yellow
