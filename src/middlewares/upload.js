import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { env } from '../config/env.js';

// Retained for backward-compatibility with any legacy local file references
export const uploadDirectory = env.isServerless
  ? path.join(os.tmpdir(), env.UPLOAD_DIR)
  : path.resolve(process.cwd(), env.UPLOAD_DIR);

try {
  if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
  }
} catch (err) {
  // Graceful warning for read-only environments
}

// In-memory buffer storage — files are streamed directly to Supabase Storage
// without persisting temporary or permanent files to the local server disk.
const storage = multer.memoryStorage();

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'video/mp4',
  'video/webm',
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(
      `Unsupported file format (${file.mimetype}). Allowed formats: JPEG, PNG, WebP, AVIF, GIF, SVG, ICO, MP4, WebM.`
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
    fileSize: (env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024,
    files: 10, // reasonable file count limit
  },
});
