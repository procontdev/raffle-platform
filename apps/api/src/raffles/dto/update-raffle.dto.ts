import { ApiPropertyOptional } from '@nestjs/swagger';
import { RaffleStatus } from '../../generated/prisma/client.js';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateRaffleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prizeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prizeDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prizeImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() brandId?: string;
  @ApiPropertyOptional({ enum: RaffleStatus }) @IsOptional() @IsEnum(RaffleStatus) status?: RaffleStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() closesAt?: string;
}
