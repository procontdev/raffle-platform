import { ApiProperty } from '@nestjs/swagger';
import { BrandStatus } from '../../generated/prisma/client.js';

export class BrandResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ nullable: true }) logoUrl!: string | null;
  @ApiProperty({ nullable: true }) themeConfig!: unknown;
  @ApiProperty({ enum: BrandStatus }) status!: BrandStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
