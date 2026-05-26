import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';

const SALT_ROUNDS = 10;

function getJwtOptions(envKey: 'JWT_EXPIRES_IN' | 'JWT_REFRESH_EXPIRES_IN', fallback: string): SignOptions {
  return { expiresIn: (process.env[envKey] ?? fallback) as SignOptions['expiresIn'] };
}

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async login(username: string, password: string) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      getJwtOptions('JWT_EXPIRES_IN', '15m')
    );
    const refreshToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_REFRESH_SECRET!,
      getJwtOptions('JWT_REFRESH_EXPIRES_IN', '7d')
    );

    return { accessToken, refreshToken, user: { id: user.id, username: user.username, role: user.role } };
  },

  verifyRefreshToken(token: string) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string; role: 'SUPERVISOR' | 'VIEWER' };
  },

  signAccessToken(userId: string, role: 'SUPERVISOR' | 'VIEWER') {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET!, getJwtOptions('JWT_EXPIRES_IN', '15m'));
  },

  signRefreshToken(userId: string, role: 'SUPERVISOR' | 'VIEWER') {
    return jwt.sign({ userId, role }, process.env.JWT_REFRESH_SECRET!, getJwtOptions('JWT_REFRESH_EXPIRES_IN', '7d'));
  },
};
