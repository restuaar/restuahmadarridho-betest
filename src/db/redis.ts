import Redis from 'ioredis';

let client: Redis | null = null;

export function getRedis(url?: string): Redis {
  if (!client) {
    client = new Redis(url ?? process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    client.on('error', () => {});
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    client.disconnect();
    client = null;
  }
}
