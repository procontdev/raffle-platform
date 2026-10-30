# DEV backup and recovery

Back up PostgreSQL with the migrator or database administrator role, for example:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=raffle_platform_dev.dump
```

Restore into an empty recovery database with `pg_restore --clean --if-exists` only after verifying the target. Preserve `.env`/EasyPanel secrets, migration files, Docker image versions, and the PostgreSQL dump. Never lose `raffle_entries`, `draw_sessions`, `draw_results`, `audit_events`, or the revealed verification data.

After restore, run `prisma migrate deploy` if the image contains newer migrations, start the API, check `/ready`, log in, open a known public live URL, and verify a completed draw returns VALID. Do not reset the DEV database as part of recovery.
