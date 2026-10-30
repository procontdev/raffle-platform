import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString, IsUUID, MaxLength, ArrayMinSize } from 'class-validator';

export class BulkUpdateParticipantsDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true })
  participantIds!: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsEmail() @MaxLength(320)
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(50)
  phone?: string | null;
}
