// Hermetic Redis double so cache + refresh-token storage run without a server.
jest.mock('../../src/db/redis', () => {
  const store = new Map<string, string>();
  const client = {
    get: async (k: string) => (store.has(k) ? store.get(k) : null),
    set: async (k: string, v: string) => { store.set(k, v); return 'OK'; },
    del: async (...keys: string[]) => { let n = 0; for (const k of keys) { if (store.delete(k)) n++; } return n; },
    incr: async (k: string) => { const n = Number(store.get(k) ?? '0') + 1; store.set(k, String(n)); return n; },
    ping: async () => 'PONG',
  };
  return { getRedis: () => client, closeRedis: async () => {} };
});

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/server';
import { connectMongo, disconnectMongo } from '../../src/db/mongo';
import { UserModel } from '../../src/models/user';
import { AccountModel } from '../../src/models/account';
import { hashPassword } from '../../src/utils/password';

process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefresh';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_TTL = '604800';

let mongod: MongoMemoryServer;
let access = '';
let refresh = '';

// Reads name=value pairs out of a response's Set-Cookie header.
function cookiesFrom(res: request.Response): Record<string, string> {
  const jar: Record<string, string> = {};
  for (const c of (res.headers['set-cookie'] ?? []) as unknown as string[]) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    jar[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return jar;
}

const cookie = (...parts: string[]) => ({ Cookie: parts.join('; ') });
const authCookie = () => cookie(`access_token=${access}`);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectMongo(mongod.getUri());
  await Promise.all([UserModel.init(), AccountModel.init()]);

  await UserModel.create({
    userId: 'boot-user', fullName: 'Boot', accountNumber: 'BOOT',
    emailAddress: 'boot@example.com', registrationNumber: 'BOOTR', role: 'admin',
  });
  await AccountModel.create({
    accountId: 'boot-acc', userName: 'admin', password: await hashPassword('admin123'),
    userId: 'boot-user', lastLoginDateTime: null,
  });
}, 120000);

afterAll(async () => {
  await disconnectMongo();
  await mongod.stop();
});

