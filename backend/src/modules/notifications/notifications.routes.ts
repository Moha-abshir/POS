import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', NotificationsController.getNotifications);
router.get('/unread-count', NotificationsController.getUnreadCount);
router.post('/mark-all-read', NotificationsController.markAllAsRead);
router.post('/:id/read', NotificationsController.markAsRead);

export default router;
