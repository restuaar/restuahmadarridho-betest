import { Request, Response, NextFunction } from 'express';
import { UnauthorizedException } from '../exceptions/app-exception';
import { verifyAccessToken, refreshAccessToken } from '../services/token.service';
import { ACCESS_COOKIE, REFRESH_COOKIE, setAccessCookie } from '../utils/cookies';

export async function jwtAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const accessToken = req.cookies?.[ACCESS_COOKIE];

  if (accessToken) {
    try {
      (req as any).user = verifyAccessToken(accessToken);
      return next();
    } catch {
      void 0;
    }
  }

  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    return next(new UnauthorizedException('Not authenticated'));
  }

  try {
    const newAccessToken = await refreshAccessToken(refreshToken);
    setAccessCookie(res, newAccessToken);
    (req as any).user = verifyAccessToken(newAccessToken);
    return next();
  } catch {
    return next(new UnauthorizedException('Not authenticated'));
  }
}
