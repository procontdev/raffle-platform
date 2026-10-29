import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateParticipantDto } from './dto/create-participant.dto.js';
import { UpdateParticipantDto } from './dto/update-participant.dto.js';

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  create(organizationId: string, dto: CreateParticipantDto) {
    return this.prisma.participant.create({
      data: { ...dto, organizationId, email: dto.email?.toLowerCase(), metadata: dto.metadata as Prisma.InputJsonValue | undefined },
    });
  }

  list(organizationId: string) {
    return this.prisma.participant.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
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
}
