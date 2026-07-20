import { hashPassword, comparePassword } from '../../src/utils/password';
import { stableParamHash } from '../../src/utils/param-hash';
import { ok } from '../../src/utils/response';

describe('utils', () => {
  it('password hashes and verifies', async () => {
    const h = await hashPassword('secret');
    expect(h).not.toBe('secret');
    expect(await comparePassword('secret', h)).toBe(true);
    expect(await comparePassword('wrong', h)).toBe(false);
  });

  it('param hash is stable regardless of key order', () => {
    expect(stableParamHash({ a: 1, b: 2 })).toBe(stableParamHash({ b: 2, a: 1 }));
    expect(stableParamHash({ a: 1 })).not.toBe(stableParamHash({ a: 2 }));
  });

  it('ok wraps envelope', () => {
    expect(ok({ x: 1 }, { page: 1 })).toEqual({ success: true, data: { x: 1 }, meta: { page: 1 } });
    expect(ok({ x: 1 })).toEqual({ success: true, data: { x: 1 } });
  });
});
