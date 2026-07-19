import { Router } from 'express';
import * as accountController from '../controllers/account.controller';
import { jwtAuth } from '../middlewares/jwt-auth';
import { validate } from '../middlewares/validate';
import { createAccountSchema, updateAccountSchema, listAccountQuerySchema, staleQuerySchema } from '../validation/account.schema';

const router = Router();

router.get('/', jwtAuth, validate({ query: listAccountQuerySchema }), accountController.list);
router.get('/stale', jwtAuth, validate({ query: staleQuerySchema }), accountController.stale);
router.post('/', jwtAuth, validate({ body: createAccountSchema }), accountController.create);
router.get('/:accountId', jwtAuth, accountController.getById);
router.patch('/:accountId', jwtAuth, validate({ body: updateAccountSchema }), accountController.update);
router.delete('/:accountId', jwtAuth, accountController.remove);

export default router;
