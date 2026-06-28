import { Response } from 'express';
import { AuthRequest } from '../types';
import { auditService } from '../services/audit.service';
import { AuditAction } from '../types';

export const auditController = {
  async getAuditLogs(req: AuthRequest, res: Response) {
    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      userId: req.query.userId as string,
      action: req.query.action as AuditAction,
      entityType: req.query.entityType as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const result = await auditService.getAuditLogs(query);
    res.json({
      success: true,
      message: 'System audit logs fetched successfully',
      data: result,
    });
  },

  async exportAuditLogs(req: AuthRequest, res: Response) {
    const query = {
      userId: req.query.userId as string,
      action: req.query.action as AuditAction,
      entityType: req.query.entityType as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const csvContent = await auditService.exportAuditLogs(query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    
    return res.status(200).send(csvContent);
  }
};
