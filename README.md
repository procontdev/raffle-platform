# Raffle Platform

MVP foundation for a verifiable, multi-organization and multi-brand raffle platform.

## Stack
- Node.js 24 LTS
- pnpm workspaces
- Next.js 16
- NestJS 11
- Prisma ORM 7
- PostgreSQL 15+

## First local setup
1. Install Node.js 24 LTS and enable Corepack.
2. Confirm PostgreSQL is running locally.
3. Copy `.env.example` to `.env` and replace passwords.
4. Run the database bootstrap scripts as a PostgreSQL administrator.
5. Run `corepack enable` and then `pnpm install`.
6. Run `pnpm db:generate`.
7. Run `pnpm db:migrate`.
8. Run `pnpm db:seed`.
9. Run `pnpm dev`.

Or follow `docs/DEVELOPMENT.md` and use the PowerShell helper scripts.

## URLs
- Web: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/api/docs
- Health: http://localhost:3001/health

## Important
This repository intentionally keeps the raffle engine isolated from FAM-specific concepts. FAM is the pilot organization, not a hardcoded tenant.
