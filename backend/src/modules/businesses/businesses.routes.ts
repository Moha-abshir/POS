import { Router } from 'express';
import { BusinessesController } from './businesses.controller';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { requireOwner } from '../../core/middleware/auth';

const router = Router();

router.put('/settings/banking', requireOwner, asyncHandler(BusinessesController.enableBanking));

export default router;
