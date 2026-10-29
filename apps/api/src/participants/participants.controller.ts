import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CreateParticipantDto } from './dto/create-participant.dto.js';
import { UpdateParticipantDto } from './dto/update-participant.dto.js';
import { ParticipantsService } from './participants.service.js';

@ApiTags('Participants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateParticipantDto) { return this.participants.create(user.organizationId, dto); }
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.participants.list(user.organizationId); }
  @Get(':id') findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.participants.findOne(user.organizationId, id); }
  @Patch(':id') update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateParticipantDto) { return this.participants.update(user.organizationId, id, dto); }
}
