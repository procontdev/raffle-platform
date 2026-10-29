import { jest } from '@jest/globals';
import { CsvImportService } from '../src/raffle-entries/csv-import.service.js';

describe('CsvImportService', () => {
  it('resolves an existing participant by email and continues past invalid rows', async () => {
    const prisma = {
      raffle: { findFirst: jest.fn().mockResolvedValue({ id: 'r1', status: 'OPEN' }) },
      participant: { findFirst: jest.fn().mockResolvedValue({ id: 'existing-participant' }), create: jest.fn() },
    };
    const entries = { assertRaffleCanReceiveEntries: jest.fn(), createMany: jest.fn().mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]) };
    const csv = 'name,phone,email,source,quantity,payment_reference,payment_amount\nCarlos,,carlos@example.com,YAPE,2,YAPE-1,15\nInvalid,,,BAD,0,,nope\n';
    const result = await new CsvImportService(prisma as never, entries as never).import('org-a', 'r1', Buffer.from(csv));
    expect(result).toMatchObject({ totalRows: 2, importedRows: 1, rejectedRows: 1, entriesCreated: 2 });
    expect(result.errors).toHaveLength(1);
    expect(prisma.participant.create).not.toHaveBeenCalled();
    expect(entries.createMany).toHaveBeenCalledWith('org-a', 'r1', expect.objectContaining({ participantId: 'existing-participant', quantity: 2 }));
  });

  it('rejects CSV with invalid headers before importing rows', async () => {
    const prisma = { raffle: { findFirst: jest.fn().mockResolvedValue({ id: 'r1', status: 'OPEN' }) } };
    const entries = { assertRaffleCanReceiveEntries: jest.fn() };
    await expect(new CsvImportService(prisma as never, entries as never).import('org-a', 'r1', Buffer.from('wrong,headers\nvalue,value'))).rejects.toThrow('CSV headers');
  });

  it('creates a new participant when a valid row has neither email nor phone', async () => {
    const prisma = {
      raffle: { findFirst: jest.fn().mockResolvedValue({ id: 'r1', status: 'OPEN' }) },
      participant: { findFirst: jest.fn(), create: jest.fn().mockResolvedValue({ id: 'new-participant' }) },
    };
    const entries = { assertRaffleCanReceiveEntries: jest.fn(), createMany: jest.fn().mockResolvedValue([{ id: 'e1' }]) };
    const result = await new CsvImportService(prisma as never, entries as never).import('org-a', 'r1', Buffer.from('name,phone,email,source,quantity,payment_reference,payment_amount\nAnonymous,,,MANUAL,1,,0'));
    expect(result).toMatchObject({ importedRows: 1, rejectedRows: 0, entriesCreated: 1 });
    expect(prisma.participant.create).toHaveBeenCalled();
  });
});
