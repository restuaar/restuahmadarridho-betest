import { v7 as uuidv7 } from 'uuid';
import { getEnv } from './config/env';
import { connectMongo, disconnectMongo } from './db/mongo';
import { UserModel } from './models/user';
import { AccountModel } from './models/account';
import { hashPassword } from './utils/password';

const SEED_USERNAME = 'admin';
const SEED_PASSWORD = 'admin123';

export async function runSeed(): Promise<void> {
  const env = getEnv();
  await connectMongo(env.mongoUri);

  const existing = await AccountModel.findOne({ userName: SEED_USERNAME }).exec();
  if (existing) {
    console.log(`seed: account "${SEED_USERNAME}" already exists, skipping`);
    await disconnectMongo();
    return;
  }

  const userId = uuidv7();
  await UserModel.create({
    userId,
    fullName: 'Admin User',
    accountNumber: 'ACC-0001',
    emailAddress: 'admin@example.com',
    registrationNumber: 'REG-0001',
    role: 'admin',
  });
  await AccountModel.create({
    accountId: uuidv7(),
    userName: SEED_USERNAME,
    password: await hashPassword(SEED_PASSWORD),
    userId,
    lastLoginDateTime: null,
  });

  console.log(`seed: created admin account (userName=${SEED_USERNAME}, password=${SEED_PASSWORD})`);
  await disconnectMongo();
}

if (require.main === module) {
  runSeed().catch((err) => { console.error('seed failed', err); process.exit(1); });
}
