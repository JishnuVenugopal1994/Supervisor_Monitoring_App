import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authService } from './authService';
import prismaMock from '../__mocks__/prisma';

// Set required env vars before the module initialises
process.env.JWT_SECRET = 'test-secret-key-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const PASSWORD = 'password123';

const baseUser = {
  id: 'user1',
  username: 'supervisor',
  passwordHash: bcrypt.hashSync(PASSWORD, 10),
  role: 'SUPERVISOR' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('authService.login', () => {
  it('returns accessToken, refreshToken and user on valid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseUser);

    const result = await authService.login('supervisor', PASSWORD);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user).toEqual({
      id: 'user1',
      username: 'supervisor',
      role: 'SUPERVISOR',
    });
  });

  it('includes userId and role claims in the access token', async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseUser);

    const { accessToken } = await authService.login('supervisor', PASSWORD);
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as Record<string, unknown>;

    expect(decoded.userId).toBe('user1');
    expect(decoded.role).toBe('SUPERVISOR');
  });

  it('throws on wrong password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseUser);

    await expect(authService.login('supervisor', 'wrongpassword')).rejects.toThrow('Invalid credentials');
  });

  it('throws on unknown username', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(authService.login('nobody', PASSWORD)).rejects.toThrow('Invalid credentials');
  });
});

describe('authService.verifyRefreshToken', () => {
  it('returns userId and role for a valid refresh token', () => {
    const token = jwt.sign(
      { userId: 'user1', role: 'SUPERVISOR' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    const payload = authService.verifyRefreshToken(token);

    expect(payload.userId).toBe('user1');
    expect(payload.role).toBe('SUPERVISOR');
  });

  it('throws for a token signed with the wrong secret', () => {
    const token = jwt.sign({ userId: 'user1', role: 'SUPERVISOR' }, 'wrong-secret');

    expect(() => authService.verifyRefreshToken(token)).toThrow();
  });

  it('throws for a malformed token string', () => {
    expect(() => authService.verifyRefreshToken('not.a.token')).toThrow();
  });
});

describe('authService.signAccessToken', () => {
  it('produces a JWT verifiable with JWT_SECRET', () => {
    const token = authService.signAccessToken('user1', 'VIEWER');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as Record<string, unknown>;

    expect(decoded.userId).toBe('user1');
    expect(decoded.role).toBe('VIEWER');
  });
});
