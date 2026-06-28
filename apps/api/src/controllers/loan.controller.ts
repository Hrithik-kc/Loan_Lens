import { Response } from 'express';
import { AuthRequest } from '../types';
import { loanService } from '../services/loan.service';
import { auditService } from '../services/audit.service';
import { AuditAction, LoanStatus, LoanType } from '../types';

export const loanController = {
  async createLoan(req: AuthRequest, res: Response) {
    const loan = await loanService.createLoan(req.body);

    await auditService.logAction(
      req.user?.id || null,
      AuditAction.LOAN_CREATED,
      'Loan',
      loan.id,
      { loanNumber: loan.loanNumber, amount: loan.amount },
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json({
      success: true,
      message: 'Loan record created successfully',
      data: loan,
    });
  },

  async getAllLoans(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const filters = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      status: req.query.status as LoanStatus,
      loanType: req.query.loanType as LoanType,
      search: req.query.search as string,
    };

    const result = await loanService.getAllLoans(filters, req.user.id, req.user.role);
    res.json({
      success: true,
      message: 'Loans fetched successfully',
      data: result,
    });
  },

  async getLoanById(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const loan = await loanService.getLoanById(req.params.id, req.user.id, req.user.role);
    res.json({
      success: true,
      message: 'Loan details fetched successfully',
      data: loan,
    });
  },

  async updateLoan(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const updated = await loanService.updateLoan(id, req.body);

    await auditService.logAction(
      req.user?.id || null,
      AuditAction.LOAN_UPDATED,
      'Loan',
      id,
      { updatedFields: Object.keys(req.body) },
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Loan updated successfully',
      data: updated,
    });
  },

  async assignOfficer(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { officerId } = req.body;

    const updated = await loanService.assignOfficer(id, officerId);

    await auditService.logAction(
      req.user?.id || null,
      AuditAction.LOAN_UPDATED,
      'Loan',
      id,
      { assignedOfficerId: officerId },
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Officer assigned to loan successfully',
      data: updated,
    });
  },

  async getLoanTimeline(req: AuthRequest, res: Response) {
    const timeline = await loanService.getLoanTimeline(req.params.id);
    res.json({
      success: true,
      message: 'Loan chronological timeline events fetched',
      data: timeline,
    });
  },

  async getLoanStats(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    // Admins get global stats, others get role-restricted stats
    const stats = await loanService.getLoanStats(req.user.id, req.user.role);
    res.json({
      success: true,
      message: 'Loan status aggregates fetched successfully',
      data: stats,
    });
  }
};
