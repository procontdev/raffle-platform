import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsUUID } from 'class-validator';
import { RaffleEntryStatus } from '../../generated/prisma/client.js';

export class BulkUpdateEntryStatusDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true })
  entryIds!: string[];

  @ApiProperty({ enum: RaffleEntryStatus })
  @IsEnum(RaffleEntryStatus)
  status!: RaffleEntryStatus;
}
