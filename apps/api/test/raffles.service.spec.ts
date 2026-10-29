import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { RafflesService } from '../src/raffles/raffles.service.js';

describe('RafflesService', () => {
  const user = { id: 'user-a', email: 'admin@example.com', role: 'ADMIN' as const, organizationId: 'org-a' };

  it('creates a raffle in the authenticated organization', async () => {
    const created = { id: 'raffle-a', organizationId: 'org-a', status: 'DRAFT' };
    const prisma = { raffle: { create: jest.fn().mockResolvedValue(created) }, brand: { findFirst: jest.fn() } };
    const result = await new RafflesService(prisma as never).create(user, { name: 'Test', slug: 'test', prizeName: 'Prize' });
    expect(result).toEqual(created);
    expect(prisma.raffle.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-a', createdById: 'user-a' }) }));
  });

  it('does not modify a completed raffle', async () => {
    const prisma = { raffle: { findFirst: jest.fn().mockResolvedValue({ id: 'r1', organizationId: 'org-a', status: 'COMPLETED' }) } };
    await expect(new RafflesService(prisma as never).update(user, 'r1', { name: 'Nope' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
