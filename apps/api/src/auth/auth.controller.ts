import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { InMemoryRateLimitGuard } from '../common/in-memory-rate-limit.guard.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @UseGuards(InMemoryRateLimitGuard)
  @ApiOperation({ summary: 'Authenticate a user' })
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }
}
