import { randomInt } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class LiveService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicRaffle(slug: string) {
    const raffle = await this.prisma.raffle.findFirst({ where: { slug }, include: { brand: true, organization: { select: { marqueeSpeedSeconds: true } }, drawSession: true, drawResult: { include: { winnerEntry: { include: { participant: true } } } } } });
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
      marqueeSpeedSeconds: raffle.organization.marqueeSpeedSeconds,
      brand: raffle.brand ? { name: raffle.brand.name, logoUrl: raffle.brand.logoUrl, themeConfig: raffle.brand.themeConfig } : null,
      snapshotHash: raffle.drawSession?.participantSnapshotHash ?? null,
      seedCommitment: raffle.drawSession?.seedCommitment ?? null,
      draw: raffle.drawResult ? { drawId: raffle.drawResult.id, winnerTicketNumber: raffle.drawResult.winnerEntry.ticketNumber, displayName: raffle.drawResult.winnerEntry.participant.displayName } : null,
    };
  }

  async getLiveState(slug: string) {
    const raffle = await this.prisma.raffle.findFirst({ where: { slug }, include: { drawSession: true } });
    if (!raffle) throw new NotFoundException('Raffle not found');
    const publicRaffle = await this.getPublicRaffle(slug);
    const validatedEntries = await this.prisma.raffleEntry.findMany({ where: { raffleId: raffle.id, organizationId: raffle.organizationId, status: 'VALIDATED' }, select: { ticketNumber: true, participant: { select: { displayName: true } } }, orderBy: [{ ticketNumber: 'asc' }, { id: 'asc' }] });
    const validatedTicketCount = validatedEntries.length;
    const liveState = raffle.status === 'COMPLETED' ? 'WINNER' : raffle.status === 'READY' ? 'READY' : 'WAITING';
    return { raffleId: raffle.id, slug: raffle.slug, raffleStatus: raffle.status, liveState, prizeName: raffle.prizeName, participantCount: publicRaffle.participants, ticketCount: publicRaffle.tickets, validatedTicketCount, validatedCandidates: validatedEntries.map((entry) => ({ displayName: entry.participant.displayName, ticketNumber: entry.ticketNumber })), participantSnapshotHash: ['READY', 'COMPLETED'].includes(raffle.status) ? publicRaffle.snapshotHash : null, seedCommitment: ['READY', 'COMPLETED'].includes(raffle.status) ? publicRaffle.seedCommitment : null, winner: publicRaffle.draw, drawId: publicRaffle.draw?.drawId ?? null };
  }

  private async getRehearsalCandidates(slug: string) {
    const raffle = await this.prisma.raffle.findFirst({ where: { slug }, select: { id: true, organizationId: true, slug: true, status: true, prizeName: true } });
    if (!raffle) throw new NotFoundException('Raffle not found');
    let eligibleEntries = await this.prisma.raffleEntry.findMany({ where: { raffleId: raffle.id, organizationId: raffle.organizationId, status: 'VALIDATED' }, include: { participant: true }, orderBy: [{ ticketNumber: 'asc' }, { id: 'asc' }] });
    let sourceStatus = 'VALIDATED';
    if (eligibleEntries.length === 0 && raffle.status === 'OPEN') {
      eligibleEntries = await this.prisma.raffleEntry.findMany({ where: { raffleId: raffle.id, organizationId: raffle.organizationId, status: 'PENDING' }, include: { participant: true }, orderBy: [{ ticketNumber: 'asc' }, { id: 'asc' }] });
      sourceStatus = 'PENDING_VISUAL_ONLY';
    }
    if (eligibleEntries.length === 0) throw new NotFoundException('No tickets available for rehearsal');
    return { raffle, sourceStatus, eligibleEntries };
  }

  async rehearsalCandidates(slug: string) {
    const { raffle, sourceStatus, eligibleEntries } = await this.getRehearsalCandidates(slug);
    return { demo: true, raffleId: raffle.id, slug: raffle.slug, raffleStatus: raffle.status, sourceStatus, prizeName: raffle.prizeName, candidates: eligibleEntries.map((entry) => ({ displayName: entry.participant.displayName, ticketNumber: entry.ticketNumber })) };
  }

  async startRehearsal(slug: string) {
    const { raffle, sourceStatus, eligibleEntries } = await this.getRehearsalCandidates(slug);
    const entry = eligibleEntries[randomInt(0, eligibleEntries.length)];
    return { demo: true, raffleId: raffle.id, slug: raffle.slug, raffleStatus: raffle.status, sourceStatus, prizeName: raffle.prizeName, winner: { displayName: entry.participant.displayName, ticketNumber: entry.ticketNumber, prizeName: raffle.prizeName } };
  }

  async winnerPayload(organizationId: string, raffleId: string) {
    const result = await this.prisma.drawResult.findFirst({ where: { organizationId, raffleId }, include: { winnerEntry: { include: { participant: true } } } });
    if (!result) throw new NotFoundException('Draw result not found');
    const raffle = await this.prisma.raffle.findFirst({ where: { id: raffleId, organizationId }, select: { id: true, slug: true, prizeName: true } });
    if (!raffle) throw new NotFoundException('Raffle not found');
    return { raffleId: raffle.id, raffleSlug: raffle.slug, displayName: result.winnerEntry.participant.displayName, ticketNumber: result.winnerEntry.ticketNumber, prizeName: raffle.prizeName, drawId: result.id };
  }
}
