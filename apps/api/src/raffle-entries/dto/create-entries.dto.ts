import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RaffleEntrySource } from '../../generated/prisma/client.js';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateEntriesDto {
  @ApiProperty() @IsUUID()
  participantId!: string;

  @ApiProperty({ minimum: 1, maximum: 10000 }) @IsInt() @Min(1) @Max(10000)
  quantity!: number;

  @ApiProperty({ enum: RaffleEntrySource }) @IsEnum(RaffleEntrySource)
  source!: RaffleEntrySource;

  @ApiPropertyOptional() @IsOptional() @IsString()
  paymentReference?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  paymentAmount?: number;
}
