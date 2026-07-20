jest.mock('../../src/db/redis', () => {
  const store = new Map<string, string>();
  const client = {
    get: async (k: string) => (store.has(k) ? store.get(k) : null),
    set: async (k: string, v: string) => { store.set(k, v); return 'OK'; },
    del: async (...keys: string[]) => { let n = 0; for (const k of keys) { if (store.delete(k)) n++; } return n; },
    incr: async (k: string) => { const n = Number(store.get(k) ?? '0') + 1; store.set(k, String(n)); return n; },
  };
  return { getRedis: () => client, closeRedis: async () => {} };
});

import * as cache from '../../src/cache';

describe('cache', () => {
  it('roundtrips values, handles miss, empty del, incr, getNumber', async () => {
    expect(await cache.get('missing')).toBeNull();

    await cache.set('k', { a: 1 });
    expect(await cache.get('k')).toEqual({ a: 1 });

    await cache.del();          // empty-keys branch
    await cache.del('k');
    expect(await cache.get('k')).toBeNull();

    expect(await cache.incr('c')).toBe(1);
    expect(await cache.getNumber('c')).toBe(1);
    expect(await cache.getNumber('nope')).toBe(0);
  });
});
