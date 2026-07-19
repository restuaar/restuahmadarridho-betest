import { Response, CookieOptions } from 'express';

export const ACCESS_COOKIE = 'access_token';
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

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const options = { ...baseOptions(), maxAge: refreshTtlMs() };
  res.cookie(ACCESS_COOKIE, accessToken, options);
  res.cookie(REFRESH_COOKIE, refreshToken, options);
}

export function setAccessCookie(res: Response, accessToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseOptions(), maxAge: refreshTtlMs() });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, baseOptions());
  res.clearCookie(REFRESH_COOKIE, baseOptions());
}
