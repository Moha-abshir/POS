import { Router } from 'express';
import { BusinessesController } from './businesses.controller';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { authorize } from '../../core/middleware/auth';

const router = Router();

router.put('/settings/banking', authorize(['OWNER']), asyncHandler(BusinessesController.enableBanking));

export default router;
