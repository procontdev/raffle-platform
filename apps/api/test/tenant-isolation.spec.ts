import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { BrandsService } from '../src/brands/brands.service.js';
import { OrganizationService } from '../src/organization/organization.service.js';
import { RafflesService } from '../src/raffles/raffles.service.js';

describe('Tenant isolation', () => {
  it('filters brands by organizationId and refuses cross-tenant lookup', async () => {
    const prisma = { brand: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new BrandsService(prisma as never);
    await service.list('org-a');
    expect(prisma.brand.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 'org-a' } }));
    await expect(service.findOne('org-a', 'brand-from-b')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('filters raffles by organizationId and refuses cross-tenant lookup', async () => {
    const prisma = { raffle: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new RafflesService(prisma as never);
    await service.list('org-a');
    expect(prisma.raffle.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 'org-a' } }));
    await expect(service.findOne('org-a', 'raffle-from-b')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolves organization only from the authenticated tenant id', async () => {
    const prisma = { organization: { findFirst: jest.fn().mockResolvedValue({ id: 'org-a' }) } };
    await new OrganizationService(prisma as never).findForUser('org-a');
    expect(prisma.organization.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'org-a' } }));
  });
});
