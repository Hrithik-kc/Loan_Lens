import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

export const reportRoutes = Router();

// Report details are publicly verifiable or behind auth depending on layout,
// here we authenticate general lookups.
reportRoutes.use(authenticate);

reportRoutes.post('/', reportController.generateReport);
reportRoutes.get('/:id', reportController.getReport);
reportRoutes.get('/loan/:loanId', reportController.getReportsByLoan);
