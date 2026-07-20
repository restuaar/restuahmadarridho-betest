import { MongoMemoryServer } from 'mongodb-memory-server';
import { runSeed } from '../src/seed';
import { AccountModel } from '../src/models/account';
import { UserModel } from '../src/models/user';
import { connectMongo, disconnectMongo } from '../src/db/mongo';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.REDIS_URL = 'redis://seed-test';
  process.env.JWT_SECRET = 'seed-secret';
  process.env.JWT_REFRESH_SECRET = 'seed-refresh';
}, 120000);

afterAll(async () => { await mongod.stop(); });

describe('runSeed', () => {
  it('creates an admin account then is idempotent on re-run', async () => {
    await runSeed();          // create branch
    await runSeed();          // idempotent skip branch

    await connectMongo(process.env.MONGO_URI!);
    const accounts = await AccountModel.countDocuments({ userName: 'admin' });
    const users = await UserModel.countDocuments({ role: 'admin' });
    expect(accounts).toBe(1);
    expect(users).toBe(1);
    await disconnectMongo();
  });
});
