import request from 'supertest';
import { app } from '../../src/server';
import { closeRedis } from '../../src/db/redis';

afterAll(async () => { await closeRedis(); });

describe('app wiring', () => {
  it('GET /api/health → 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('protected route without token → 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});
