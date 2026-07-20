import { getRedis, closeRedis } from '../../src/db/redis';

describe('redis singleton', () => {
  afterAll(async () => { await closeRedis(); });
  it('returns the same instance', () => {
    const a = getRedis('redis://localhost:6379');
    const b = getRedis('redis://localhost:6379');
    expect(a).toBe(b);
  });
});
