import { Request, Response, NextFunction } from 'express';
import { UnauthorizedException } from '../exceptions/app-exception';
import { verifyAccessToken, refreshAccessToken } from '../services/token.service';
import { REFRESH_COOKIE } from '../utils/cookies';

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  return header && header.startsWith('Bearer ') ? header.slice(7) : null;
}

export async function jwtAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const accessToken = bearerToken(req);

  if (accessToken) {
    try {
      (req as any).user = verifyAccessToken(accessToken);
      return next();
    } catch {
      return refreshFromCookie(req, res, next);
    }
  }

  return refreshFromCookie(req, res, next);
}

async function refreshFromCookie(req: Request, res: Response, next: NextFunction): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    return next(new UnauthorizedException('Not authenticated'));
  }

  try {
    const newAccessToken = await refreshAccessToken(refreshToken);
    res.setHeader('x-access-token', newAccessToken);
    (req as any).user = verifyAccessToken(newAccessToken);
    return next();
  } catch {
    return next(new UnauthorizedException('Not authenticated'));
  }
}
