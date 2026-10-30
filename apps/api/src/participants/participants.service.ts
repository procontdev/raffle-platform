import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateParticipantDto } from './dto/create-participant.dto.js';
import { UpdateParticipantDto } from './dto/update-participant.dto.js';
import { BulkUpdateParticipantsDto } from './dto/bulk-update-participants.dto.js';
import { BulkParticipantIdsDto } from './dto/bulk-participant-ids.dto.js';

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  create(organizationId: string, dto: CreateParticipantDto) {
    return this.prisma.participant.create({
      data: { ...dto, organizationId, email: dto.email?.toLowerCase(), metadata: dto.metadata as Prisma.InputJsonValue | undefined },
    });
  }

  list(organizationId: string, includeArchived = false) {
    return this.prisma.participant.findMany({ where: { organizationId, ...(includeArchived ? {} : { archivedAt: null }) }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(organizationId: string, id: string) {
    const participant = await this.prisma.participant.findFirst({ where: { id, organizationId } });
    if (!participant) throw new NotFoundException('Participant not found');
    return participant;
  }

  async update(organizationId: string, id: string, dto: UpdateParticipantDto) {
    await this.findOne(organizationId, id);
    const updated = await this.prisma.participant.updateMany({
      where: { id, organizationId },
      data: { ...dto, email: dto.email === undefined ? undefined : dto.email?.toLowerCase(), metadata: dto.metadata as Prisma.InputJsonValue | undefined },
    });
    if (updated.count !== 1) throw new NotFoundException('Participant not found');
    return this.findOne(organizationId, id);
  }

  async bulkUpdate(organizationId: string, dto: BulkUpdateParticipantsDto) {
    if (dto.email === undefined && dto.phone === undefined) throw new BadRequestException('At least one participant field is required');
    const ids = [...new Set(dto.participantIds)];
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.participant.findMany({ where: { id: { in: ids }, organizationId, archivedAt: null }, select: { id: true } });
      const existingIds = new Set(existing.map((participant) => participant.id));
      const errors = ids.filter((id) => !existingIds.has(id)).map((entryId) => ({ participantId: entryId, message: 'Participant not found' }));
      const data = {
        email: dto.email === undefined ? undefined : dto.email?.trim().toLowerCase() || null,
        phone: dto.phone === undefined ? undefined : dto.phone?.trim() || null,
      };
      const updated = existing.length ? await tx.participant.updateMany({ where: { id: { in: [...existingIds] }, organizationId }, data }) : { count: 0 };
      return { requested: ids.length, updated: updated.count, skipped: errors.length, errors };
    });
  }

  async archive(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    const updated = await this.prisma.participant.updateMany({ where: { id, organizationId, archivedAt: null }, data: { archivedAt: new Date() } });
    if (updated.count !== 1) throw new NotFoundException('Participant not found');
    return this.findOne(organizationId, id);
  }

  async restore(organizationId: string, id: string) {
    const updated = await this.prisma.participant.updateMany({ where: { id, organizationId, archivedAt: { not: null } }, data: { archivedAt: null } });
    if (updated.count !== 1) throw new NotFoundException('Archived participant not found');
    return this.findOne(organizationId, id);
  }

  async bulkArchive(organizationId: string, dto: BulkParticipantIdsDto) {
    const ids = [...new Set(dto.participantIds)];
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.participant.findMany({ where: { id: { in: ids }, organizationId, archivedAt: null }, select: { id: true } });
      const existingIds = new Set(existing.map((participant) => participant.id));
      const errors = ids.filter((id) => !existingIds.has(id)).map((participantId) => ({ participantId, message: 'Participant not found or already archived' }));
      const updated = existing.length ? await tx.participant.updateMany({ where: { id: { in: [...existingIds] }, organizationId, archivedAt: null }, data: { archivedAt: new Date() } }) : { count: 0 };
      return { requested: ids.length, archived: updated.count, skipped: errors.length, errors };
    });
  }
}
