param(
  [string]$PostgresUser = "postgres",
  [string]$PostgresHost = "localhost",
  [int]$PostgresPort = 5432
)
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Write-Host "== Raffle Platform / PostgreSQL bootstrap ==" -ForegroundColor Cyan
Write-Host "Edit database/bootstrap/001-create-roles.sql and .env before continuing." -ForegroundColor Yellow
psql -h $PostgresHost -p $PostgresPort -U $PostgresUser -d postgres -v ON_ERROR_STOP=1 -f "$root/database/bootstrap/001-create-roles.sql"
psql -h $PostgresHost -p $PostgresPort -U $PostgresUser -d postgres -v ON_ERROR_STOP=1 -f "$root/database/bootstrap/002-create-database.sql"
psql -h $PostgresHost -p $PostgresPort -U $PostgresUser -d raffle_platform -v ON_ERROR_STOP=1 -f "$root/database/bootstrap/003-grants.sql"
Write-Host "Database bootstrap completed." -ForegroundColor Green