describe('API integration (HTTP)', () => {
  let userId = '';
  let accountId = '';

  it('POST /api/auth/login sets access + refresh cookies', async () => {
    const res = await request(app).post('/api/auth/login').send({ userName: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.data.loggedIn).toBe(true);
    const jar = cookiesFrom(res);
    access = jar.access_token;
    refresh = jar.refresh_token;
    expect(access).toBeTruthy();
    expect(refresh).toBeTruthy();
  });

  it('login with wrong password → 401', async () => {
    expect((await request(app).post('/api/auth/login').send({ userName: 'admin', password: 'nope' })).status).toBe(401);
  });

  it('GET /api/health → 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.mongo).toBe('up');
    expect(res.body.data.redis).toBe('up');
  });

  it('protected route without any cookie → 401', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401);
  });

  it('POST /api/users creates a user with a UUIDv7 id', async () => {
    const res = await request(app).post('/api/users').set(authCookie()).send({
      fullName: 'Alice', accountNumber: 'A100', emailAddress: 'alice@example.com',
      registrationNumber: 'R100', role: 'user',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.userId).toMatch(/-7/);
    userId = res.body.data.userId;
  });

  it('duplicate accountNumber → 409; invalid email → 400', async () => {
    expect((await request(app).post('/api/users').set(authCookie()).send({
      fullName: 'Dup', accountNumber: 'A100', emailAddress: 'dup@example.com', registrationNumber: 'R999', role: 'user',
    })).status).toBe(409);
    expect((await request(app).post('/api/users').set(authCookie()).send({
      fullName: 'Bad', accountNumber: 'A2', emailAddress: 'nope', registrationNumber: 'R2', role: 'user',
    })).status).toBe(400);
  });

  it('list (cached 2nd call) + reads by accountNumber/registrationNumber', async () => {
    const first = await request(app).get('/api/users?role=user&sort=fullName&order=asc&page=1&limit=10').set(authCookie());
    expect(first.body.meta.total).toBe(1);
    await request(app).get('/api/users?role=user&sort=fullName&order=asc&page=1&limit=10').set(authCookie());
    expect((await request(app).get('/api/users?accountNumber=A100').set(authCookie())).body.data[0].userId).toBe(userId);
    expect((await request(app).get('/api/users?accountNumber=A100').set(authCookie())).body.data[0].userId).toBe(userId);
    expect((await request(app).get('/api/users?registrationNumber=R100').set(authCookie())).body.data[0].accountNumber).toBe('A100');
  });

  it('detail (cached) + 404; PATCH partial + 404', async () => {
    expect((await request(app).get(`/api/users/${userId}`).set(authCookie())).body.data.role).toBe('user');
    expect((await request(app).get(`/api/users/${userId}`).set(authCookie())).body.data.userId).toBe(userId);
    expect((await request(app).get('/api/users/nope').set(authCookie())).status).toBe(404);
    expect((await request(app).patch(`/api/users/${userId}`).set(authCookie()).send({ fullName: 'Alice B' })).body.data.fullName).toBe('Alice B');
    expect((await request(app).patch('/api/users/nope').set(authCookie()).send({ fullName: 'X' })).status).toBe(404);
  });

  it('accounts: create (password hidden) + duplicate 409 + list + detail + 404', async () => {
    const created = await request(app).post('/api/accounts').set(authCookie()).send({ userName: 'alice', password: 'alicepass', userId });
    expect(created.status).toBe(201);
    expect(created.body.data.password).toBeUndefined();
    accountId = created.body.data.accountId;

    expect((await request(app).post('/api/accounts').set(authCookie()).send({ userName: 'alice', password: 'dupsecret', userId })).status).toBe(409);

    const list = await request(app).get('/api/accounts?page=1&limit=10').set(authCookie());
    expect(list.body.data.some((a: any) => 'password' in a)).toBe(false);
    await request(app).get('/api/accounts?page=1&limit=10').set(authCookie());
    expect((await request(app).get(`/api/accounts/${accountId}`).set(authCookie())).body.data.userName).toBe('alice');
    expect((await request(app).get(`/api/accounts/${accountId}`).set(authCookie())).body.data.accountId).toBe(accountId);
    expect((await request(app).get('/api/accounts/nope').set(authCookie())).status).toBe(404);
  });

  it('stale + inactiveDays filters', async () => {
    expect((await request(app).get('/api/accounts/stale?days=3').set(authCookie())).body.data.length).toBe(0);
    expect((await request(app).get('/api/accounts?inactiveDays=0').set(authCookie())).body.meta.total).toBe(1);
  });

  // ── Refresh-token flow (cookies) ───────────────────────────────────────────
  it('auto-refresh: invalid access + valid refresh → 200 and re-sets access cookie', async () => {
    const res = await request(app).get('/api/users').set(cookie('access_token=garbage', `refresh_token=${refresh}`));
    expect(res.status).toBe(200);
    const set = (res.headers['set-cookie'] ?? []) as unknown as string[];
    expect(set.some((c) => c.startsWith('access_token='))).toBe(true);
  });

  it('auto-refresh: no access + valid refresh → 200', async () => {
    expect((await request(app).get('/api/users').set(cookie(`refresh_token=${refresh}`))).status).toBe(200);
  });

  it('invalid access + invalid refresh → 401', async () => {
    expect((await request(app).get('/api/users').set(cookie('access_token=garbage', 'refresh_token=garbage'))).status).toBe(401);
  });

  it('POST /api/auth/refresh sets a new access cookie', async () => {
    const res = await request(app).post('/api/auth/refresh').set(cookie(`refresh_token=${refresh}`));
    expect(res.status).toBe(200);
    expect(res.body.data.refreshed).toBe(true);
    expect(cookiesFrom(res).access_token).toBeTruthy();
  });

  it('POST /api/auth/logout revokes the refresh token', async () => {
    expect((await request(app).post('/api/auth/logout').set(cookie(`refresh_token=${refresh}`))).body.data.loggedOut).toBe(true);
    expect((await request(app).post('/api/auth/refresh').set(cookie(`refresh_token=${refresh}`))).status).toBe(401);
    expect((await request(app).get('/api/users').set(cookie(`refresh_token=${refresh}`))).status).toBe(401);
  });

  it('DELETE account + user (then 404)', async () => {
    expect((await request(app).delete(`/api/accounts/${accountId}`).set(authCookie())).body.data.deleted).toBe(true);
    expect((await request(app).delete('/api/accounts/nope').set(authCookie())).status).toBe(404);
    expect((await request(app).delete(`/api/users/${userId}`).set(authCookie())).body.data.deleted).toBe(true);
    expect((await request(app).delete('/api/users/nope').set(authCookie())).status).toBe(404);
  });
});
