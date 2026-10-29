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

function target(connectionString: string): string {
  const url = new URL(connectionString);
  return `${url.protocol}//${url.hostname}:${url.port || '5432'}${url.pathname}`.toLowerCase();
}

function safeUrl(): string {
  if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for E2E tests');
  if (!e2ePassword) throw new Error('TEST_E2E_PASSWORD is required for E2E tests');
  const url = new URL(testDatabaseUrl);
  if (url.pathname !== '/raffle_platform_test') throw new Error('TEST_DATABASE_URL must point to raffle_platform_test');
  if (applicationDatabaseUrl && target(testDatabaseUrl) === target(applicationDatabaseUrl)) throw new Error('TEST_DATABASE_URL must not point to DATABASE_URL');
  return testDatabaseUrl;
}

const databaseUrl = safeUrl();

describe('Iteration 4 verifiable draw over real PostgreSQL', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let organizationA: { id: string };
  let organizationB: { id: string };
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let brandA: { id: string };
  let brandB: { id: string };
  let participantA: { id: string };
  let participantB: { id: string };
  let raffleA: { id: string };
  let raffleB: { id: string };
  let tokenA: string;
  let tokenB: string;
  let drawId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    await prisma.$connect();
    const suffix = Date.now().toString(36);
    organizationA = await prisma.organization.create({ data: { name: `Draw A ${suffix}`, slug: `draw-a-${suffix}` } });
    organizationB = await prisma.organization.create({ data: { name: `Draw B ${suffix}`, slug: `draw-b-${suffix}` } });
    const passwordHash = await argon2.hash(e2ePassword as string);
    userA = await prisma.user.create({ data: { organizationId: organizationA.id, email: `draw-a-${suffix}@test.local`, passwordHash } });
    userB = await prisma.user.create({ data: { organizationId: organizationB.id, email: `draw-b-${suffix}@test.local`, passwordHash } });
    brandA = await prisma.brand.create({ data: { organizationId: organizationA.id, name: 'Draw Brand A', slug: `draw-a-${suffix}` } });
    brandB = await prisma.brand.create({ data: { organizationId: organizationB.id, name: 'Draw Brand B', slug: `draw-b-${suffix}` } });
    participantA = await prisma.participant.create({ data: { organizationId: organizationA.id, displayName: 'Draw Participant A', email: `draw-a-${suffix}@participant.local`, phone: '900000001' } });
    participantB = await prisma.participant.create({ data: { organizationId: organizationB.id, displayName: 'Draw Participant B', email: `draw-b-${suffix}@participant.local` } });
    raffleA = await prisma.raffle.create({ data: { organizationId: organizationA.id, brandId: brandA.id, createdById: userA.id, name: 'Verifiable Raffle A', slug: `draw-a-${suffix}`, prizeName: 'Prize A', status: 'OPEN' } });
    raffleB = await prisma.raffle.create({ data: { organizationId: organizationB.id, brandId: brandB.id, createdById: userB.id, name: 'Verifiable Raffle B', slug: `draw-b-${suffix}`, prizeName: 'Prize B', status: 'OPEN' } });
    await prisma.raffleEntry.createMany({ data: [
      { organizationId: organizationA.id, raffleId: raffleA.id, participantId: participantA.id, ticketNumber: `DRAW-${suffix}-000001`, source: 'MANUAL', status: 'VALIDATED' },
      { organizationId: organizationA.id, raffleId: raffleA.id, participantId: participantA.id, ticketNumber: `DRAW-${suffix}-000002`, source: 'MANUAL', status: 'PENDING' },
      { organizationId: organizationA.id, raffleId: raffleA.id, participantId: participantA.id, ticketNumber: `DRAW-${suffix}-000003`, source: 'MANUAL', status: 'REJECTED' },
      { organizationId: organizationA.id, raffleId: raffleA.id, participantId: participantA.id, ticketNumber: `DRAW-${suffix}-000004`, source: 'MANUAL', status: 'CANCELLED' },
      { organizationId: organizationB.id, raffleId: raffleB.id, participantId: participantB.id, ticketNumber: `DRAW-${suffix}-000005`, source: 'MANUAL', status: 'VALIDATED' },
    ] });

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
      if (raffleA) await prisma.auditEvent.deleteMany({ where: { raffleId: raffleA.id } });
      if (raffleB) await prisma.auditEvent.deleteMany({ where: { raffleId: raffleB.id } });
      if (raffleA) await prisma.drawResult.deleteMany({ where: { raffleId: raffleA.id } });
      if (raffleB) await prisma.drawResult.deleteMany({ where: { raffleId: raffleB.id } });
      if (raffleA) await prisma.drawSession.deleteMany({ where: { raffleId: raffleA.id } });
      if (raffleB) await prisma.drawSession.deleteMany({ where: { raffleId: raffleB.id } });
      if (raffleA) await prisma.raffleEntry.deleteMany({ where: { raffleId: raffleA.id } });
      if (raffleB) await prisma.raffleEntry.deleteMany({ where: { raffleId: raffleB.id } });
      if (raffleA) await prisma.raffle.deleteMany({ where: { id: raffleA.id } });
      if (raffleB) await prisma.raffle.deleteMany({ where: { id: raffleB.id } });
      if (participantA && participantB) await prisma.participant.deleteMany({ where: { id: { in: [participantA.id, participantB.id] } } });
      if (userA && userB) await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
      if (brandA && brandB) await prisma.brand.deleteMany({ where: { id: { in: [brandA.id, brandB.id] } } });
      if (organizationA && organizationB) await prisma.organization.deleteMany({ where: { id: { in: [organizationA.id, organizationB.id] } } });
      await prisma.$disconnect();
    }
  });

  it('closes with only VALIDATED entries and protects the snapshot', async () => {
    const response = await request(server).post(`/api/v1/raffles/${raffleA.id}/close`).set('Authorization', `Bearer ${tokenA}`).expect(201);
    expect(response.body.status).toBe('READY');
    expect(response.body.participantSnapshotHash).toBeDefined();
    expect(response.body.seedCommitment).toBeDefined();
    expect(response.body.secretSeed).toBeUndefined();
    const session = await prisma.drawSession.findUnique({ where: { raffleId: raffleA.id } });
    expect(session?.participantSnapshot).toEqual([{ entryId: expect.any(String), ticketNumber: expect.stringContaining('000001') }]);
    expect(session?.secretSeed).toBeDefined();
    await request(server).patch(`/api/v1/raffles/${raffleA.id}`).set('Authorization', `Bearer ${tokenA}`).send({ name: 'Cannot edit after ready' }).expect(400);
    const validatedEntry = await prisma.raffleEntry.findFirstOrThrow({ where: { raffleId: raffleA.id, status: 'VALIDATED' } });
    await request(server).patch(`/api/v1/raffles/${raffleA.id}/entries/${validatedEntry.id}`).set('Authorization', `Bearer ${tokenA}`).send({ status: 'CANCELLED' }).expect(400);
    await request(server).post(`/api/v1/raffles/${raffleA.id}/entries`).set('Authorization', `Bearer ${tokenA}`).send({ participantId: participantA.id, quantity: 1, source: 'MANUAL' }).expect(400);
    const csv = 'name,phone,email,source,quantity,payment_reference,payment_amount\nBlocked,,,MANUAL,1,,0';
    await request(server).post(`/api/v1/raffles/${raffleA.id}/import`).set('Authorization', `Bearer ${tokenA}`).attach('file', Buffer.from(csv), 'blocked.csv').expect(400);
  });

  it('hides Tenant B from Tenant A during close and draw', async () => {
    await request(server).post(`/api/v1/raffles/${raffleB.id}/close`).set('Authorization', `Bearer ${tokenA}`).expect(404);
    await request(server).post(`/api/v1/raffles/${raffleB.id}/draw`).set('Authorization', `Bearer ${tokenA}`).expect(404);
    const closeResponses = await Promise.all([
      request(server).post(`/api/v1/raffles/${raffleB.id}/close`).set('Authorization', `Bearer ${tokenB}`),
      request(server).post(`/api/v1/raffles/${raffleB.id}/close`).set('Authorization', `Bearer ${tokenB}`),
    ]);
    expect(closeResponses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(closeResponses.filter((response) => response.status === 409)).toHaveLength(1);
  });

  it('draws once, remains idempotently protected, and verifies publicly', async () => {
    const responses = await Promise.all([
      request(server).post(`/api/v1/raffles/${raffleA.id}/draw`).set('Authorization', `Bearer ${tokenA}`),
      request(server).post(`/api/v1/raffles/${raffleA.id}/draw`).set('Authorization', `Bearer ${tokenA}`),
    ]);
    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
    const completed = responses.find((response) => response.status === 201);
    drawId = completed?.body.id;
    expect(completed?.body.revealedSeed).toBeDefined();
    expect(completed?.body.winnerTicketNumber).toBeDefined();
    const raffle = await request(server).get(`/api/v1/raffles/${raffleA.id}`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(raffle.body.status).toBe('COMPLETED');
    const verification = await request(server).get(`/api/v1/public/draws/${drawId}/verify`).expect(200);
    expect(verification.body.verificationStatus).toBe('VALID');
    expect(verification.body.participantSnapshot).toHaveLength(1);
    expect(JSON.stringify(verification.body)).not.toMatch(/phone|email|paymentReference|paymentAmount|fullName/);
    expect(await prisma.drawResult.count({ where: { raffleId: raffleA.id } })).toBe(1);
    await request(server).post(`/api/v1/raffles/${raffleA.id}/draw`).set('Authorization', `Bearer ${tokenA}`).expect(409);
  });
});
