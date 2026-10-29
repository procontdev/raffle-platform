import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) { return this.prisma.brand.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }); }

  async findOne(organizationId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id, organizationId } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }
}
