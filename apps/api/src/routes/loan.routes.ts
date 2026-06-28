import { Router } from 'express';
import { loanController } from '../controllers/loan.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types';

export const loanRoutes = Router();

loanRoutes.use(authenticate);

loanRoutes.get('/', loanController.getAllLoans);
loanRoutes.get('/stats', loanController.getLoanStats);
loanRoutes.get('/:id', loanController.getLoanById);
loanRoutes.get('/:id/timeline', loanController.getLoanTimeline);

// Admin-only updates
loanRoutes.post('/', authorize(Role.ADMIN), loanController.createLoan);
loanRoutes.put('/:id', authorize(Role.ADMIN), loanController.updateLoan);
loanRoutes.put('/:id/assign', authorize(Role.ADMIN), loanController.assignOfficer);
