import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { logEvent } from '../common/structured-log.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email.toLowerCase() }, select: { id: true, email: true, passwordHash: true, role: true, organizationId: true, status: true } });
    if (!user || user.status !== 'ACTIVE' || !(await argon2.verify(user.passwordHash, dto.password))) { logEvent('AUTH_LOGIN_FAILED'); throw new UnauthorizedException('Invalid credentials'); }
    const userResponse = { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId };
    logEvent('AUTH_LOGIN_SUCCESS', { organizationId: user.organizationId, userId: user.id });
    return { accessToken: await this.jwt.signAsync({ sub: user.id, organizationId: user.organizationId, role: user.role }), user: userResponse };
  }
}
