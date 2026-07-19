export type Role = 'admin' | 'user';

export interface Env {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshTtl: number;
  cacheTtl: number;
}

export interface JwtPayload {
  sub: string;
  userId: string;
  role: string;
}

export interface RefreshPayload extends JwtPayload {
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  incr(key: string): Promise<number>;
  getNumber(key: string): Promise<number>;
}

export interface User {
  userId: string;
  fullName: string;
  accountNumber: string;
  emailAddress: string;
  registrationNumber: string;
  role: Role;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Account {
  accountId: string;
  userName: string;
  password: string;
  lastLoginDateTime: Date | null;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export interface ListOptions {
  sort?: string;
  order?: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface UserFilter {
  fullName?: string;
  role?: string;
  emailAddress?: string;
  accountNumber?: string;
  registrationNumber?: string;
  userId?: string;
}

export interface AccountFilter {
  userName?: string;
  userId?: string;
  accountId?: string;
  inactiveDays?: number;
}
