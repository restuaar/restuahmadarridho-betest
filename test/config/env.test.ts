import { loadEnv, getEnv } from '../../src/config/env';

describe('loadEnv', () => {
  const base = {
    NODE_ENV: 'test', PORT: '3000',
    MONGO_URI: 'mongodb://x', REDIS_URL: 'redis://x',
    JWT_SECRET: 'secret', JWT_EXPIRES_IN: '1h',
    JWT_REFRESH_SECRET: 'refresh', JWT_REFRESH_TTL: '604800',
    CACHE_TTL: '300',
  };

  it('parses valid env', () => {
    const env = loadEnv(base);
    expect(env.port).toBe(3000);
    expect(env.cacheTtl).toBe(300);
    expect(env.mongoUri).toBe('mongodb://x');
  });

  it('throws when required var missing', () => {
    const { JWT_SECRET, ...rest } = base;
    expect(() => loadEnv(rest as any)).toThrow();
  });
});

describe('getEnv', () => {
  it('loads from process.env and caches the result', () => {
    process.env.MONGO_URI = 'mongodb://cache-test';
    process.env.REDIS_URL = 'redis://cache-test';
    process.env.JWT_SECRET = 'cache-secret';
    process.env.JWT_REFRESH_SECRET = 'cache-refresh';
    const a = getEnv();
    const b = getEnv();
    expect(a).toBe(b); // cached singleton
    expect(a.mongoUri).toBe('mongodb://cache-test');
  });
});
