import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Application and database health check' })
  async health() {
    let database = 'ok';
    try { await this.prisma.$queryRaw`SELECT 1`; } catch { database = 'unavailable'; }
    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      service: 'raffle-api',
      database,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('livez')
  @ApiOperation({ summary: 'Process liveness check' })
  livez() { return { status: 'ok', service: 'raffle-api', timestamp: new Date().toISOString() }; }

  @Get('ready')
  @ApiOperation({ summary: 'Dependency readiness check' })
  async ready() {
    try { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ready', service: 'raffle-api', database: 'ok', timestamp: new Date().toISOString() }; }
    catch { throw new ServiceUnavailableException({ status: 'not_ready', service: 'raffle-api', database: 'unavailable', timestamp: new Date().toISOString() }); }
  }
}
