import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// pnpm executes this package with apps/api as cwd; the project .env lives at repository root.
loadEnv({ path: '../../.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
  url: env("MIGRATION_DATABASE_URL"),
  shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
},
});
