import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service.js';
import { LiveService } from './live.service.js';
import { logEvent } from '../common/structured-log.js';

type LiveState = 'LIVE_RESET' | 'LIVE_READY' | 'LIVE_COUNTDOWN' | 'LIVE_DRAWING' | 'LIVE_WINNER';

@WebSocketGateway({ namespace: '/live', cors: { origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3002').split(',').map((origin) => origin.trim()), credentials: true }, transports: ['websocket', 'polling'] })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(LiveGateway.name);

  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService, private readonly live: LiveService) {}

  handleConnection(client: Socket) { logEvent('LIVE_CLIENT_CONNECTED', { userId: client.id }); }
  handleDisconnect(client: Socket) { logEvent('LIVE_CLIENT_DISCONNECTED', { userId: client.id }); }

  @SubscribeMessage('joinRaffle')
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: { raffleId?: string }) {
    if (!body?.raffleId) return { ok: false, error: 'raffleId is required' };
    const raffle = await this.prisma.raffle.findFirst({ where: { id: body.raffleId }, select: { id: true, status: true } });
    if (!raffle) return { ok: false, error: 'Raffle not found' };
    const room = this.room(raffle.id);
    await client.join(room);
    client.emit('LIVE_READY', { raffleId: raffle.id, status: raffle.status });
    logEvent('LIVE_ROOM_JOINED', { raffleId: raffle.id });
    return { ok: true, room };
  }

  @SubscribeMessage('adminLiveState')
  async adminState(@ConnectedSocket() client: Socket, @MessageBody() body: { raffleId?: string; state?: LiveState }) {
    const user = await this.authenticate(client);
    if (!user) return { ok: false, error: 'Unauthorized' };
    if (!body?.raffleId || !body.state || !['LIVE_RESET', 'LIVE_READY', 'LIVE_COUNTDOWN', 'LIVE_DRAWING', 'LIVE_WINNER'].includes(body.state)) return { ok: false, error: 'Invalid live state' };
    const raffle = await this.prisma.raffle.findFirst({ where: { id: body.raffleId, organizationId: user.organizationId }, select: { id: true } });
    if (!raffle) return { ok: false, error: 'Raffle not found' };
    let payload: Record<string, unknown> = { raffleId: raffle.id };
    if (body.state === 'LIVE_WINNER') payload = await this.live.winnerPayload(user.organizationId, raffle.id);
    this.server.to(this.room(raffle.id)).emit(body.state, payload);
    logEvent('LIVE_EVENT_EMITTED', { raffleId: raffle.id });
    return { ok: true };
  }

  private async authenticate(client: Socket) {
    const authorization = client.handshake.auth?.token ?? client.handshake.headers.authorization;
    const token = typeof authorization === 'string' && authorization.startsWith('Bearer ') ? authorization.slice(7) : typeof authorization === 'string' ? authorization : undefined;
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; organizationId: string }>(token);
      return this.prisma.user.findFirst({ where: { id: payload.sub, organizationId: payload.organizationId, status: 'ACTIVE' }, select: { id: true, organizationId: true } });
    } catch (error) {
      this.logger.debug(`Live socket authentication failed: ${String(error)}`);
      return null;
    }
  }

  private room(raffleId: string) { return `raffle:${raffleId}`; }
}
