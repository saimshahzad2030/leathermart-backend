import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { env } from '../config/env.js';

// In serverless environments (e.g. Vercel / AWS Lambda), process.cwd() is read-only (/var/task).
// Use os.tmpdir() to prevent EROFS errors while maintaining diskStorage compatibility.
export const uploadDirectory = env.isServerless
  ? path.join(os.tmpdir(), env.UPLOAD_DIR)
  : path.resolve(process.cwd(), env.UPLOAD_DIR);

try {
  if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
  }
} catch (err) {
  console.warn(`[WARN] Could not initialize upload directory at ${uploadDirectory}: ${err.message}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/webm',
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(
      `Unsupported file format (${file.mimetype}). Allowed formats: JPEG, PNG, WebP, AVIF, MP4, WebM.`
    );
    err.statusCode = 400;
    err.errorCode = 'ERR_INVALID_FILE_TYPE';
    cb(err, false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});
