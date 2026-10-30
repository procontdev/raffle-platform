import { CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

type RequestLike = { ip?: string; path?: string };

export class InMemoryRateLimitGuard implements CanActivate {
  private static readonly buckets = new Map<string, { startedAt: number; count: number }>();

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const key = `${request.ip ?? 'unknown'}:${request.path ?? 'route'}`;
    const now = Date.now(); const current = InMemoryRateLimitGuard.buckets.get(key); const windowMs = 60_000; const max = request.path?.includes('/auth/login') ? 10 : 120;
    const bucket = !current || now - current.startedAt >= windowMs ? { startedAt: now, count: 1 } : { startedAt: current.startedAt, count: current.count + 1 };
    InMemoryRateLimitGuard.buckets.set(key, bucket);
    if (bucket.count > max) throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
