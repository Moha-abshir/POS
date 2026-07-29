import { Router } from 'express';
import { BusinessesController } from './businesses.controller';
import { authorize } from '../../core/middleware/auth';

const router = Router();

router.put('/settings/banking', authorize(['OWNER']), BusinessesController.enableBanking);

export default router;
