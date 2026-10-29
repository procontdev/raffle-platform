import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LiveService } from './live.service.js';

@ApiTags('Public Live')
@Controller('public/raffles')
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get public live-safe raffle data by slug' })
  getPublic(@Param('slug') slug: string) { return this.live.getPublicRaffle(slug); }
}
