# Local Development - Windows

## Requirements
- Windows 10/11
- Node.js 24 LTS (>=24.11)
- PostgreSQL 15+
- psql in PATH
- Git

## 1. Prepare environment
From the repository root:

```powershell
Copy-Item .env.example .env
```

Replace all `CHANGE_ME_*` passwords in `.env` and `database/bootstrap/001-create-roles.sql` with the same values.

## 2. Create PostgreSQL roles/database

```powershell
.\scripts\bootstrap-db.ps1
```

The command may ask for your local PostgreSQL administrator password.

## 3. Install dependencies

```powershell
.\scripts\setup.ps1
```

## 4. Create schema and seed

```powershell
pnpm db:migrate -- --name init
pnpm db:seed
```

## 5. Start development

```powershell
.\scripts\dev.ps1
```

## 6. Validate
- http://localhost:3000
- http://localhost:3001/health
- http://localhost:3001/api/docs

Expected `/health` response includes `status=ok` and `database=ok`.
