import { UserModel } from '../../src/models/user';
import { AccountModel } from '../../src/models/account';

describe('models', () => {
  it('User requires role enum', () => {
    const doc = new UserModel({
      userId: 'u1', fullName: 'A', accountNumber: 'acc1',
      emailAddress: 'a@b.com', registrationNumber: 'r1', role: 'invalid' as any,
    });
    const err = doc.validateSync();
    expect(err?.errors.role).toBeDefined();
  });

  it('Account toJSON hides password', () => {
    const doc = new AccountModel({
      accountId: 'a1', userName: 'john', password: 'hashed', userId: 'u1', lastLoginDateTime: null,
    });
    const json = doc.toJSON() as any;
    expect(json.password).toBeUndefined();
    expect(json.userName).toBe('john');
  });

  it('User declares its indexes', () => {
    const keys = UserModel.schema.indexes().map(([k]) => Object.keys(k)[0]);
    expect(keys).toEqual(expect.arrayContaining(['accountNumber', 'registrationNumber', 'emailAddress', 'role', 'fullName']));
  });
});
