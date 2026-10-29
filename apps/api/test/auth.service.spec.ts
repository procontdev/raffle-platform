import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import * as argon2 from 'argon2';
import { AuthService } from '../src/auth/auth.service.js';

describe('AuthService', () => {
  it('logs in with a valid password and never returns passwordHash', async () => {
    const passwordHash = await argon2.hash('correct-password');
    const prisma = { user: { findFirst: jest.fn().mockResolvedValue({ id: 'u1', email: 'admin@example.com', passwordHash, role: 'ADMIN', organizationId: 'o1', status: 'ACTIVE' }) } };
    const jwt = { signAsync: jest.fn().mockResolvedValue('token') };
    const result = await new AuthService(prisma as never, jwt as never).login({ email: 'ADMIN@example.com', password: 'correct-password' });
    expect(result).toEqual({ accessToken: 'token', user: { id: 'u1', email: 'admin@example.com', role: 'ADMIN', organizationId: 'o1' } });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('rejects an incorrect password', async () => {
    const prisma = { user: { findFirst: jest.fn().mockResolvedValue({ id: 'u1', email: 'admin@example.com', passwordHash: await argon2.hash('correct-password'), role: 'ADMIN', organizationId: 'o1', status: 'ACTIVE' }) } };
    await expect(new AuthService(prisma as never, {} as never).login({ email: 'admin@example.com', password: 'wrong-password' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
