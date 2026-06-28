import { Response } from 'express';
import { AuthRequest } from '../types';
import { notificationService } from '../services/notification.service';

export const notificationController = {
  async getUserNotifications(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await notificationService.getUserNotifications(req.user.id, page, limit);
    res.json({
      success: true,
      message: 'User notifications fetched successfully',
      data: result,
    });
  },

  async markAsRead(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { id } = req.params;
    await notificationService.markAsRead(id, req.user.id);
    res.json({
      success: true,
      message: 'Notification marked as read successfully',
    });
  },

  async markAllRead(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    await notificationService.markAllRead(req.user.id);
    res.json({
      success: true,
      message: 'All notifications marked as read successfully',
    });
  },

  async deleteNotification(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { id } = req.params;
    await notificationService.deleteNotification(id, req.user.id);
    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  },

  async getUnreadCount(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const result = await notificationService.getUnreadCount(req.user.id);
    res.json({
      success: true,
      message: 'Unread notifications count fetched successfully',
      data: result,
    });
  }
};
