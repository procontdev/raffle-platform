import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRaffleDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) slug!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() @MinLength(1) prizeName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prizeDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prizeImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() closesAt?: string;
}
