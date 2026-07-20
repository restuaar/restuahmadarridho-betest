import { Response, CookieOptions } from 'express';

export const REFRESH_COOKIE = 'refresh_token';

function refreshTtlMs(): number {
  return Number(process.env.JWT_REFRESH_TTL ?? 604800) * 1000;
}

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE, refreshToken, { ...baseOptions(), maxAge: refreshTtlMs() });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, baseOptions());
}
