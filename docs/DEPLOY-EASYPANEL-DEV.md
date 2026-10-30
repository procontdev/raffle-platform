# EasyPanel DEV deployment

## Services

Create three services in one private network:

1. PostgreSQL 15+, database `raffle_platform_dev`.
2. API from repository root using `apps/api/Dockerfile`, internal port `3001`.
3. Web from repository root using `apps/web/Dockerfile`, internal port `3002`.

Expose the web service at a domain such as `raffle-dev.example.com` and the API at `api-raffle-dev.example.com`. EasyPanel should terminate HTTPS and forward WebSocket upgrades to the API. The live namespace is `/live` and uses Socket.IO polling fallback plus WSS when HTTPS is enabled.

## API environment

Set `NODE_ENV=production`, `API_HOST=0.0.0.0`, `API_PORT=3001`, `DATABASE_URL` with the restricted runtime role, `MIGRATION_DATABASE_URL` with the migrator role, a long `JWT_SECRET`, `JWT_EXPIRES_IN=1h`, and `CORS_ORIGIN=https://raffle-dev.example.com`. Keep database URLs and JWT secret server-only.

## Web build arguments

Set `NEXT_PUBLIC_API_URL=https://api-raffle-dev.example.com` and `NEXT_PUBLIC_WS_URL=https://api-raffle-dev.example.com` as build arguments. They are public values, not secrets.

## Release order

1. Build and deploy the API image.
2. Run `pnpm --filter api exec prisma migrate deploy` against `MIGRATION_DATABASE_URL` as a one-off migration command or EasyPanel pre-deploy hook.
3. Start/restart the API and verify `/health`, `/ready`, and `/livez`.
4. Build and deploy the web image.
5. Verify login, CORS, public live display and WebSocket upgrade.

Do not run `prisma migrate dev`, reset the database, or run the seed automatically on every deployment. Run the idempotent DEV seed explicitly when the initial tenant/admin is needed.

## Health checks and headers

Use `GET /ready` as the API readiness check. `/health` reports dependency health and `/livez` only reports process liveness. The API adds `X-Request-Id`, `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options: SAMEORIGIN`; the latter keeps the OBS Browser Source usable without allowing arbitrary framing.
