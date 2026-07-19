import { getRedis } from '../db/redis';

function ttl(): number {
  return Number(process.env.CACHE_TTL ?? 300);
}

export async function get<T>(key: string): Promise<T | null> {
  const raw = await getRedis().get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds ?? ttl());
}

export async function del(...keys: string[]): Promise<void> {
  if (keys.length) await getRedis().del(...keys);
}

export async function incr(key: string): Promise<number> {
  return getRedis().incr(key);
}

export async function getNumber(key: string): Promise<number> {
  const raw = await getRedis().get(key);
  return raw ? Number(raw) : 0;
}
