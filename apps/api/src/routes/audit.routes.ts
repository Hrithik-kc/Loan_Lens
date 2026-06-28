import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '../types';

export const auditRoutes = Router();

// Only admin users can read system audit logs
auditRoutes.use(authenticate);
auditRoutes.use(authorize(Role.ADMIN));

auditRoutes.get('/', auditController.getAuditLogs);
auditRoutes.get('/export', auditController.exportAuditLogs);
