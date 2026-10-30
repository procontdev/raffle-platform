import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  RAFFLE_ENGINE_VERSION,
  calculateResultHash,
  calculateWinnerIndex,
  canonicalizeSnapshot,
  commitSeed,
  generateSecretSeed,
  hashSnapshot,
  selectWinner,
  verifyDraw,
  type SnapshotEntry,
} from '@raffle/raffle-engine';
import { logEvent } from '../common/structured-log.js';

@Injectable()
export class DrawService {
  constructor(private readonly prisma: PrismaService) {}

  async close(organizationId: string, raffleId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockRaffle(tx, organizationId, raffleId);
      const raffle = await tx.raffle.findFirst({ where: { id: raffleId, organizationId }, select: { id: true, status: true } });
      if (!raffle) throw new NotFoundException('Raffle not found');
      if (raffle.status !== 'OPEN') throw new ConflictException('Only OPEN raffles can be closed');
      const validatedEntries = await tx.raffleEntry.findMany({ where: { organizationId, raffleId, status: 'VALIDATED' }, select: { id: true, ticketNumber: true }, orderBy: [{ ticketNumber: 'asc' }, { id: 'asc' }] });
      if (validatedEntries.length === 0) throw new ConflictException('At least one VALIDATED entry is required');
      const snapshot = canonicalizeSnapshot(validatedEntries.map((entry) => ({ entryId: entry.id, ticketNumber: entry.ticketNumber })));
      const participantSnapshotHash = hashSnapshot(snapshot);
      const secretSeed = generateSecretSeed();
      const seedCommitment = commitSeed(secretSeed);
      const updated = await tx.raffle.updateMany({ where: { id: raffleId, organizationId, status: 'OPEN' }, data: { status: 'READY' } });
      if (updated.count !== 1) throw new ConflictException('Raffle changed while closing');
      const session = await tx.drawSession.create({ data: { organizationId, raffleId, participantSnapshot: snapshot as unknown as Prisma.InputJsonValue, participantSnapshotHash, seedCommitment, secretSeed, algorithmVersion: RAFFLE_ENGINE_VERSION, status: 'READY' } });
      await tx.auditEvent.create({ data: { organizationId, raffleId, type: 'RAFFLE_CLOSED', payload: { algorithmVersion: RAFFLE_ENGINE_VERSION, participantSnapshotHash, validatedEntryCount: snapshot.length } as Prisma.InputJsonValue } });
      logEvent('RAFFLE_CLOSED', { organizationId, raffleId });
      return this.publicSession(session);
    });
  }

  async draw(organizationId: string, raffleId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockRaffle(tx, organizationId, raffleId);
      const raffle = await tx.raffle.findFirst({ where: { id: raffleId, organizationId }, select: { id: true, status: true } });
      if (!raffle) throw new NotFoundException('Raffle not found');
      if (raffle.status === 'COMPLETED') throw new ConflictException('Raffle already has a completed draw');
      if (raffle.status !== 'READY') throw new ConflictException('Only READY raffles can be drawn');
      const session = await tx.drawSession.findFirst({ where: { organizationId, raffleId }, include: { result: true } });
      if (!session) throw new ConflictException('Draw session not found');
      if (session.result || session.status === 'COMPLETED') throw new ConflictException('Draw already completed');
      const snapshot = this.readSnapshot(session.participantSnapshot);
      if (hashSnapshot(snapshot) !== session.participantSnapshotHash) throw new ConflictException('Stored snapshot integrity check failed');
      const currentEntries = await tx.raffleEntry.findMany({ where: { organizationId, raffleId, status: 'VALIDATED' }, select: { id: true, ticketNumber: true }, orderBy: [{ ticketNumber: 'asc' }, { id: 'asc' }] });
      const currentSnapshot = canonicalizeSnapshot(currentEntries.map((entry) => ({ entryId: entry.id, ticketNumber: entry.ticketNumber })));
      if (hashSnapshot(currentSnapshot) !== session.participantSnapshotHash || currentSnapshot.length !== snapshot.length) throw new ConflictException('Entries changed after raffle close');
      const started = await tx.drawSession.updateMany({ where: { id: session.id, organizationId, status: 'READY' }, data: { status: 'DRAWING', startedAt: new Date() } });
      if (started.count !== 1) throw new ConflictException('Draw is already in progress');
      await tx.auditEvent.create({ data: { organizationId, raffleId, type: 'DRAW_STARTED', payload: { algorithmVersion: session.algorithmVersion } as Prisma.InputJsonValue } });
      logEvent('DRAW_STARTED', { organizationId, raffleId });
      const resultHash = calculateResultHash({ algorithmVersion: session.algorithmVersion, raffleId, participantSnapshotHash: session.participantSnapshotHash, secretSeed: session.secretSeed });
      const winnerIndex = calculateWinnerIndex(resultHash, snapshot.length);
      const winner = selectWinner(snapshot, winnerIndex);
      const winnerEntry = await tx.raffleEntry.findFirst({ where: { id: winner.entryId, organizationId, raffleId, ticketNumber: winner.ticketNumber, status: 'VALIDATED' } });
      if (!winnerEntry) throw new ConflictException('Winner entry is not part of the closed snapshot');
      const result = await tx.drawResult.create({ data: { organizationId, drawSessionId: session.id, raffleId, winnerEntryId: winnerEntry.id, winnerIndex, resultHash } });
      await tx.drawSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await tx.raffle.updateMany({ where: { id: raffleId, organizationId, status: 'READY' }, data: { status: 'COMPLETED' } });
      await tx.auditEvent.create({ data: { organizationId, raffleId, type: 'DRAW_COMPLETED', payload: { algorithmVersion: session.algorithmVersion, winnerIndex, resultHash } as Prisma.InputJsonValue } });
      logEvent('DRAW_COMPLETED', { organizationId, raffleId, drawId: result.id });
      return { ...result, algorithmVersion: session.algorithmVersion, revealedSeed: session.secretSeed, winnerTicketNumber: winnerEntry.ticketNumber };
    });
  }

  async verify(drawId: string) {
    const result = await this.prisma.drawResult.findFirst({ where: { id: drawId }, include: { drawSession: true, winnerEntry: true } });
    if (!result || result.drawSession.status !== 'COMPLETED') throw new NotFoundException('Completed draw not found');
    const snapshot = this.readSnapshot(result.drawSession.participantSnapshot);
    const verification = verifyDraw({ algorithmVersion: result.drawSession.algorithmVersion, raffleId: result.raffleId, participantSnapshot: snapshot, participantSnapshotHash: result.drawSession.participantSnapshotHash, seedCommitment: result.drawSession.seedCommitment, revealedSeed: result.drawSession.secretSeed, resultHash: result.resultHash, winnerIndex: result.winnerIndex, winnerTicketNumber: result.winnerEntry.ticketNumber });
    return { drawId: result.id, raffleId: result.raffleId, algorithmVersion: result.drawSession.algorithmVersion, participantSnapshot: snapshot, participantSnapshotHash: result.drawSession.participantSnapshotHash, seedCommitment: result.drawSession.seedCommitment, revealedSeed: result.drawSession.secretSeed, resultHash: result.resultHash, winnerIndex: result.winnerIndex, winnerTicketNumber: result.winnerEntry.ticketNumber, verificationStatus: verification.valid ? 'VALID' : 'INVALID' };
  }

  private async lockRaffle(tx: Prisma.TransactionClient, organizationId: string, raffleId: string) {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "raffles" WHERE id = CAST(${raffleId} AS uuid) AND organization_id = CAST(${organizationId} AS uuid) FOR UPDATE`;
    if (locked.length !== 1) throw new NotFoundException('Raffle not found');
  }

  private readSnapshot(value: Prisma.JsonValue): SnapshotEntry[] {
    if (!Array.isArray(value)) throw new ConflictException('Invalid stored participant snapshot');
    return value.map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new ConflictException('Invalid stored participant snapshot');
      const candidate = entry as Prisma.JsonObject;
      if (typeof candidate.entryId !== 'string' || typeof candidate.ticketNumber !== 'string') throw new ConflictException('Invalid stored participant snapshot');
      return { entryId: candidate.entryId, ticketNumber: candidate.ticketNumber };
    });
  }

  private publicSession(session: { id: string; raffleId: string; participantSnapshotHash: string; seedCommitment: string; algorithmVersion: string; status: string; createdAt: Date; updatedAt: Date }) {
    return { id: session.id, raffleId: session.raffleId, participantSnapshotHash: session.participantSnapshotHash, seedCommitment: session.seedCommitment, algorithmVersion: session.algorithmVersion, status: session.status, createdAt: session.createdAt, updatedAt: session.updatedAt };
  }
}
