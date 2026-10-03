import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../core/middleware/auth';
import { cacheMiddleware } from '../../core/middleware/cache';

const router = Router();

router.use(authenticate);

router.get('/', cacheMiddleware({ ttlSeconds: 60, userScoped: true }), NotificationsController.getNotifications);
router.get('/unread-count', cacheMiddleware({ ttlSeconds: 60, userScoped: true }), NotificationsController.getUnreadCount);
router.post('/mark-all-read', NotificationsController.markAllAsRead);
router.post('/:id/read', NotificationsController.markAsRead);

export default router;
