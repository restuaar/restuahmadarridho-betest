import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { ok } from '../utils/response';
import { setAuthCookies, setAccessCookie, clearAuthCookies, REFRESH_COOKIE } from '../utils/cookies';

function refreshTokenFrom(req: Request): string {
  const cookie = req.cookies?.[REFRESH_COOKIE];
  if (typeof cookie === 'string' && cookie) return cookie;
  return (req.body?.refreshToken as string) ?? '';
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userName, password } = req.body;
    const { accessToken, refreshToken } = await authService.login(userName, password);
    setAuthCookies(res, accessToken, refreshToken);
    res.json(ok({ loggedIn: true }));
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accessToken } = await authService.refresh(refreshTokenFrom(req));
    setAccessCookie(res, accessToken);
    res.json(ok({ refreshed: true }));
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout(refreshTokenFrom(req));
    clearAuthCookies(res);
    res.json(ok({ loggedOut: true }));
  } catch (err) {
    next(err);
  }
}
