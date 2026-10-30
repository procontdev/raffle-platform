FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_WS_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
RUN pnpm --filter web build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002
RUN corepack enable
RUN addgroup -S raffle && adduser -S raffle -G raffle
COPY --from=build --chown=raffle:raffle /app/node_modules ./node_modules
COPY --from=build --chown=raffle:raffle /app/apps/web/.next ./apps/web/.next
COPY --from=build --chown=raffle:raffle /app/apps/web/package.json ./apps/web/package.json
USER raffle
EXPOSE 3002
CMD ["pnpm", "--dir", "apps/web", "start"]
