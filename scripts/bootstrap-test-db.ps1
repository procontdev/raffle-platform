param(
  [string]$PostgresUser = "postgres",
  [string]$PostgresHost = "localhost",
  [int]$PostgresPort = 5432
)
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Write-Host "== Raffle Platform / PostgreSQL test database ==" -ForegroundColor Cyan
Write-Host "The test database is created separately from raffle_platform." -ForegroundColor Yellow
psql -h $PostgresHost -p $PostgresPort -U $PostgresUser -d postgres -v ON_ERROR_STOP=1 -f "$root/database/bootstrap/004-create-test-database.sql"
psql -h $PostgresHost -p $PostgresPort -U $PostgresUser -d raffle_platform_test -v ON_ERROR_STOP=1 -f "$root/database/bootstrap/003-grants.sql"
Write-Host "Test database bootstrap completed. Set TEST_DATABASE_URL in .env, then apply migrations." -ForegroundColor Green
