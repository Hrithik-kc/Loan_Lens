import multer from 'multer';
import { AppError } from './errorHandler';
import { Request } from 'express';

// Configure memory storage because we will pipe to processing and upload directly
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-matroska',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type. Only JPG, JPEG, PNG, WEBP images and MP4, MOV, MKV videos are allowed.',
        400
      )
    );
  }
};

const limits = {
  fileSize: 50 * 1024 * 1024, // 50MB
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

export const uploadSingle = (fieldName: string) => upload.single(fieldName);
export const uploadMultiple = (fieldName: string, maxCount = 5) => upload.array(fieldName, maxCount);
export const uploadFields = (fields: multer.Field[]) => upload.fields(fields);
