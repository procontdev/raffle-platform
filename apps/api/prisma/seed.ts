import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import * as argon2 from 'argon2';

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

  const brands = [
    ['FAM', 'fam'], ['HD', 'hd'], ['NPC', 'npc'], ['SA', 'sa'], ['ConspiraRock', 'conspirarock'],
  ];
  for (const [name, slug] of brands) {
    await prisma.brand.upsert({
      where: { organizationId_slug: { organizationId: organization.id, slug } },
      update: { name },
      create: { organizationId: organization.id, name, slug },
    });
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) throw new Error('SEED_ADMIN_PASSWORD is required');
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@fam.local').toLowerCase();
  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email } },
    update: { passwordHash: await argon2.hash(adminPassword), role: 'ADMIN', status: 'ACTIVE' },
    create: {
      organizationId: organization.id,
      email,
      passwordHash: await argon2.hash(adminPassword),
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`Seed OK: organization=${organization.slug}, brands=${brands.length}, admin=${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
