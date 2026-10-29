import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DrawService } from './draw.service.js';

@ApiTags('Public Draw Verification')
@Controller('public/draws')
export class PublicDrawController {
  constructor(private readonly draws: DrawService) {}

  @Get(':drawId/verify')
  @ApiOperation({ summary: 'Verify a completed draw without authentication' })
  verify(@Param('drawId', ParseUUIDPipe) drawId: string) { return this.draws.verify(drawId); }
}
