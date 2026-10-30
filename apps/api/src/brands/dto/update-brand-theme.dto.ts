import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum LiveTemplateOption {
  CLASSIC = 'classic',
  SPOTLIGHT = 'spotlight',
}

export class UpdateBrandThemeDto {
  @ApiProperty({ enum: LiveTemplateOption, example: LiveTemplateOption.SPOTLIGHT })
  @IsEnum(LiveTemplateOption)
  liveTemplate!: LiveTemplateOption;
}
