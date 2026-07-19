import express from 'express';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { errorFilter } from './middlewares/error-filter';
import { getEnv } from './config/env';
import { connectMongo } from './db/mongo';

export const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', routes);
app.use(errorFilter);

async function bootstrap(): Promise<void> {
  const env = getEnv();
  await connectMongo(env.mongoUri);
  app.listen(env.port, () => console.log(`listening on ${env.port}`));
}

if (require.main === module) {
  bootstrap().catch((err) => { console.error('bootstrap failed', err); process.exit(1); });
}
