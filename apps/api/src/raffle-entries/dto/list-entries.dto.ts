import { ApiPropertyOptional } from '@nestjs/swagger';
import { RaffleEntrySource, RaffleEntryStatus } from '../../generated/prisma/client.js';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListEntriesDto {
  @ApiPropertyOptional({ enum: RaffleEntryStatus }) @IsOptional() @IsEnum(RaffleEntryStatus)
  status?: RaffleEntryStatus;

  @ApiPropertyOptional({ enum: RaffleEntrySource }) @IsOptional() @IsEnum(RaffleEntrySource)
  source?: RaffleEntrySource;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  participantId?: string;
}
