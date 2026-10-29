import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(organizationId: string) {
    const organization = await this.prisma.organization.findFirst({ where: { id: organizationId }, select: { id: true, name: true, slug: true, status: true, createdAt: true, updatedAt: true } });
    if (!organization) throw new NotFoundException('Organization not found');
    return organization;
  }
}
