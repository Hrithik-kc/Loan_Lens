import { prisma } from '../config/database';

export const auditService = {
  async logAction(
    userId: string | null,
    action: string,
    entityType?: string,
    entityId?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      // Don't throw database logging errors to prevent breaking the request cycle
      console.error('Failed to log audit activity:', error);
    }
  },

  async getAuditLogs(query: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async exportAuditLogs(query: {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<string> {
    const where: any = {};

    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV contents
    const headers = ['ID', 'Timestamp', 'User Name', 'User Email', 'User Role', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'User Agent'];
    const rows = logs.map(log => [
      log.id,
      log.createdAt.toISOString(),
      log.user?.name || 'System / Guest',
      log.user?.email || 'N/A',
      log.user?.role || 'N/A',
      log.action,
      log.entityType || '',
      log.entityId || '',
      log.ipAddress || '',
      log.userAgent || ''
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
  }
};
