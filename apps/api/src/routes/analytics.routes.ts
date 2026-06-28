import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types';

export const analyticsRoutes = Router();

analyticsRoutes.use(authenticate);
analyticsRoutes.use(authorize(Role.ADMIN, Role.LOAN_OFFICER));

analyticsRoutes.get('/dashboard', analyticsController.getDashboardStats);
analyticsRoutes.get('/fraud-trends', analyticsController.getFraudTrends);
analyticsRoutes.get('/officer-performance', analyticsController.getOfficerPerformance);
analyticsRoutes.get('/regional', analyticsController.getRegionalDistribution);
analyticsRoutes.get('/monthly-uploads', analyticsController.getMonthlyUploads);
