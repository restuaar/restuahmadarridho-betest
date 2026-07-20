jest.mock('../../src/db/redis', () => ({
  getRedis: () => ({ ping: async () => { throw new Error('unreachable'); } }),
}));
jest.mock('../../src/db/mongo', () => ({ mongoState: () => 0 }));

import { check } from '../../src/controllers/health.controller';

describe('health.controller.check (dependencies down)', () => {
  it('reports mongo + redis as down without throwing', async () => {
    const res: any = { json: jest.fn() };
    await check({} as any, res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { status: 'ok', mongo: 'down', redis: 'down' },
    });
  });
});
