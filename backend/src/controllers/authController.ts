import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = LoginSchema.parse(req.body);
  const { accessToken, refreshToken, user } = await authService.login(username, password);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  res.json({ accessToken, user });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  const payload = authService.verifyRefreshToken(token);
  const newAccessToken = authService.signAccessToken(payload.userId, payload.role);
  const newRefreshToken = authService.signRefreshToken(payload.userId, payload.role);
  res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
  res.json({ accessToken: newAccessToken });
};

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie('refreshToken');
  res.status(204).send();
};
