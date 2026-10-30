import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { OrganizationService } from './organization.service.js';
import { UpdateOrganizationLiveSettingsDto } from './dto/update-organization-live-settings.dto.js';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizations: OrganizationService) {}

  @Get()
  find(@CurrentUser() user: AuthenticatedUser) { return this.organizations.findForUser(user.organizationId); }

  @Patch('live-settings')
  updateLiveSettings(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOrganizationLiveSettingsDto) { return this.organizations.updateLiveSettings(user.organizationId, dto); }
}
