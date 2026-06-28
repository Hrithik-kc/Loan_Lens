import { Response } from 'express';
import { AuthRequest } from '../types';
import { verificationService } from '../services/verification.service';
import { auditService } from '../services/audit.service';
import { AuditAction, Role } from '../types';

export const verificationController = {
  async getPendingVerifications(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    // Filter by officer assignment unless admin
    const officerId = req.user.role === Role.LOAN_OFFICER ? req.user.id : undefined;

    const result = await verificationService.getPendingVerifications(officerId, { page, limit });
    res.json({
      success: true,
      message: 'Pending verifications fetched successfully',
      data: result,
    });
  },

  async getVerificationById(req: AuthRequest, res: Response) {
    const verification = await verificationService.getVerificationById(req.params.id);
    res.json({
      success: true,
      message: 'Verification details fetched successfully',
      data: verification,
    });
  },

  async makeDecision(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { id } = req.params;
    const { status, comment } = req.body;

    const result = await verificationService.makeDecision(
      id,
      req.user.id,
      status,
      comment
    );

    // Dynamic Audit logs
    const action = status === 'APPROVED' ? AuditAction.APPROVAL : AuditAction.REJECTION;
    await auditService.logAction(
      req.user.id,
      action,
      'Verification',
      id,
      { comment, decisionStatus: status },
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: `Verification decision recorded as ${status} successfully`,
      data: result,
    });
  },

  async addOfficerComment(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { id } = req.params;
    const { comment } = req.body;

    const result = await verificationService.addOfficerComment(id, req.user.id, comment);

    res.status(201).json({
      success: true,
      message: 'Officer comment added successfully',
      data: result,
    });
  },

  async getStats(req: AuthRequest, res: Response) {
    const stats = await verificationService.getVerificationStats();
    res.json({
      success: true,
      message: 'Verification metrics statistics fetched',
      data: stats,
    });
  }
};
