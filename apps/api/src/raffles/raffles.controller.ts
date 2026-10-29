import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CreateRaffleDto } from './dto/create-raffle.dto.js';
import { UpdateRaffleDto } from './dto/update-raffle.dto.js';
import { RafflesService } from './raffles.service.js';

@ApiTags('Raffles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('raffles')
export class RafflesController {
  constructor(private readonly raffles: RafflesService) {}

  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRaffleDto) { return this.raffles.create(user, dto); }
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.raffles.list(user.organizationId); }
  @Get(':id') findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.raffles.findOne(user.organizationId, id); }
  @Patch(':id') update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRaffleDto) { return this.raffles.update(user, id, dto); }
}
