import { BadRequestException, Injectable } from '@nestjs/common';
import { RaffleEntrySource } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEntriesDto } from './dto/create-entries.dto.js';
import { RaffleEntriesService } from './raffle-entries.service.js';

type CsvRow = Record<string, string>;

const headers = ['name', 'phone', 'email', 'source', 'quantity', 'payment_reference', 'payment_amount'];

@Injectable()
export class CsvImportService {
  constructor(private readonly prisma: PrismaService, private readonly entries: RaffleEntriesService) {}

  async import(organizationId: string, raffleId: string, buffer: Buffer) {
    const raffle = await this.prisma.raffle.findFirst({ where: { id: raffleId, organizationId }, select: { id: true, status: true } });
    if (!raffle) throw new BadRequestException('Raffle not found');
    this.entries.assertRaffleCanReceiveEntries(raffle.status);
    const rows = this.parse(buffer.toString('utf8'));
    const result = { totalRows: rows.length, importedRows: 0, rejectedRows: 0, entriesCreated: 0, errors: [] as Array<{ row: number; message: string }> };

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 2;
      try {
        const parsed = this.validateRow(rows[index]);
        const participantId = await this.resolveParticipant(organizationId, parsed);
        const created = await this.entries.createMany(organizationId, raffleId, { ...parsed, participantId, source: parsed.source, quantity: parsed.quantity } as CreateEntriesDto);
        result.importedRows += 1;
        result.entriesCreated += created.length;
      } catch (error) {
        result.rejectedRows += 1;
        result.errors.push({ row: rowNumber, message: error instanceof Error ? error.message : 'Invalid row' });
      }
    }
    return result;
  }

  private parse(content: string): CsvRow[] {
    const lines = this.parseLines(content).filter((line) => line.some((value) => value.trim() !== ''));
    if (lines.length === 0) throw new BadRequestException('CSV is empty');
    const actualHeaders = lines[0].map((value) => value.trim().toLowerCase());
    if (actualHeaders.length !== headers.length || headers.some((header, index) => actualHeaders[index] !== header)) throw new BadRequestException(`CSV headers must be: ${headers.join(',')}`);
    return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, (line[index] ?? '').trim()])));
  }

  private parseLines(content: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;
    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];
      if (char === '"') {
        if (quoted && content[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted;
      } else if (char === ',' && !quoted) { row.push(field); field = ''; }
      else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && content[index + 1] === '\n') index += 1; row.push(field); rows.push(row); row = []; field = ''; }
      else field += char;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  private validateRow(row: CsvRow) {
    if (!row.name) throw new BadRequestException('name is required');
    if (!Object.values(RaffleEntrySource).includes(row.source as RaffleEntrySource)) throw new BadRequestException('source is invalid');
    const quantity = Number(row.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new BadRequestException('quantity must be an integer greater than or equal to 1');
    const paymentAmount = row.payment_amount === '' ? undefined : Number(row.payment_amount);
    if (paymentAmount !== undefined && (!Number.isFinite(paymentAmount) || paymentAmount < 0)) throw new BadRequestException('payment_amount must be numeric and non-negative');
    return { displayName: row.name, fullName: row.name, phone: row.phone || undefined, email: row.email?.toLowerCase() || undefined, quantity, source: row.source as RaffleEntrySource, paymentReference: row.payment_reference || undefined, paymentAmount };
  }

  private async resolveParticipant(organizationId: string, row: ReturnType<CsvImportService['validateRow']>) {
    if (!row.email && !row.phone) {
      const participant = await this.prisma.participant.create({ data: { organizationId, displayName: row.displayName, fullName: row.fullName } });
      return participant.id;
    }
    const existing = row.email
      ? await this.prisma.participant.findFirst({ where: { organizationId, email: row.email } })
      : await this.prisma.participant.findFirst({ where: { organizationId, phone: row.phone } });
    if (existing) return existing.id;
    const participant = await this.prisma.participant.create({ data: { organizationId, displayName: row.displayName, fullName: row.fullName, phone: row.phone, email: row.email } });
    return participant.id;
  }
}
