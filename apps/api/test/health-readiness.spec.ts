import { describe, expect, it, jest } from '@jest/globals';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from '../src/health/health.controller.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('health and readiness', () => {
  it('reports ready when PostgreSQL responds', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as unknown as PrismaService;
    const result = await new HealthController(prisma).ready();
    expect(result.status).toBe('ready');
    expect(result.database).toBe('ok');
  });

  it('returns a service unavailable error when PostgreSQL fails', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('database unavailable')) } as unknown as PrismaService;
    await expect(new HealthController(prisma).ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
