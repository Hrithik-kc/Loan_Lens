import { logger } from './logger';
import path from 'path';
import fs from 'fs';

// Since we are running in mock mode, we will save uploaded files locally
// to a folder that can be served by express, rather than requiring real Firebase keys.
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Create upload directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const firebaseStorage = {
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    logger.info(`Firebase Storage Mock: Uploading ${fileName} (${mimeType})`);
    
    // Create a safe, unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(fileName) || '.jpg';
    const safeFileName = `${path.basename(fileName, ext)}-${uniqueSuffix}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeFileName);

    // Save locally
    fs.writeFileSync(filePath, fileBuffer);
    logger.info(`Firebase Storage Mock: File saved locally to ${filePath}`);

    // Return a relative URL that our Express server will serve static-ly,
    // or a mock public URL if process.env.APP_URL is not set.
    const baseUrl = process.env.APP_URL || 'http://localhost:4000';
    return `${baseUrl}/uploads/${safeFileName}`;
  },

  async deleteFile(fileUrl: string): Promise<void> {
    logger.info(`Firebase Storage Mock: Deleting file ${fileUrl}`);
    try {
      const fileName = fileUrl.split('/uploads/')[1];
      if (fileName) {
        const filePath = path.join(UPLOAD_DIR, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Firebase Storage Mock: File deleted from disk: ${filePath}`);
        }
      }
    } catch (error) {
      logger.error('Firebase Storage Mock: Failed to delete file:', error);
    }
  }
};
