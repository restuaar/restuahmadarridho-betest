import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { ok } from '../utils/response';
import { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE } from '../utils/cookies';

function refreshTokenFrom(req: Request): string {
  const cookie = req.cookies?.[REFRESH_COOKIE];
  if (typeof cookie === 'string' && cookie) return cookie;
  return (req.body?.refreshToken as string) ?? '';
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userName, password } = req.body;
    const { accessToken, refreshToken } = await authService.login(userName, password);
    setRefreshCookie(res, refreshToken);
    res.json(ok({ accessToken }));
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.refresh(refreshTokenFrom(req));
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout(refreshTokenFrom(req));
    clearRefreshCookie(res);
    res.json(ok({ loggedOut: true }));
  } catch (err) {
    next(err);
  }
}
