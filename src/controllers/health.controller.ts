import { Request, Response } from 'express';
import { mongoState } from '../db/mongo';
import { getRedis } from '../db/redis';
import { ok } from '../utils/response';

async function redisStatus(): Promise<string> {
  try {
    const pong = await getRedis().ping();
    return pong === 'PONG' ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

export async function check(_req: Request, res: Response): Promise<void> {
  const mongo = mongoState() === 1 ? 'up' : 'down';
  const redis = await redisStatus();
  res.json(ok({ status: 'ok', mongo, redis }));
}
