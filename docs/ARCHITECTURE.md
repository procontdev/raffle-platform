# Architecture

## Strategy
Modular monolith for the MVP. No microservices until load, team boundaries, or independent deployment make them necessary.

## Tenant hierarchy
PLATFORM -> ORGANIZATION -> BRAND -> RAFFLE

FAM is the pilot organization. Nothing in the raffle engine may depend on FAM-specific branding or rules.

## Applications
- `apps/api`: NestJS HTTP/WebSocket API.
- `apps/web`: Next.js admin/public/OBS surfaces.

## Packages
- `packages/contracts`: shared DTO/event contracts.
- `packages/raffle-engine`: pure deterministic raffle and verification logic.
- `packages/shared`: non-domain utilities.

## Database
PostgreSQL is the system of record. Prisma migrations own application tables. Bootstrap SQL only creates DB roles, database, and grants.

## Security boundaries
Application runtime uses `raffle_platform_app`; schema migrations use `raffle_platform_migrator`. Runtime should not have DDL permissions.
