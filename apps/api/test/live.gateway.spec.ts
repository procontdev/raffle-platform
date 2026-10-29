import { describe, expect, it, jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Socket } from 'socket.io';
import { LiveGateway } from '../src/live/live.gateway.js';
import { LiveService } from '../src/live/live.service.js';

describe('LiveGateway', () => {
  it('joins a public raffle room and emits LIVE_READY', async () => {
    const client = { join: jest.fn().mockResolvedValue(undefined), emit: jest.fn(), handshake: { auth: {}, headers: {} } } as unknown as Socket;
    const prisma = { raffle: { findFirst: jest.fn().mockResolvedValue({ id: 'raffle-a', status: 'OPEN' }) } } as unknown as PrismaService;
    const gateway = new LiveGateway({} as JwtService, prisma, {} as LiveService);

    const result = await gateway.join(client, { raffleId: 'raffle-a' });

    expect(result).toEqual({ ok: true, room: 'raffle:raffle-a' });
    expect(client.join).toHaveBeenCalledWith('raffle:raffle-a');
    expect(client.emit).toHaveBeenCalledWith('LIVE_READY', { raffleId: 'raffle-a', status: 'OPEN' });
  });

  it('does not allow unauthenticated clients to publish admin states', async () => {
    const client = { handshake: { auth: {}, headers: {} } } as unknown as Socket;
    const jwt = { verifyAsync: jest.fn().mockRejectedValue(new Error('invalid token')) } as unknown as JwtService;
    const gateway = new LiveGateway(jwt, {} as PrismaService, {} as LiveService);

    await expect(gateway.adminState(client, { raffleId: 'raffle-a', state: 'LIVE_WINNER' })).resolves.toEqual({ ok: false, error: 'Unauthorized' });
  });
});
