import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';

export const uploadRoutes = Router();

uploadRoutes.use(authenticate);

uploadRoutes.post('/', uploadSingle('file'), uploadController.createUpload);
uploadRoutes.get('/:id', uploadController.getUploadById);
uploadRoutes.get('/loan/:loanId', uploadController.getUploadsByLoan);
uploadRoutes.delete('/:id', uploadController.deleteUpload);
