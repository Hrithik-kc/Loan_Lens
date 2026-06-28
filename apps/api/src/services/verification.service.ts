import { prisma } from '../config/database';
import { VerificationStatus, LoanStatus, AuditAction, Role } from '../types';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { sendEmail, emailTemplates } from '../config/email';
import { logger } from '../config/logger';

export const verificationService = {
  async getPendingVerifications(officerId?: string, query: { page?: number; limit?: number } = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      status: {
        in: [VerificationStatus.PENDING, VerificationStatus.PROCESSING, VerificationStatus.AI_COMPLETE, VerificationStatus.UNDER_REVIEW],
      },
    };

    if (officerId) {
      where.loan = { officerId };
    }

    const [items, total] = await Promise.all([
      prisma.verification.findMany({
        where,
        include: {
          loan: {
            include: {
              borrower: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
          upload: {
            select: { id: true, fileUrl: true, fileType: true, fileName: true, capturedAt: true },
          },
          aiResult: {
            select: { riskScore: true, riskLevel: true, detectedObjects: true, fraudFlags: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.verification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getVerificationById(id: string) {
    const verification = await prisma.verification.findUnique({
      where: { id },
      include: {
        loan: {
          include: {
            borrower: {
              select: { id: true, name: true, email: true, phone: true, address: true, district: true, state: true, pincode: true },
            },
            officer: { select: { id: true, name: true } },
          },
        },
        upload: {
          include: { location: true },
        },
        aiResult: true,
        officerComments: {
          include: {
            officer: { select: { id: true, name: true, profileImage: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!verification) throw new AppError('Verification record not found', 404);
    return verification;
  },

  async makeDecision(
    id: string,
    officerId: string,
    status: VerificationStatus,
    comment: string
  ) {
    const verification = await prisma.verification.findUnique({
      where: { id },
      include: {
        loan: { include: { borrower: true } },
        upload: true,
      },
    });

    if (!verification) throw new AppError('Verification not found', 404);

    // Update verification details
    const updatedVerification = await prisma.verification.update({
      where: { id },
      data: {
        officerId,
        status,
        officerComment: comment,
        decidedAt: new Date(),
      },
    });

    // Create comments log
    if (comment) {
      await prisma.officerComment.create({
        data: {
          verificationId: id,
          officerId,
          comment,
        },
      });
    }

    const loanId = verification.loanId;
    const borrowerId = verification.loan.borrowerId;
    const loanNumber = verification.loan.loanNumber;
    const borrowerName = verification.loan.borrower.name;
    const borrowerEmail = verification.loan.borrower.email;

    // Trigger action-specific tasks (email templates, db statuses)
    if (status === VerificationStatus.APPROVED) {
      // 1. Update loan utilization status
      await prisma.loan.update({
        where: { id: loanId },
        data: { status: LoanStatus.VERIFIED },
      });

      // 2. Add Notification
      await notificationService.sendApprovalNotification(borrowerId, loanNumber, loanId);

      // 3. Send Email
      try {
        await sendEmail(
          borrowerEmail,
          `Verified: Loan ${loanNumber} Utilization Proof`,
          emailTemplates.verificationApproved(borrowerName, loanNumber)
        );
      } catch (err) {
        logger.warn('Failed to send approval email:', err);
      }
    } 
    
    else if (status === VerificationStatus.REJECTED) {
      // 1. Update loan status
      await prisma.loan.update({
        where: { id: loanId },
        data: { status: LoanStatus.REJECTED },
      });

      // 2. Notification
      await notificationService.sendRejectionNotification(borrowerId, loanNumber, loanId, comment);

      // 3. Email
      try {
        await sendEmail(
          borrowerEmail,
          `Action Required: Loan ${loanNumber} Verification Rejected`,
          emailTemplates.verificationRejected(borrowerName, loanNumber, comment)
        );
      } catch (err) {
        logger.warn('Failed to send rejection email:', err);
      }
    } 
    
    else if (status === VerificationStatus.MORE_EVIDENCE_REQUIRED) {
      // 1. Notification
      await notificationService.sendMoreEvidenceNotification(borrowerId, loanNumber, loanId, comment);

      // 2. Email
      try {
        await sendEmail(
          borrowerEmail,
          `Action Required: Upload More Evidence for Loan ${loanNumber}`,
          emailTemplates.moreEvidence(borrowerName, loanNumber, comment)
        );
      } catch (err) {
        logger.warn('Failed to send more evidence email:', err);
      }
    }

    return updatedVerification;
  },

  async addOfficerComment(verificationId: string, officerId: string, comment: string) {
    // Make sure verification exists
    const verification = await prisma.verification.findUnique({
      where: { id: verificationId },
    });
    if (!verification) throw new AppError('Verification not found', 404);

    return await prisma.officerComment.create({
      data: {
        verificationId,
        officerId,
        comment,
      },
      include: {
        officer: { select: { id: true, name: true, profileImage: true } },
      },
    });
  },

  async getVerificationStats() {
    const counts = await prisma.verification.groupBy({
      by: ['status'],
      _count: true,
    });

    const stats: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      AI_COMPLETE: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      MORE_EVIDENCE_REQUIRED: 0,
    };

    counts.forEach((item) => {
      stats[item.status] = item._count;
    });

    return stats;
  },
};
