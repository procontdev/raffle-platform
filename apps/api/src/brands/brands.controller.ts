import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { BrandsService } from './brands.service.js';
import { UpdateBrandThemeDto } from './dto/update-brand-theme.dto.js';

@ApiTags('Brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) { return this.brands.list(user.organizationId); }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.brands.findOne(user.organizationId, id); }

  @Patch(':id/theme')
  updateTheme(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandThemeDto) { return this.brands.updateTheme(user.organizationId, id, dto); }
}
