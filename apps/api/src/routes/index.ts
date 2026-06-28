import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { loanRoutes } from './loan.routes';
import { uploadRoutes } from './upload.routes';
import { verificationRoutes } from './verification.routes';
import { analyticsRoutes } from './analytics.routes';
import { notificationRoutes } from './notification.routes';
import { reportRoutes } from './report.routes';
import { auditRoutes } from './audit.routes';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/loans', loanRoutes);
router.use('/uploads', uploadRoutes);
router.use('/verifications', verificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/audit-logs', auditRoutes);
