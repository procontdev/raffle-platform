import { config as loadEnv } from 'dotenv';
import { Test } from '@nestjs/testing';
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

function safeTestUrl(): string {
  if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for E2E tests');
  if (!e2ePassword) throw new Error('TEST_E2E_PASSWORD is required for E2E tests');
  const url = new URL(testDatabaseUrl);
  if (url.pathname !== '/raffle_platform_test') throw new Error('TEST_DATABASE_URL must point to raffle_platform_test');
  if (applicationDatabaseUrl && databaseTarget(testDatabaseUrl) === databaseTarget(applicationDatabaseUrl)) throw new Error('TEST_DATABASE_URL must not point to DATABASE_URL');
  return testDatabaseUrl;
}

const safeUrl = safeTestUrl();

describe('Iteration 3 participants and raffle entries over real PostgreSQL', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let orgA: { id: string };
  let orgB: { id: string };
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let brandA: { id: string };
  let brandB: { id: string };
  let raffleAId: string;
  let raffleB: { id: string };
  let participantAId: string;
  let participantB: { id: string };
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = safeUrl;
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: safeUrl }) });
    await prisma.$connect();
    const suffix = Date.now().toString(36);
    orgA = await prisma.organization.create({ data: { name: `Entries A ${suffix}`, slug: `entries-a-${suffix}` } });
    orgB = await prisma.organization.create({ data: { name: `Entries B ${suffix}`, slug: `entries-b-${suffix}` } });
    const passwordHash = await argon2.hash(e2ePassword as string);
    userA = await prisma.user.create({ data: { organizationId: orgA.id, email: `entries-a-${suffix}@test.local`, passwordHash } });
    userB = await prisma.user.create({ data: { organizationId: orgB.id, email: `entries-b-${suffix}@test.local`, passwordHash } });
    brandA = await prisma.brand.create({ data: { organizationId: orgA.id, name: 'Entries Brand A', slug: `entries-a-${suffix}` } });
    brandB = await prisma.brand.create({ data: { organizationId: orgB.id, name: 'Entries Brand B', slug: `entries-b-${suffix}` } });
    participantB = await prisma.participant.create({ data: { organizationId: orgB.id, displayName: 'Tenant B Participant', email: `b-${suffix}@test.local` } });
    raffleB = await prisma.raffle.create({ data: { organizationId: orgB.id, brandId: brandB.id, createdById: userB.id, name: 'Raffle B', slug: `entries-b-${suffix}`, prizeName: 'Prize B' } });

    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    server = app.getHttpServer() as Server;
    tokenA = (await request(server).post('/api/v1/auth/login').send({ email: userA.email, password: e2ePassword }).expect(201)).body.accessToken;
    tokenB = (await request(server).post('/api/v1/auth/login').send({ email: userB.email, password: e2ePassword }).expect(201)).body.accessToken;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) {
      if (raffleAId) await prisma.raffleEntry.deleteMany({ where: { raffleId: raffleAId } });
      if (raffleB) await prisma.raffleEntry.deleteMany({ where: { raffleId: raffleB.id } });
      if (raffleAId) await prisma.raffle.deleteMany({ where: { id: raffleAId } });
      if (raffleB) await prisma.raffle.deleteMany({ where: { id: raffleB.id } });
      if (orgA && orgB) await prisma.participant.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
      if (userA && userB) await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
      if (brandA && brandB) await prisma.brand.deleteMany({ where: { id: { in: [brandA.id, brandB.id] } } });
      if (orgA && orgB) await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
      await prisma.$disconnect();
    }
  });

  it('creates a participant and three independent entries with unique tickets', async () => {
    const participant = await request(server).post('/api/v1/participants').set('Authorization', `Bearer ${tokenA}`).send({ displayName: 'Carlos Perez', email: 'carlos@test.local' }).expect(201);
    participantAId = participant.body.id;
    const raffle = await request(server).post('/api/v1/raffles').set('Authorization', `Bearer ${tokenA}`).send({ name: 'Raffle A', slug: `entries-raffle-a-${Date.now()}`, prizeName: 'Prize A', brandId: brandA.id }).expect(201);
    raffleAId = raffle.body.id;
    const created = await request(server).post(`/api/v1/raffles/${raffleAId}/entries`).set('Authorization', `Bearer ${tokenA}`).send({ participantId: participantAId, quantity: 3, source: 'YAPE', paymentReference: 'YAPE-1', paymentAmount: 15 }).expect(201);
    expect(created.body).toHaveLength(3);
    expect(new Set(created.body.map((entry: { ticketNumber: string }) => entry.ticketNumber)).size).toBe(3);
    expect(created.body.every((entry: { ticketNumber: string }) => /^ENTRIES-A-[A-Z0-9]+-\d{6}$/.test(entry.ticketNumber))).toBe(true);
  });

  it('rejects cross-tenant participant use and entry access', async () => {
    await request(server).post(`/api/v1/raffles/${raffleAId}/entries`).set('Authorization', `Bearer ${tokenA}`).send({ participantId: participantB.id, quantity: 1, source: 'MANUAL' }).expect(404);
    await request(server).get(`/api/v1/raffles/${raffleB.id}/entries`).set('Authorization', `Bearer ${tokenA}`).expect(404);
  });

  it('imports valid CSV rows and reports invalid rows without aborting the file', async () => {
    const csv = 'name,phone,email,source,quantity,payment_reference,payment_amount\nMaria Torres,,maria@test.local,YOUTUBE_MEMBER,2,,0\nInvalid,,,BAD,0,,nope\n';
    const result = await request(server).post(`/api/v1/raffles/${raffleAId}/import`).set('Authorization', `Bearer ${tokenA}`).attach('file', Buffer.from(csv), 'entries.csv').expect(201);
    expect(result.body).toMatchObject({ totalRows: 2, importedRows: 1, rejectedRows: 1, entriesCreated: 2 });
    expect(result.body.errors).toHaveLength(1);
  });

  it('allows a valid transition and rejects an invalid transition', async () => {
    const entries = await request(server).get(`/api/v1/raffles/${raffleAId}/entries`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    const pending = entries.body[0].id;
    await request(server).patch(`/api/v1/raffles/${raffleAId}/entries/${pending}`).set('Authorization', `Bearer ${tokenA}`).send({ status: 'VALIDATED' }).expect(200);
    await request(server).patch(`/api/v1/raffles/${raffleAId}/entries/${pending}`).set('Authorization', `Bearer ${tokenA}`).send({ status: 'PENDING' }).expect(400);
  });

  it('does not allow Tenant A to access Tenant B raffle or participant', async () => {
    await request(server).get(`/api/v1/participants/${participantB.id}`).set('Authorization', `Bearer ${tokenA}`).expect(404);
    await request(server).post(`/api/v1/raffles/${raffleB.id}/entries`).set('Authorization', `Bearer ${tokenA}`).send({ participantId: participantB.id, quantity: 1, source: 'IMPORT' }).expect(404);
    await request(server).get(`/api/v1/raffles/${raffleB.id}/entries`).set('Authorization', `Bearer ${tokenA}`).expect(404);
    expect(tokenB).toBeDefined();
  });
});
