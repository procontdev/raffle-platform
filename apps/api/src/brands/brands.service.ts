import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateBrandThemeDto } from './dto/update-brand-theme.dto.js';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) { return this.prisma.brand.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }); }

  async findOne(organizationId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id, organizationId } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async updateTheme(organizationId: string, id: string, dto: UpdateBrandThemeDto) {
    const brand = await this.findOne(organizationId, id);
    const currentTheme = brand.themeConfig && typeof brand.themeConfig === 'object' && !Array.isArray(brand.themeConfig) ? brand.themeConfig as Record<string, unknown> : {};
    return this.prisma.brand.update({ where: { id: brand.id }, data: { themeConfig: { ...currentTheme, liveTemplate: dto.liveTemplate } as Prisma.InputJsonValue } });
  }
}
