import { ApiProperty } from '@nestjs/swagger';
import { RaffleEntryStatus } from '../../generated/prisma/client.js';
import { IsEnum } from 'class-validator';

export class UpdateEntryDto {
  @ApiProperty({ enum: RaffleEntryStatus }) @IsEnum(RaffleEntryStatus)
  status!: RaffleEntryStatus;
}
