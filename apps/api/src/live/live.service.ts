import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class LiveService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicRaffle(slug: string) {
    const raffle = await this.prisma.raffle.findFirst({ where: { slug }, include: { brand: true, drawSession: true, drawResult: { include: { winnerEntry: { include: { participant: true } } } } } });
    if (!raffle) throw new NotFoundException('Raffle not found');
    const [participantRows, tickets] = await Promise.all([
      this.prisma.raffleEntry.findMany({ where: { organizationId: raffle.organizationId, raffleId: raffle.id }, select: { participantId: true }, distinct: ['participantId'] }),
      this.prisma.raffleEntry.count({ where: { organizationId: raffle.organizationId, raffleId: raffle.id } }),
    ]);
    return {
      id: raffle.id,
      slug: raffle.slug,
      name: raffle.name,
      description: raffle.description,
      prizeName: raffle.prizeName,
      prizeDescription: raffle.prizeDescription,
      prizeImageUrl: raffle.prizeImageUrl,
      status: raffle.status,
      startsAt: raffle.startsAt,
      closesAt: raffle.closesAt,
      participants: participantRows.length,
      tickets,
      brand: raffle.brand ? { name: raffle.brand.name, logoUrl: raffle.brand.logoUrl, themeConfig: raffle.brand.themeConfig } : null,
      snapshotHash: raffle.drawSession?.participantSnapshotHash ?? null,
      seedCommitment: raffle.drawSession?.seedCommitment ?? null,
      draw: raffle.drawResult ? { drawId: raffle.drawResult.id, winnerTicketNumber: raffle.drawResult.winnerEntry.ticketNumber, displayName: raffle.drawResult.winnerEntry.participant.displayName } : null,
    };
  }

  async winnerPayload(organizationId: string, raffleId: string) {
    const result = await this.prisma.drawResult.findFirst({ where: { organizationId, raffleId }, include: { winnerEntry: { include: { participant: true } } } });
    if (!result) throw new NotFoundException('Draw result not found');
    const raffle = await this.prisma.raffle.findFirst({ where: { id: raffleId, organizationId }, select: { id: true, slug: true, prizeName: true } });
    if (!raffle) throw new NotFoundException('Raffle not found');
    return { raffleId: raffle.id, raffleSlug: raffle.slug, displayName: result.winnerEntry.participant.displayName, ticketNumber: result.winnerEntry.ticketNumber, prizeName: raffle.prizeName, drawId: result.id };
  }
}
