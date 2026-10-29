import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

loadEnv({ path: '../../.env' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: 'fam' },
    update: {},
    create: { name: 'Frecuencia Alterna Media', slug: 'fam' },
  });

  await prisma.brand.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'fam' } },
    update: {},
    create: { organizationId: organization.id, name: 'FAM', slug: 'fam' },
  });

  console.log(`Seed OK: organization=${organization.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
