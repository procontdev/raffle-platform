import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateOrganizationLiveSettingsDto {
  @ApiProperty({ example: 24, minimum: 8, maximum: 90 })
  @IsInt() @Min(8) @Max(90)
  marqueeSpeedSeconds!: number;
}
