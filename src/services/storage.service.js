import crypto from 'crypto';
import path from 'path';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS } from '../config/constants.js';

// Permitted MIME types and their signature magic bytes
const ALLOWED_MIME_TYPES = {
  'image/jpeg': [
    [0xff, 0xd8, 0xff],
  ],
  'image/png': [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  ],
  'image/webp': [
    // RIFF....WEBP
    [0x52, 0x49, 0x46, 0x46],
  ],
  'image/avif': [
    // ....ftypavif
    [0x66, 0x74, 0x79, 0x70],
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38],
  ],
  'video/mp4': [
    [0x66, 0x74, 0x79, 0x70],
  ],
  'video/webm': [
    [0x1a, 0x45, 0xdf, 0xa3],
  ],
};

export const StorageService = {
  getBucket() {
    return env.SUPABASE_STORAGE_BUCKET || 'media';
  },

  /**
   * Validate file buffer and declared MIME type against allowed list and magic bytes
   */
  validateFile(buffer, declaredMimeType, originalName = '') {
    const maxSizeBytes = (env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      const err = new Error('File content is empty or invalid');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_EMPTY_FILE';
      throw err;
    }

    if (buffer.length > maxSizeBytes) {
      const err = new Error(
        `File size exceeds maximum allowed limit of ${env.MAX_FILE_SIZE_MB || 10}MB`
      );
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_FILE_TOO_LARGE';
      throw err;
    }

    const mime = (declaredMimeType || '').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES[mime]) {
      const allowedList = Object.keys(ALLOWED_MIME_TYPES).join(', ');
      const err = new Error(
        `Unsupported MIME type '${mime}'. Allowed formats: ${allowedList}`
      );
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_INVALID_FILE_TYPE';
      throw err;
    }

    // Verify magic bytes if buffer is large enough
    const signatures = ALLOWED_MIME_TYPES[mime];
    if (signatures && signatures.length > 0) {
      const matchesSignature = signatures.some((sig) => {
        if (buffer.length < sig.length) return false;
        // For avif/mp4, ftyp is at offset 4
        if (mime === 'image/avif' || mime === 'video/mp4') {
          if (buffer.length < 8) return false;
          return (
            buffer[4] === 0x66 &&
            buffer[5] === 0x74 &&
            buffer[6] === 0x79 &&
            buffer[7] === 0x70
          );
        }
        // For WebP, starts with RIFF and has WEBP at offset 8
        if (mime === 'image/webp') {
          if (buffer.length < 12) return false;
          const isRiff =
            buffer[0] === 0x52 &&
            buffer[1] === 0x49 &&
            buffer[2] === 0x46 &&
            buffer[3] === 0x46;
          const isWebp =
            buffer[8] === 0x57 &&
            buffer[9] === 0x45 &&
            buffer[10] === 0x42 &&
            buffer[11] === 0x50;
          return isRiff && isWebp;
        }
        // Standard prefix check
        for (let i = 0; i < sig.length; i++) {
          if (buffer[i] !== sig[i]) return false;
        }
        return true;
      });

      if (!matchesSignature) {
        const err = new Error(
          `File content signature does not match declared MIME type '${mime}'`
        );
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        err.errorCode = 'ERR_FILE_SIGNATURE_MISMATCH';
        throw err;
      }
    }

    return true;
  },

  /**
   * Generates a collision-resistant, sanitized storage key
   */
  generateStoragePath(folder, originalName, fallbackExt = '.jpg') {
    const ext = (path.extname(originalName) || fallbackExt).toLowerCase();
    const cleanBase = path
      .basename(originalName, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50) || 'asset';

    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(6).toString('hex');
    const safeFolder = folder
      ? folder.toLowerCase().replace(/[^a-z0-9_\/-]/g, '-').replace(/\/+/g, '/').replace(/^\/|\/$/g, '')
      : 'general';

    return `${safeFolder}/${cleanBase}-${timestamp}-${randomHex}${ext}`;
  },

  /**
   * Upload buffer directly to Supabase Storage and return public URL & metadata
   */
  async uploadBuffer({ buffer, originalName, mimeType, folder = 'general' }) {
    this.validateFile(buffer, mimeType, originalName);

    const bucket = this.getBucket();
    const storagePath = this.generateStoragePath(folder, originalName);

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        logger.error(`Supabase Storage upload error: ${error.message}`);
        const err = new Error(`Failed to upload file to storage: ${error.message}`);
        err.statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        err.errorCode = 'ERR_STORAGE_UPLOAD';
        throw err;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData?.publicUrl || '';

      return {
        url: publicUrl,
        path: storagePath,
        filename: path.basename(storagePath),
        originalName: originalName || path.basename(storagePath),
        mimeType,
        size: buffer.length,
        bucket,
      };
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        err.errorCode = 'ERR_STORAGE_UPLOAD';
      }
      throw err;
    }
  },

  /**
   * Upload base64 encoded data (e.g. data:image/png;base64,...)
   */
  async uploadBase64(dataUriOrBase64, { originalName = 'image.webp', folder = 'products' } = {}) {
    let mimeType = 'image/webp';
    let base64String = dataUriOrBase64;

    const matches = dataUriOrBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64String = matches[2];
    }

    const buffer = Buffer.from(base64String, 'base64');
    return this.uploadBuffer({
      buffer,
      originalName,
      mimeType,
      folder,
    });
  },

  /**
   * Extract object path from Supabase storage public URL
   */
  extractStoragePath(urlOrPath) {
    if (!urlOrPath) return null;
    if (typeof urlOrPath !== 'string') return null;

    // Direct path already (e.g. products/xyz.jpg or general/abc.png)
    if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
      return urlOrPath.replace(/^\/+/, '');
    }

    try {
      const parsed = new URL(urlOrPath);
      // Supabase public URL structure:
      // /storage/v1/object/public/<bucket>/<path...>
      const marker = `/storage/v1/object/public/${this.getBucket()}/`;
      const idx = parsed.pathname.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
      }

      // Or /storage/v1/object/<bucket>/<path...>
      const altMarker = `/storage/v1/object/${this.getBucket()}/`;
      const altIdx = parsed.pathname.indexOf(altMarker);
      if (altIdx !== -1) {
        return decodeURIComponent(parsed.pathname.slice(altIdx + altMarker.length));
      }

      return null;
    } catch {
      return null;
    }
  },

  /**
   * Check if a URL points to this Supabase project's storage bucket
   */
  isSupabaseStorageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const bucket = this.getBucket();
    return url.includes(`/storage/v1/object/public/${bucket}/`) ||
           url.includes(`/storage/v1/object/${bucket}/`);
  },

  /**
   * Delete a single file from Supabase Storage
   */
  async deleteFile(pathOrUrl) {
    const objectPath = this.extractStoragePath(pathOrUrl);
    if (!objectPath) return { success: false, reason: 'Invalid or external path' };

    const bucket = this.getBucket();
    try {
      const { error } = await supabase.storage.from(bucket).remove([objectPath]);
      if (error) {
        logger.warn(`Supabase Storage remove warning: ${error.message} for ${objectPath}`);
        return { success: false, error: error.message };
      }
      return { success: true, path: objectPath };
    } catch (err) {
      logger.warn(`Supabase Storage remove exception: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete multiple files from Supabase Storage
   */
  async deleteFiles(pathsOrUrls) {
    if (!Array.isArray(pathsOrUrls) || pathsOrUrls.length === 0) return [];

    const objectPaths = pathsOrUrls
      .map((p) => this.extractStoragePath(p))
      .filter(Boolean);

    if (objectPaths.length === 0) return [];

    const bucket = this.getBucket();
    try {
      const { data, error } = await supabase.storage.from(bucket).remove(objectPaths);
      if (error) {
        logger.warn(`Supabase Storage batch remove warning: ${error.message}`);
      }
      return data || [];
    } catch (err) {
      logger.warn(`Supabase Storage batch remove exception: ${err.message}`);
      return [];
    }
  },
};
