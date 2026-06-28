import { Router } from 'express';
import { verificationController } from '../controllers/verification.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types';

export const verificationRoutes = Router();

verificationRoutes.use(authenticate);

// Pending queue accessible to officers and admins
verificationRoutes.get('/pending', authorize(Role.LOAN_OFFICER, Role.ADMIN), verificationController.getPendingVerifications);
verificationRoutes.get('/stats', authorize(Role.LOAN_OFFICER, Role.ADMIN), verificationController.getStats);
verificationRoutes.get('/:id', authorize(Role.LOAN_OFFICER, Role.ADMIN), verificationController.getVerificationById);

// Decision making
verificationRoutes.put('/:id/decision', authorize(Role.LOAN_OFFICER, Role.ADMIN), verificationController.makeDecision);
verificationRoutes.post('/:id/comment', authorize(Role.LOAN_OFFICER, Role.ADMIN), verificationController.addOfficerComment);
