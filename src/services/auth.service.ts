import * as accountRepo from '../repositories/account.repository';
import * as userRepo from '../repositories/user.repository';
import { comparePassword } from '../utils/password';
import { issueTokens, revokeRefreshToken, refreshAccessToken } from './token.service';
import { UnauthorizedException } from '../exceptions/app-exception';
import { TokenPair } from '../types';

export async function login(userName: string, password: string): Promise<TokenPair> {
  const account = await accountRepo.findAccountByUserName(userName);
  if (!account) throw new UnauthorizedException('Invalid credentials');

  const match = await comparePassword(password, account.password);
  if (!match) throw new UnauthorizedException('Invalid credentials');

  const user = await userRepo.findUserById(account.userId);
  await accountRepo.updateLastLogin(account.accountId, new Date());

  return issueTokens({
    sub: account.accountId,
    userId: account.userId,
    role: user?.role ?? 'user',
  });
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  const accessToken = await refreshAccessToken(refreshToken);
  return { accessToken };
}

export async function logout(refreshToken: string): Promise<void> {
  await revokeRefreshToken(refreshToken);
}
