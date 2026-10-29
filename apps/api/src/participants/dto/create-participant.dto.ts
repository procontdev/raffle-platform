import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateParticipantDto {
  @ApiProperty({ example: 'Carlos Perez' })
  @IsString() @MinLength(1) @MaxLength(200)
  displayName!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({ type: Object }) @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;
}
