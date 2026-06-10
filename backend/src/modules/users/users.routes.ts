import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', UsersController.getUsers);
router.post('/cashiers', UsersController.addCashier);

export default router;
