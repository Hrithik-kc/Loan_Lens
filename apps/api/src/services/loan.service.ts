import { prisma } from '../config/database';
import { LoanType, LoanStatus, Role } from '../types';
import { AppError } from '../middleware/errorHandler';

interface CreateLoanData {
  loanNumber: string;
  borrowerId: string;
  officerId?: string;
  purpose: string;
  amount: number;
  loanType: LoanType;
  sanctionDate?: Date;
  dueDate?: Date;
  bankName?: string;
  branchName?: string;
  notes?: string;
}

export const loanService = {
  async createLoan(data: CreateLoanData) {
    const existing = await prisma.loan.findUnique({
      where: { loanNumber: data.loanNumber },
    });
    if (existing) {
      throw new AppError(`Loan number ${data.loanNumber} already exists`, 409);
    }

    // Verify borrower exists and is indeed a borrower
    const borrower = await prisma.user.findUnique({
      where: { id: data.borrowerId },
    });
    if (!borrower || borrower.role !== Role.BENEFICIARY) {
      throw new AppError('Invalid borrower selection', 400);
    }

    // Verify officer exists if provided
    if (data.officerId) {
      const officer = await prisma.user.findUnique({
        where: { id: data.officerId },
      });
      if (!officer || officer.role !== Role.LOAN_OFFICER) {
        throw new AppError('Invalid loan officer selection', 400);
      }
    }

    return await prisma.loan.create({
      data: {
        loanNumber: data.loanNumber,
        borrowerId: data.borrowerId,
        officerId: data.officerId,
        purpose: data.purpose,
        amount: data.amount,
        loanType: data.loanType,
        sanctionDate: data.sanctionDate || new Date(),
        dueDate: data.dueDate,
        bankName: data.bankName,
        branchName: data.branchName,
        notes: data.notes,
      },
      include: {
        borrower: {
          select: { id: true, name: true, email: true, phone: true },
        },
        officer: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async getAllLoans(
    query: {
      page?: number;
      limit?: number;
      status?: LoanStatus;
      loanType?: LoanType;
      search?: string;
    },
    userId: string,
    role: Role
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Apply role boundaries
    if (role === Role.BENEFICIARY) {
      where.borrowerId = userId;
    } else if (role === Role.LOAN_OFFICER) {
      where.officerId = userId;
    }

    // Filters
    if (query.status) where.status = query.status;
    if (query.loanType) where.loanType = query.loanType;

    if (query.search) {
      where.OR = [
        { loanNumber: { contains: query.search, mode: 'insensitive' } },
        { purpose: { contains: query.search, mode: 'insensitive' } },
        {
          borrower: {
            name: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: {
          borrower: {
            select: { id: true, name: true, email: true, phone: true, district: true, state: true },
          },
          officer: {
            select: { id: true, name: true },
          },
          uploads: {
            select: { id: true, fileUrl: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loan.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getLoanById(id: string, userId: string, role: Role) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        borrower: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            district: true,
            state: true,
            pincode: true,
          },
        },
        officer: {
          select: { id: true, name: true, email: true },
        },
        uploads: {
          include: {
            location: true,
            verification: {
              include: {
                aiResult: true,
                officerComments: {
                  include: {
                    officer: { select: { id: true, name: true } },
                  },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        reports: true,
      },
    });

    if (!loan) throw new AppError('Loan not found', 404);

    // Apply security check
    if (role === Role.BENEFICIARY && loan.borrowerId !== userId) {
      throw new AppError('Access denied', 403);
    }
    if (role === Role.LOAN_OFFICER && loan.officerId !== userId) {
      throw new AppError('Access denied. Loan not assigned to you.', 403);
    }

    return loan;
  },

  async updateLoan(id: string, data: any) {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new AppError('Loan not found', 404);

    return await prisma.loan.update({
      where: { id },
      data: {
        purpose: data.purpose,
        amount: data.amount,
        status: data.status,
        officerId: data.officerId,
        notes: data.notes,
        dueDate: data.dueDate,
      },
      include: {
        borrower: { select: { name: true, email: true } },
        officer: { select: { name: true } },
      },
    });
  },

  async assignOfficer(loanId: string, officerId: string) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new AppError('Loan not found', 404);

    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer || officer.role !== Role.LOAN_OFFICER) {
      throw new AppError('Selected user is not a Loan Officer', 400);
    }

    return await prisma.loan.update({
      where: { id: loanId },
      data: { officerId },
    });
  },

  async getLoanTimeline(loanId: string) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        uploads: {
          include: {
            verification: {
              include: {
                aiResult: true,
                officerComments: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!loan) throw new AppError('Loan not found', 404);

    // Build chronological list of events
    const events: Array<{
      id: string;
      title: string;
      description: string;
      timestamp: Date;
      type: 'LOAN_CREATED' | 'EVIDENCE_UPLOADED' | 'AI_PROCESSED' | 'OFFICER_REVIEW' | 'VERIFICATION_DECISION';
      status?: string;
      meta?: any;
    }> = [];

    // 1. Sanctioned event
    events.push({
      id: loan.id,
      title: 'Loan Sanctioned',
      description: `Loan of ₹${loan.amount.toLocaleString('en-IN')} approved for purpose: "${loan.purpose}"`,
      timestamp: loan.sanctionDate || loan.createdAt,
      type: 'LOAN_CREATED',
      status: loan.status,
    });

    // 2. Add events for each upload
    loan.uploads.forEach((upload) => {
      events.push({
        id: upload.id,
        title: 'Evidence Uploaded',
        description: `Beneficiary uploaded ${upload.fileType.toLowerCase()} proof: ${upload.fileName}`,
        timestamp: upload.createdAt,
        type: 'EVIDENCE_UPLOADED',
        meta: { fileUrl: upload.fileUrl, fileType: upload.fileType },
      });

      const verification = upload.verification;
      if (verification) {
        if (verification.processedAt) {
          const aiResult = verification.aiResult;
          events.push({
            id: verification.id + '-ai',
            title: 'AI Analysis Complete',
            description: aiResult
              ? `AI assessed Risk: ${aiResult.riskLevel} (Score: ${aiResult.riskScore}/100). Objects: ${aiResult.detectedObjects ? (JSON.parse(aiResult.detectedObjects as string) as any[]).map(o => o.label).join(', ') : 'None'}`
              : 'AI analysis completed, processing report.',
            timestamp: verification.processedAt,
            type: 'AI_PROCESSED',
            status: verification.status,
            meta: aiResult ? { riskScore: aiResult.riskScore, riskLevel: aiResult.riskLevel } : null,
          });
        }

        // Officer comments
        verification.officerComments.forEach((comment) => {
          events.push({
            id: comment.id,
            title: 'Officer Reviewed',
            description: `Comment: "${comment.comment}"`,
            timestamp: comment.createdAt,
            type: 'OFFICER_REVIEW',
          });
        });

        // Verification decision
        if (verification.decidedAt) {
          events.push({
            id: verification.id + '-decision',
            title: `Verification ${verification.status}`,
            description: verification.officerComment
              ? `Final decision comment: "${verification.officerComment}"`
              : `Verification workflow completed with status ${verification.status}.`,
            timestamp: verification.decidedAt,
            type: 'VERIFICATION_DECISION',
            status: verification.status,
          });
        }
      }
    });

    // Sort by timestamp asc
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  },

  async getLoanStats(userId?: string, role?: Role) {
    const where: any = {};
    if (role === Role.BENEFICIARY) where.borrowerId = userId;
    else if (role === Role.LOAN_OFFICER) where.officerId = userId;

    const stats = await prisma.loan.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amount: true },
      where,
    });

    const result = {
      totalCount: 0,
      totalAmount: 0,
      PENDING: { count: 0, amount: 0 },
      ACTIVE: { count: 0, amount: 0 },
      VERIFIED: { count: 0, amount: 0 },
      REJECTED: { count: 0, amount: 0 },
      CLOSED: { count: 0, amount: 0 },
    };

    stats.forEach((stat) => {
      const count = stat._count || 0;
      const amount = stat._sum.amount || 0;
      result.totalCount += count;
      result.totalAmount += amount;

      const key = stat.status as keyof typeof result;
      if (key in result && key !== 'totalCount' && key !== 'totalAmount') {
        (result as any)[key] = { count, amount };
      }
    });

    return result;
  },
};
