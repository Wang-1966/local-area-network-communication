import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { getAppConfig } from './app.config';

/**
 * Multer configuration for file uploads
 */
export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const config = getAppConfig();
      const uploadDir = config.uploadsPath;

      // Ensure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp and random string
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
};
