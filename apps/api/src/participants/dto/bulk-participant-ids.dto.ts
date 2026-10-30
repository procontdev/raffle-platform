import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class BulkParticipantIdsDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true })
  participantIds!: string[];
}
