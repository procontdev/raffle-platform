import { describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { LiveService } from '../src/live/live.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

type PrismaMock = { raffle: { findFirst: ReturnType<typeof jest.fn> }; raffleEntry: { findMany: ReturnType<typeof jest.fn> }; drawSession: { create: ReturnType<typeof jest.fn> }; drawResult: { create: ReturnType<typeof jest.fn> } };

function prismaFor(entries: unknown[], status = 'READY'): PrismaMock {
  return {
    raffle: { findFirst: jest.fn().mockResolvedValue({ id: 'raffle-a', organizationId: 'org-a', slug: 'raffle-a', status, prizeName: 'Premio' }) },
    raffleEntry: { findMany: jest.fn().mockResolvedValue(entries) },
    drawSession: { create: jest.fn() },
    drawResult: { create: jest.fn() },
  };
}

describe('LiveService rehearsal mode', () => {
  it('returns a validated raffle ticket without exposing PII', async () => {
    const prisma = prismaFor([{ ticketNumber: 'ORG-000001', participant: { displayName: 'Carlos' } }, { ticketNumber: 'ORG-000002', participant: { displayName: 'Maria' } }]);
    const service = new LiveService(prisma as unknown as PrismaService);
    const candidates = await service.rehearsalCandidates('raffle-a');
    const result = await service.startRehearsal('raffle-a');
    expect(candidates.candidates).toEqual([
      { displayName: 'Carlos', ticketNumber: 'ORG-000001' },
      { displayName: 'Maria', ticketNumber: 'ORG-000002' },
    ]);
    expect([{ displayName: 'Carlos', ticketNumber: 'ORG-000001', prizeName: 'Premio' }, { displayName: 'Maria', ticketNumber: 'ORG-000002', prizeName: 'Premio' }]).toContainEqual(result.winner);
    expect(result.sourceStatus).toBe('VALIDATED');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('phone');
    expect(result).not.toHaveProperty('secretSeed');
    expect(prisma.drawSession.create).not.toHaveBeenCalled();
    expect(prisma.drawResult.create).not.toHaveBeenCalled();
  });

  it('uses a pending ticket only as an explicit OPEN visual fallback', async () => {
    const prisma = prismaFor([], 'OPEN');
    prisma.raffleEntry.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ticketNumber: 'ORG-000002', participant: { displayName: 'Maria' } }]);
    const result = await new LiveService(prisma as unknown as PrismaService).rehearsalCandidates('raffle-a');
    expect(result.sourceStatus).toBe('PENDING_VISUAL_ONLY');
    expect(result.raffleStatus).toBe('OPEN');
    expect(result.candidates).toEqual([{ displayName: 'Maria', ticketNumber: 'ORG-000002' }]);
  });

  it('returns a controlled error when no rehearsal ticket exists', async () => {
    const prisma = prismaFor([], 'OPEN');
    await expect(new LiveService(prisma as unknown as PrismaService).rehearsalCandidates('raffle-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.drawSession.create).not.toHaveBeenCalled();
    expect(prisma.drawResult.create).not.toHaveBeenCalled();
  });

  it('can return different eligible tickets across rehearsal executions', async () => {
    const entries = [{ ticketNumber: 'ORG-000001', participant: { displayName: 'Carlos' } }, { ticketNumber: 'ORG-000002', participant: { displayName: 'Maria' } }];
    const prisma = prismaFor(entries);
    const service = new LiveService(prisma as unknown as PrismaService);
    const tickets = new Set<string>();
    for (let attempt = 0; attempt < 20; attempt += 1) tickets.add((await service.startRehearsal('raffle-a')).winner.ticketNumber);
    expect([...tickets].every((ticket) => entries.some((entry) => entry.ticketNumber === ticket))).toBe(true);
    expect(tickets.size).toBeGreaterThan(1);
  });
});
