import { Controller, Post, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { DrawService } from './draw.service.js';

@ApiTags('Draws')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('raffles')
export class DrawController {
  constructor(private readonly draws: DrawService) {}

  @Post(':raffleId/close')
  @ApiOperation({ summary: 'Close an OPEN raffle and create its immutable draw session' })
  close(@CurrentUser() user: AuthenticatedUser, @Param('raffleId', ParseUUIDPipe) raffleId: string) { return this.draws.close(user.organizationId, raffleId); }

  @Post(':raffleId/draw')
  @ApiOperation({ summary: 'Execute the deterministic draw for a READY raffle' })
  draw(@CurrentUser() user: AuthenticatedUser, @Param('raffleId', ParseUUIDPipe) raffleId: string) { return this.draws.draw(user.organizationId, raffleId); }
}
