import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { jwtAuth } from '../middlewares/jwt-auth';
import { validate } from '../middlewares/validate';
import { createUserSchema, updateUserSchema, listUserQuerySchema } from '../validation/user.schema';

const router = Router();

router.get('/', jwtAuth, validate({ query: listUserQuerySchema }), userController.list);
router.post('/', jwtAuth, validate({ body: createUserSchema }), userController.create);
router.get('/:userId', jwtAuth, userController.getById);
router.patch('/:userId', jwtAuth, validate({ body: updateUserSchema }), userController.update);
router.delete('/:userId', jwtAuth, userController.remove);

export default router;
