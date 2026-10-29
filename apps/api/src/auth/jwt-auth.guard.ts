import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedUser } from './auth.types.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthenticatedUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw new UnauthorizedException('Bearer token required');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; organizationId: string }>(token);
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, organizationId: payload.organizationId, status: 'ACTIVE' },
        select: { id: true, email: true, role: true, organizationId: true },
      });
      if (!user) throw new UnauthorizedException('User is inactive or does not exist');
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
