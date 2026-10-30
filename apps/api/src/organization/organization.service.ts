import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateOrganizationLiveSettingsDto } from './dto/update-organization-live-settings.dto.js';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(organizationId: string) {
    const organization = await this.prisma.organization.findFirst({ where: { id: organizationId }, select: { id: true, name: true, slug: true, status: true, marqueeSpeedSeconds: true, createdAt: true, updatedAt: true } });
    if (!organization) throw new NotFoundException('Organization not found');
    return organization;
  }

  async updateLiveSettings(organizationId: string, dto: UpdateOrganizationLiveSettingsDto) {
    const organization = await this.prisma.organization.updateMany({ where: { id: organizationId }, data: { marqueeSpeedSeconds: dto.marqueeSpeedSeconds } });
    if (organization.count !== 1) throw new NotFoundException('Organization not found');
    return this.findForUser(organizationId);
  }
}
