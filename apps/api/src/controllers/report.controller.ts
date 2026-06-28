import { Response } from 'express';
import { AuthRequest } from '../types';
import { reportService } from '../services/report.service';
import { auditService } from '../services/audit.service';
import { AuditAction } from '../types';

export const reportController = {
  async generateReport(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { loanId, verificationId } = req.body;

    const report = await reportService.generateReport(loanId, verificationId, req.user.id);

    await auditService.logAction(
      req.user.id,
      AuditAction.REPORT_GENERATED,
      'Report',
      report.id,
      { loanId, verificationId },
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json({
      success: true,
      message: 'Utilization PDF report compiled, digitally signed, and generated successfully',
      data: report,
    });
  },

  async getReport(req: AuthRequest, res: Response) {
    const report = await reportService.getReport(req.params.id);
    res.json({
      success: true,
      message: 'Report details fetched successfully',
      data: report,
    });
  },

  async getReportsByLoan(req: AuthRequest, res: Response) {
    const reports = await reportService.getReportsByLoan(req.params.loanId);
    res.json({
      success: true,
      message: 'Reports list fetched successfully for loan',
      data: reports,
    });
  }
};
