import { Response } from 'express';
import { AuthRequest } from '../types';
import { uploadService } from '../services/upload.service';
import { auditService } from '../services/audit.service';
import { AuditAction } from '../types';
import { AppError } from '../middleware/errorHandler';

export const uploadController = {
  async createUpload(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const { loanId, gpsLat, gpsLng, gpsAlt, gpsAccuracy, deviceInfo } = req.body;

    if (!loanId) {
      throw new AppError('Loan ID is required', 400);
    }

    // Parse coordinates and metadata
    const parsedGeoData = {
      gpsLat: gpsLat ? Number(gpsLat) : undefined,
      gpsLng: gpsLng ? Number(gpsLng) : undefined,
      gpsAlt: gpsAlt ? Number(gpsAlt) : undefined,
      gpsAccuracy: gpsAccuracy ? Number(gpsAccuracy) : undefined,
      deviceInfo: deviceInfo ? (typeof deviceInfo === 'string' ? JSON.parse(deviceInfo) : deviceInfo) : undefined,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const result = await uploadService.createUpload(
      loanId,
      req.user.id,
      req.file,
      parsedGeoData
    );

    await auditService.logAction(
      req.user.id,
      AuditAction.UPLOAD,
      'Upload',
      result.upload.id,
      { loanId, fileName: req.file.originalname, fileSize: req.file.size, fileType: result.upload.fileType },
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json({
      success: true,
      message: 'Evidence uploaded successfully and queued for AI verification analysis',
      data: result,
    });
  },

  async getUploadById(req: AuthRequest, res: Response) {
    const upload = await uploadService.getUploadById(req.params.id);
    res.json({
      success: true,
      message: 'Upload fetched successfully',
      data: upload,
    });
  },

  async getUploadsByLoan(req: AuthRequest, res: Response) {
    const uploads = await uploadService.getUploadsByLoan(req.params.loanId);
    res.json({
      success: true,
      message: 'Uploads fetched successfully for loan',
      data: uploads,
    });
  },

  async deleteUpload(req: AuthRequest, res: Response) {
    const { id } = req.params;
    await uploadService.deleteUpload(id);

    await auditService.logAction(
      req.user?.id || null,
      AuditAction.USER_DELETED,
      'Upload',
      id,
      {},
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Upload evidence and associated verification entries deleted successfully',
    });
  }
};
