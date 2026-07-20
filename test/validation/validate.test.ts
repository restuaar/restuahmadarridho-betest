import { z } from 'zod';
import { validate } from '../../src/middlewares/validate';
import { createUserSchema } from '../../src/validation/user.schema';
import { ValidationException } from '../../src/exceptions/app-exception';

function run(mw: any, req: any) {
  return new Promise((resolve, reject) => {
    mw(req, {}, (err?: unknown) => (err ? reject(err) : resolve(req)));
  });
}

describe('validate middleware', () => {
  it('passes valid body', async () => {
    const req: any = { body: { fullName: 'A', accountNumber: 'A1', emailAddress: 'a@b.com', registrationNumber: 'R1', role: 'user' } };
    await run(validate({ body: createUserSchema }), req);
    expect(req.body.role).toBe('user');
  });

  it('throws ValidationException on bad body', async () => {
    const req: any = { body: { fullName: 'A' } };
    await expect(run(validate({ body: createUserSchema }), req)).rejects.toBeInstanceOf(ValidationException);
  });

  it('parses query and params schemas too', async () => {
    const req: any = { query: { page: '2' }, params: { id: 'abc' } };
    await run(validate({
      query: z.object({ page: z.coerce.number() }),
      params: z.object({ id: z.string() }),
    }), req);
    expect(req.query.page).toBe(2);
    expect(req.params.id).toBe('abc');
  });
});
