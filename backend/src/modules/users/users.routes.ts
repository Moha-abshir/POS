import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['OWNER']), UsersController.getUsers);
router.post('/cashiers', authorize(['OWNER']), UsersController.addCashier);
router.patch('/:id/role', authorize(['OWNER']), UsersController.updateRole);

export default router;
