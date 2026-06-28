import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { auditService } from '../services/audit.service';
import { AuditAction } from '../types';

export interface AuditLogOptions {
  action: AuditAction;
  entityType?: string;
  // Dynamic functions to extract details from request
  getEntityId?: (req: AuthRequest) => string | undefined;
  getMetadata?: (req: AuthRequest, res: Response) => any;
}

export const auditLogger = (options: AuditLogOptions) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Intercept response finish
    res.on('finish', () => {
      // Only log if the request was successful (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id || null;
        const ipAddress = req.ip || req.socket.remoteAddress || undefined;
        const userAgent = req.headers['user-agent'] || undefined;

        const entityId = options.getEntityId ? options.getEntityId(req) : undefined;
        const metadata = options.getMetadata ? options.getMetadata(req, res) : undefined;

        // Perform the logging asynchronously in the background
        auditService.logAction(
          userId,
          options.action,
          options.entityType,
          entityId,
          metadata,
          ipAddress,
          userAgent
        ).catch(err => {
          console.error('Error logging audit activity in middleware:', err);
        });
      }
    });

    next();
  };
};
