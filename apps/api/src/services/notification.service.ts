import { prisma } from '../config/database';
import { logger } from '../config/logger';

export const notificationService = {
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata?: any
  ) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });

      logger.info(`Notification created for user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error);
    }
  },

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async markAsRead(id: string, userId: string) {
    return await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },

  async markAllRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  async deleteNotification(id: string, userId: string) {
    return await prisma.notification.deleteMany({
      where: { id, userId },
    });
  },

  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  },

  async sendApprovalNotification(userId: string, loanNumber: string, loanId: string) {
    await this.createNotification(
      userId,
      'VERIFICATION_APPROVED',
      'Loan Utilization Approved ✅',
      `Your verification proof for Loan ${loanNumber} has been verified and approved by the loan officer.`,
      { loanId, loanNumber }
    );
  },

  async sendRejectionNotification(userId: string, loanNumber: string, loanId: string, reason: string) {
    await this.createNotification(
      userId,
      'VERIFICATION_REJECTED',
      'Loan Verification Rejected ❌',
      `Your verification proof for Loan ${loanNumber} was rejected. Reason: ${reason}`,
      { loanId, loanNumber, reason }
    );
  },

  async sendMoreEvidenceNotification(userId: string, loanNumber: string, loanId: string, instructions: string) {
    await this.createNotification(
      userId,
      'MORE_EVIDENCE_REQUIRED',
      'Additional Evidence Required 📸',
      `Your verification proof for Loan ${loanNumber} requires additional details. Officer comment: "${instructions}"`,
      { loanId, loanNumber, instructions }
    );
  }
};
