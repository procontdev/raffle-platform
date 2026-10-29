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
});
