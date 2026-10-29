import { config as loadEnv } from 'dotenv';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';

loadEnv({ path: '../../.env' });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const applicationDatabaseUrl = process.env.DATABASE_URL;
const e2ePassword = process.env.TEST_E2E_PASSWORD;

function databaseTarget(connectionString: string): string {
  const url = new URL(connectionString);
  return `${url.protocol}//${url.hostname}:${url.port || '5432'}${url.pathname}`.toLowerCase();
}

function assertSafeTestDatabase(): string {
  if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for E2E tests');
  if (!e2ePassword) throw new Error('TEST_E2E_PASSWORD is required for E2E tests');
  const testUrl = new URL(testDatabaseUrl);
  if (testUrl.pathname !== '/raffle_platform_test') throw new Error('TEST_DATABASE_URL must point to raffle_platform_test');
  if (applicationDatabaseUrl && databaseTarget(testDatabaseUrl) === databaseTarget(applicationDatabaseUrl)) {
    throw new Error('TEST_DATABASE_URL must not point to the same database as DATABASE_URL');
  }
  return testDatabaseUrl;
}

const safeTestDatabaseUrl = assertSafeTestDatabase();

describe('Iteration 2B real PostgreSQL HTTP integration', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaClient;
  let organizationA: { id: string };
  let organizationB: { id: string };
  let userA: { id: string; email: string };
  let userB: { id: string };
  let brandA: { id: string };
  let brandB: { id: string };
  let raffleB: { id: string };
  let raffleAId: string;
  let tokenA: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = safeTestDatabaseUrl;
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: safeTestDatabaseUrl }) });
    await prisma.$connect();

    const suffix = Date.now().toString(36);
    organizationA = await prisma.organization.create({ data: { name: `Organization A ${suffix}`, slug: `e2e-a-${suffix}` } });
    organizationB = await prisma.organization.create({ data: { name: `Organization B ${suffix}`, slug: `e2e-b-${suffix}` } });
    const passwordHash = await argon2.hash(e2ePassword as string);
    userA = await prisma.user.create({ data: { organizationId: organizationA.id, email: `admin-a-${suffix}@test.local`, passwordHash, role: 'ADMIN', status: 'ACTIVE' } });
    userB = await prisma.user.create({ data: { organizationId: organizationB.id, email: `admin-b-${suffix}@test.local`, passwordHash, role: 'ADMIN', status: 'ACTIVE' } });
    brandA = await prisma.brand.create({ data: { organizationId: organizationA.id, name: 'Brand A', slug: `brand-a-${suffix}` } });
    brandB = await prisma.brand.create({ data: { organizationId: organizationB.id, name: 'Brand B', slug: `brand-b-${suffix}` } });
    raffleB = await prisma.raffle.create({ data: { organizationId: organizationB.id, brandId: brandB.id, createdById: userB.id, name: 'Raffle B', slug: `raffle-b-${suffix}`, prizeName: 'Prize B' } });

    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    httpServer = app.getHttpServer() as Server;

    const login = await request(httpServer).post('/api/v1/auth/login').send({ email: userA.email, password: e2ePassword });
    expect(login.status).toBe(201);
    tokenA = login.body.accessToken;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) {
      if (raffleAId) await prisma.raffle.deleteMany({ where: { id: { in: [raffleAId] } } });
      if (raffleB) await prisma.raffle.deleteMany({ where: { id: raffleB.id } });
      if (userA && userB) await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
      if (brandA && brandB) await prisma.brand.deleteMany({ where: { id: { in: [brandA.id, brandB.id] } } });
      if (organizationA && organizationB) await prisma.organization.deleteMany({ where: { id: { in: [organizationA.id, organizationB.id] } } });
      await prisma.$disconnect();
    }
  });

  it('rejects a protected endpoint without a token', async () => {
    await request(httpServer).get('/api/v1/organization').expect(401);
  });

  it('logs in against PostgreSQL and never returns passwordHash', async () => {
    const response = await request(httpServer).post('/api/v1/auth/login').send({ email: userA.email, password: e2ePassword });
    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ id: userA.id, organizationId: organizationA.id });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('returns Tenant A organization and only Tenant A brands', async () => {
    const organization = await request(httpServer).get('/api/v1/organization').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(organization.body.id).toBe(organizationA.id);
    expect(JSON.stringify(organization.body)).not.toContain('passwordHash');

    const brands = await request(httpServer).get('/api/v1/brands').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(brands.body).toHaveLength(1);
    expect(brands.body[0].id).toBe(brandA.id);
    expect(JSON.stringify(brands.body)).not.toContain('passwordHash');
  });

  it('hides Tenant B brand from Tenant A', async () => {
    await request(httpServer).get(`/api/v1/brands/${brandB.id}`).set('Authorization', `Bearer ${tokenA}`).expect(404);
  });

  it('creates and reads a raffle in Tenant A', async () => {
    const created = await request(httpServer)
      .post('/api/v1/raffles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Raffle A', slug: `raffle-a-${Date.now()}`, prizeName: 'Prize A', brandId: brandA.id })
      .expect(201);
    raffleAId = created.body.id;
    expect(created.body.organizationId).toBe(organizationA.id);
    expect(JSON.stringify(created.body)).not.toContain('passwordHash');

    const fetched = await request(httpServer).get(`/api/v1/raffles/${raffleAId}`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(fetched.body.id).toBe(raffleAId);
    expect(fetched.body.organizationId).toBe(organizationA.id);
    expect(JSON.stringify(fetched.body)).not.toContain('passwordHash');
  });

  it('hides and cannot modify Tenant B raffle from Tenant A', async () => {
    await request(httpServer).get(`/api/v1/raffles/${raffleB.id}`).set('Authorization', `Bearer ${tokenA}`).expect(404);
    await request(httpServer).patch(`/api/v1/raffles/${raffleB.id}`).set('Authorization', `Bearer ${tokenA}`).send({ name: 'Cross tenant' }).expect(404);
  });
});
