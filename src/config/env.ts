import { z } from 'zod';
import { Env } from '../types';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_REFRESH_TTL: z.coerce.number().default(604800),
  CACHE_TTL: z.coerce.number().default(300),
});

export function loadEnv(raw: NodeJS.ProcessEnv): Env {
  const p = schema.parse(raw);
  return {
    nodeEnv: p.NODE_ENV,
    port: p.PORT,
    mongoUri: p.MONGO_URI,
    redisUrl: p.REDIS_URL,
    jwtSecret: p.JWT_SECRET,
    jwtExpiresIn: p.JWT_EXPIRES_IN,
    jwtRefreshSecret: p.JWT_REFRESH_SECRET,
    jwtRefreshTtl: p.JWT_REFRESH_TTL,
    cacheTtl: p.CACHE_TTL,
  };
}

let cached: Env | null = null;
export function getEnv(): Env {
  if (!cached) {
    require('dotenv').config();
    cached = loadEnv(process.env);
  }
  return cached;
}
