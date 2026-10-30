import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEntriesDto } from './dto/create-entries.dto.js';
import { ListEntriesDto } from './dto/list-entries.dto.js';
import { UpdateEntryDto } from './dto/update-entry.dto.js';
import { BulkUpdateEntryStatusDto } from './dto/bulk-update-entry-status.dto.js';
import { RaffleEntryStatus } from '../generated/prisma/client.js';

const allowedTransitions: Record<string, string[]> = {
  PENDING: ['VALIDATED', 'REJECTED', 'CANCELLED'],
  VALIDATED: ['CANCELLED'],
  REJECTED: ['CANCELLED'],
  CANCELLED: [],
};

@Injectable()
export class RaffleEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(organizationId: string, raffleId: string, dto: CreateEntriesDto) {
    return this.prisma.$transaction(async (tx) => {
      const raffle = await tx.raffle.findFirst({
        where: { id: raffleId, organizationId },
        select: { id: true, status: true, nextTicketSequence: true, organization: { select: { slug: true } } },
      });
      if (!raffle) throw new NotFoundException('Raffle not found');
      this.assertRaffleCanReceiveEntries(raffle.status);

      const participant = await tx.participant.findFirst({ where: { id: dto.participantId, organizationId, archivedAt: null }, select: { id: true } });
      if (!participant) throw new NotFoundException('Participant not found');

      const reserved = await tx.raffle.updateMany({
        where: { id: raffleId, organizationId, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
        data: { nextTicketSequence: { increment: dto.quantity } },
      });
      if (reserved.count !== 1) throw new BadRequestException('Raffle cannot receive entries');
      const sequence = await tx.raffle.findFirst({ where: { id: raffleId, organizationId }, select: { nextTicketSequence: true } });
      if (!sequence) throw new NotFoundException('Raffle not found');
      const firstTicket = sequence.nextTicketSequence - dto.quantity + 1;
      const entries = [];
      for (let index = 0; index < dto.quantity; index += 1) {
        entries.push(await tx.raffleEntry.create({
          data: {
            organizationId,
            raffleId,
            participantId: participant.id,
            ticketNumber: `${raffle.organization.slug.toUpperCase()}-${String(firstTicket + index).padStart(6, '0')}`,
            source: dto.source,
            paymentReference: dto.paymentReference,
            paymentAmount: dto.paymentAmount,
          },
        }));
      }
      return entries;
    });
  }

  async list(organizationId: string, raffleId: string, filters: ListEntriesDto) {
    await this.requireRaffle(organizationId, raffleId);
    return this.prisma.raffleEntry.findMany({
      where: { organizationId, raffleId, status: filters.status, source: filters.source, participantId: filters.participantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(organizationId: string, raffleId: string, entryId: string) {
    const entry = await this.prisma.raffleEntry.findFirst({ where: { id: entryId, raffleId, organizationId } });
    if (!entry) throw new NotFoundException('Raffle entry not found');
    return entry;
  }

  async update(organizationId: string, raffleId: string, entryId: string, dto: UpdateEntryDto) {
    const raffle = await this.prisma.raffle.findFirst({ where: { id: raffleId, organizationId }, select: { status: true } });
    if (!raffle) throw new NotFoundException('Raffle not found');
    if (['READY', 'DRAWING', 'COMPLETED', 'CANCELLED', 'CLOSED'].includes(raffle.status)) throw new BadRequestException('Entries cannot be modified after raffle close');
    const entry = await this.findOne(organizationId, raffleId, entryId);
    if (!allowedTransitions[entry.status].includes(dto.status)) throw new BadRequestException(`Invalid entry status transition: ${entry.status} -> ${dto.status}`);
    const updated = await this.prisma.raffleEntry.updateMany({ where: { id: entryId, raffleId, organizationId }, data: { status: dto.status } });
    if (updated.count !== 1) throw new NotFoundException('Raffle entry not found');
    return this.findOne(organizationId, raffleId, entryId);
  }

  async bulkUpdateStatus(organizationId: string, raffleId: string, dto: BulkUpdateEntryStatusDto) {
    const ids = [...new Set(dto.entryIds)];
    return this.prisma.$transaction(async (tx) => {
      const raffle = await tx.raffle.findFirst({ where: { id: raffleId, organizationId }, select: { status: true } });
      if (!raffle) throw new NotFoundException('Raffle not found');
      if (['READY', 'DRAWING', 'COMPLETED', 'CANCELLED', 'CLOSED'].includes(raffle.status)) throw new BadRequestException('Entries cannot be modified after raffle close');
      const entries = await tx.raffleEntry.findMany({ where: { id: { in: ids }, raffleId, organizationId }, select: { id: true, status: true } });
      const byId = new Map(entries.map((entry) => [entry.id, entry]));
      const errors = ids.flatMap((entryId) => {
        const entry = byId.get(entryId);
        if (!entry) return [{ entryId, message: 'Raffle entry not found' }];
        if (!allowedTransitions[entry.status].includes(dto.status)) return [{ entryId, message: `Invalid entry status transition: ${entry.status} -> ${dto.status}` }];
        return [];
      });
      const validEntries = entries.filter((entry) => allowedTransitions[entry.status].includes(dto.status));
      let updated = 0;
      for (const entry of validEntries) {
        const result = await tx.raffleEntry.updateMany({ where: { id: entry.id, raffleId, organizationId, status: entry.status }, data: { status: dto.status } });
        updated += result.count;
      }
      return { requested: ids.length, updated, skipped: errors.length, status: dto.status as RaffleEntryStatus, errors };
    });
  }

  async requireRaffle(organizationId: string, raffleId: string) {
    const raffle = await this.prisma.raffle.findFirst({ where: { id: raffleId, organizationId }, select: { id: true } });
    if (!raffle) throw new NotFoundException('Raffle not found');
    return raffle;
  }

  assertRaffleCanReceiveEntries(status: string) {
    if (['READY', 'DRAWING', 'COMPLETED', 'CANCELLED', 'CLOSED'].includes(status)) throw new BadRequestException('Raffle cannot receive entries in its current status');
  }
}
