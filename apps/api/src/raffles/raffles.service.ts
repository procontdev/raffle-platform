import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedUser } from '../auth/auth.types.js';
import { CreateRaffleDto } from './dto/create-raffle.dto.js';
import { UpdateRaffleDto } from './dto/update-raffle.dto.js';

@Injectable()
export class RafflesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateRaffleDto) {
    if (dto.startsAt && dto.closesAt && new Date(dto.startsAt) >= new Date(dto.closesAt)) throw new BadRequestException('startsAt must be before closesAt');
    if (dto.brandId) await this.requireBrand(user.organizationId, dto.brandId);
    return this.prisma.raffle.create({ data: { ...dto, organizationId: user.organizationId, createdById: user.id, startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined, closesAt: dto.closesAt ? new Date(dto.closesAt) : undefined }, });
  }

  list(organizationId: string) { return this.prisma.raffle.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } }); }

  async findOne(organizationId: string, id: string) {
    const raffle = await this.prisma.raffle.findFirst({ where: { id, organizationId } });
    if (!raffle) throw new NotFoundException('Raffle not found');
    return raffle;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateRaffleDto) {
    const raffle = await this.findOne(user.organizationId, id);
    if (!['DRAFT', 'OPEN'].includes(raffle.status)) throw new BadRequestException('Only DRAFT and OPEN raffles can be modified');
    if (dto.status && !['DRAFT', 'OPEN', 'CANCELLED'].includes(dto.status)) throw new BadRequestException('Invalid status transition for this iteration');
    if (dto.brandId) await this.requireBrand(user.organizationId, dto.brandId);
    const data = { ...dto, startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined, closesAt: dto.closesAt ? new Date(dto.closesAt) : undefined };
    return this.prisma.raffle.update({ where: { id: raffle.id }, data });
  }

  private async requireBrand(organizationId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id, organizationId } });
    if (!brand) throw new NotFoundException('Brand not found');
  }
}
