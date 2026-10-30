FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/raffle-engine/package.json packages/raffle-engine/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY packages packages
RUN MIGRATION_DATABASE_URL=postgresql://build:build@localhost:5432/build SHADOW_DATABASE_URL=postgresql://build:build@localhost:5432/build_shadow pnpm --filter api prisma:generate && pnpm --filter api build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S raffle && adduser -S raffle -G raffle
COPY --from=build --chown=raffle:raffle /app/node_modules ./node_modules
COPY --from=build --chown=raffle:raffle /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=raffle:raffle /app/packages ./packages
COPY --from=build --chown=raffle:raffle /app/apps/api/src/generated ./apps/api/src/generated
COPY --from=build --chown=raffle:raffle /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=raffle:raffle /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=raffle:raffle /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=raffle:raffle /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
USER raffle
EXPOSE 3001
CMD ["node", "apps/api/dist/src/main.js"]
