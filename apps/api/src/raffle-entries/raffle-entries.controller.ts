import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CreateEntriesDto } from './dto/create-entries.dto.js';
import { ListEntriesDto } from './dto/list-entries.dto.js';
import { UpdateEntryDto } from './dto/update-entry.dto.js';
import { CsvImportService } from './csv-import.service.js';
import { RaffleEntriesService } from './raffle-entries.service.js';

@ApiTags('Raffle Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('raffles/:raffleId')
export class RaffleEntriesController {
  constructor(private readonly entries: RaffleEntriesService, private readonly csv: CsvImportService) {}

  @Post('entries')
  createMany(@CurrentUser() user: AuthenticatedUser, @Param('raffleId', ParseUUIDPipe) raffleId: string, @Body() dto: CreateEntriesDto) {
    return this.entries.createMany(user.organizationId, raffleId, dto);
  }

  @Get('entries')
  list(@CurrentUser() user: AuthenticatedUser, @Param('raffleId', ParseUUIDPipe) raffleId: string, @Query() filters: ListEntriesDto) {
    return this.entries.list(user.organizationId, raffleId, filters);
  }

  @Get('entries/:entryId')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('raffleId', ParseUUIDPipe) raffleId: string, @Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.entries.findOne(user.organizationId, raffleId, entryId);
  }

  @Patch('entries/:entryId')
  update(@CurrentUser() user: AuthenticatedUser, @Param('raffleId', ParseUUIDPipe) raffleId: string, @Param('entryId', ParseUUIDPipe) entryId: string, @Body() dto: UpdateEntryDto) {
    return this.entries.update(user.organizationId, raffleId, entryId, dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } })
  async import(@CurrentUser() user: AuthenticatedUser, @Param('raffleId', ParseUUIDPipe) raffleId: string, @UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('CSV file is required');
    return this.csv.import(user.organizationId, raffleId, file.buffer);
  }
}
