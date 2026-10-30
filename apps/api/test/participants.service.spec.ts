import { jest } from '@jest/globals';
import { ParticipantsService } from '../src/participants/participants.service.js';

describe('ParticipantsService', () => {
  it('creates a participant scoped to the organization', async () => {
    const prisma = { participant: { create: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-a' }) } };
    const result = await new ParticipantsService(prisma as never).create('org-a', { displayName: 'Carlos', email: 'CARLOS@example.com' });
    expect(result).toEqual({ id: 'p1', organizationId: 'org-a' });
    expect(prisma.participant.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-a', email: 'carlos@example.com' }) }));
  });

  it('updates only a participant belonging to the organization', async () => {
    const prisma = { participant: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-a' }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    await new ParticipantsService(prisma as never).update('org-a', 'p1', { displayName: 'Updated' });
    expect(prisma.participant.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p1', organizationId: 'org-a' } }));
  });

  it('bulk updates only participants in the organization and reports missing ids', async () => {
    const tx = {
      participant: {
        findMany: jest.fn().mockResolvedValue([{ id: 'p1' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = { $transaction: jest.fn().mockImplementation(async (callback) => callback(tx)) };
    const result = await new ParticipantsService(prisma as never).bulkUpdate('org-a', { participantIds: ['p1', 'p-other'], phone: '955111111' });
    expect(result).toEqual(expect.objectContaining({ requested: 2, updated: 1, skipped: 1 }));
    expect(tx.participant.findMany).toHaveBeenCalledWith({ where: { id: { in: ['p1', 'p-other'] }, organizationId: 'org-a', archivedAt: null }, select: { id: true } });
    expect(tx.participant.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['p1'] }, organizationId: 'org-a' } }));
  });

  it('archives and restores a participant without deleting history', async () => {
    const prisma = { participant: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-a', archivedAt: null }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const service = new ParticipantsService(prisma as never);
    await service.archive('org-a', 'p1');
    expect(prisma.participant.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { archivedAt: expect.any(Date) } }));
    prisma.participant.findFirst.mockResolvedValue({ id: 'p1', organizationId: 'org-a', archivedAt: new Date() });
    await service.restore('org-a', 'p1');
    expect(prisma.participant.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { archivedAt: null } }));
  });
});
