import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

export const notificationRoutes = Router();

notificationRoutes.use(authenticate);

notificationRoutes.get('/', notificationController.getUserNotifications);
notificationRoutes.get('/unread-count', notificationController.getUnreadCount);
notificationRoutes.put('/read-all', notificationController.markAllRead);
notificationRoutes.put('/:id/read', notificationController.markAsRead);
notificationRoutes.delete('/:id', notificationController.deleteNotification);
