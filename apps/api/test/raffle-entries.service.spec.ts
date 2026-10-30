import { BadRequestException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { RaffleEntriesService } from '../src/raffle-entries/raffle-entries.service.js';

describe('RaffleEntriesService', () => {
  it('creates independent sequential tickets using the raffle sequence', async () => {
    let sequence = 0;
    const tx = {
      raffle: {
        findFirst: jest.fn().mockResolvedValue({ id: 'r1', status: 'OPEN', nextTicketSequence: 0, organization: { slug: 'fam' } }),
        updateMany: jest.fn().mockImplementation(async () => { sequence += 3; return { count: 1 }; }),
      },
      participant: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }) },
      raffleEntry: { create: jest.fn().mockImplementation(async ({ data }) => data) },
    };
    tx.raffle.findFirst.mockImplementation(async ({ select }: { select?: { organization?: boolean } }) => select?.organization ? { id: 'r1', status: 'OPEN', nextTicketSequence: 0, organization: { slug: 'fam' } } : { nextTicketSequence: sequence });
    const prisma = { $transaction: jest.fn().mockImplementation(async (callback) => callback(tx)) };
    const entries = await new RaffleEntriesService(prisma as never).createMany('org-a', 'r1', { participantId: 'p1', quantity: 3, source: 'YAPE' });
    expect(entries.map((entry) => entry.ticketNumber)).toEqual(['FAM-000001', 'FAM-000002', 'FAM-000003']);
    expect(new Set(entries.map((entry) => entry.ticketNumber)).size).toBe(3);
  });

  it('rejects entries for a raffle outside the tenant', async () => {
    const prisma = { $transaction: jest.fn().mockImplementation(async (callback) => callback({ raffle: { findFirst: jest.fn().mockResolvedValue(null) } })) };
    await expect(new RaffleEntriesService(prisma as never).createMany('org-a', 'r1', { participantId: 'p1', quantity: 1, source: 'MANUAL' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows only the defined status transitions', async () => {
    const prisma = { raffle: { findFirst: jest.fn().mockResolvedValue({ status: 'OPEN' }) }, raffleEntry: { findFirst: jest.fn().mockResolvedValue({ id: 'e1', status: 'PENDING' }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const service = new RaffleEntriesService(prisma as never);
    await service.update('org-a', 'r1', 'e1', { status: 'VALIDATED' });
    await expect(service.update('org-a', 'r1', 'e1', { status: 'PENDING' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bulk updates valid transitions and reports invalid or missing entries', async () => {
    const tx = {
      raffle: { findFirst: jest.fn().mockResolvedValue({ status: 'OPEN' }) },
      raffleEntry: {
        findMany: jest.fn().mockResolvedValue([{ id: 'e1', status: 'PENDING' }, { id: 'e2', status: 'VALIDATED' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = { $transaction: jest.fn().mockImplementation(async (callback) => callback(tx)) };
    const result = await new RaffleEntriesService(prisma as never).bulkUpdateStatus('org-a', 'r1', { entryIds: ['e1', 'e2', 'missing'], status: 'VALIDATED' });
    expect(result).toEqual(expect.objectContaining({ requested: 3, updated: 1, skipped: 2, status: 'VALIDATED' }));
    expect(tx.raffleEntry.updateMany).toHaveBeenCalledWith({ where: { id: 'e1', raffleId: 'r1', organizationId: 'org-a', status: 'PENDING' }, data: { status: 'VALIDATED' } });
  });
});
