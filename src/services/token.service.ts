import jwt from 'jsonwebtoken';
import { v7 as uuidv7 } from 'uuid';
import * as cache from '../cache';
import { UnauthorizedException, InternalException } from '../exceptions/app-exception';
import { JwtPayload, RefreshPayload, TokenPair } from '../types';

const refreshKey = (jti: string) => `refresh:${jti}`;

function accessSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new InternalException('JWT_SECRET not configured');
  return secret;
}

function refreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new InternalException('JWT_REFRESH_SECRET not configured');
  return secret;
}

function refreshTtl(): number {
  return Number(process.env.JWT_REFRESH_TTL ?? 604800);
}

function claims(payload: JwtPayload) {
  return { sub: payload.sub, userId: payload.userId, role: payload.role };
}

export function signAccessToken(payload: JwtPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '15m';
  return jwt.sign(claims(payload), accessSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, accessSecret()) as JwtPayload;
}

export async function issueTokens(payload: JwtPayload): Promise<TokenPair> {
  const jti = uuidv7();
  const ttl = refreshTtl();

  const accessToken = signAccessToken(payload);
  const refreshToken = jwt.sign({ ...claims(payload), jti }, refreshSecret(), { expiresIn: ttl } as jwt.SignOptions);

  await cache.set(refreshKey(jti), payload.sub, ttl);
  return { accessToken, refreshToken };
}

export async function verifyRefreshToken(token: string): Promise<RefreshPayload> {
  const payload = jwt.verify(token, refreshSecret()) as RefreshPayload;

  const stored = await cache.get<string>(refreshKey(payload.jti));
  if (!stored) throw new UnauthorizedException('Refresh token revoked');

  return payload;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    const payload = jwt.verify(token, refreshSecret()) as RefreshPayload;
    await cache.del(refreshKey(payload.jti));
  } catch {
    void 0;
  }
}

export async function refreshAccessToken(token: string): Promise<string> {
  const payload = await verifyRefreshToken(token);
  return signAccessToken(payload);
}
