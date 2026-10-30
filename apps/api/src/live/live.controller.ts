import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LiveService } from './live.service.js';
import { InMemoryRateLimitGuard } from '../common/in-memory-rate-limit.guard.js';

@ApiTags('Public Live')
@Controller('public/raffles')
@UseGuards(InMemoryRateLimitGuard)
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get public live-safe raffle data by slug' })
  getPublic(@Param('slug') slug: string) { return this.live.getPublicRaffle(slug); }

  @Get(':slug/live-state')
  @ApiOperation({ summary: 'Get public live state for re-hydration' })
  getLiveState(@Param('slug') slug: string) { return this.live.getLiveState(slug); }

  @Get(':slug/rehearsal')
  @ApiOperation({ summary: 'Get public candidates for a non-official rehearsal' })
  getRehearsalCandidates(@Param('slug') slug: string) { return this.live.rehearsalCandidates(slug); }

  @Post(':slug/rehearsal/start')
  @ApiOperation({ summary: 'Select a non-official rehearsal winner without persistence' })
  startRehearsal(@Param('slug') slug: string) { return this.live.startRehearsal(slug); }
}
