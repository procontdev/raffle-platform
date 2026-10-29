# Database Strategy

## Roles
- `raffle_platform_migrator`: owner/migration DDL role.
- `raffle_platform_app`: runtime CRUD role.
- `raffle_platform_readonly`: future reporting/support role.

## Ownership
Prisma migrations run using `MIGRATION_DATABASE_URL` and create objects owned by the migrator role. The API uses `DATABASE_URL` with the restricted application role.

## Initial domain tables
The bootstrap schema starts with organizations, brands, users, raffles and participants. Entries, draw sessions, results and audit events are added in the next domain iterations so each step can be reviewed and tested independently.
