import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { StorageService } from './storage.service.js';
import { HTTP_STATUS } from '../config/constants.js';
import { mapRowToCamelCase } from '../utils/mapper.js';
import { logger } from '../utils/logger.js';

export const MediaService = {
  async saveAsset(file, metadata = {}, req) {
    const folder = metadata.folder || 'general';

    let buffer = file.buffer;
    if (!buffer && file.path && fs.existsSync(file.path)) {
      buffer = fs.readFileSync(file.path);
    }

    if (!buffer) {
      const err = new Error('No valid file buffer received for upload');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_EMPTY_FILE';
      throw err;
    }

    const originalName = file.originalname || file.filename || 'asset';
    const mimeType = file.mimetype || 'application/octet-stream';

    // Upload directly to Supabase Storage
    const uploaded = await StorageService.uploadBuffer({
      buffer,
      originalName,
      mimeType,
      folder,
    });

    const asset = await prisma.mediaAsset.create({
      data: {
        filename: uploaded.filename,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType,
        size: BigInt(uploaded.size),
        url: uploaded.url,
        path: uploaded.path,
        folder: folder,
        altText: metadata.altText || metadata.alt_text || originalName,
      },
    });

    return mapRowToCamelCase(asset);
  },

  async listAssets(query = {}) {
    const page = Math.max(1, parseInt(query.page || 1, 10));
    const limit = Math.max(1, parseInt(query.limit || 24, 10));
    const skip = (page - 1) * limit;

    const where = {};
    if (query.folder) {
      where.folder = query.folder;
    }
    if (query.search) {
      where.originalName = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [assets, totalCount] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    return {
      assets: assets.map(mapRowToCamelCase),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        limit,
      },
    };
  },

  async deleteAsset(id) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!asset) {
      const err = new Error('Media asset not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    // 1. Remove from Supabase Storage
    if (asset.path) {
      try {
        await StorageService.deleteFile(asset.path);
      } catch (e) {
        logger.warn(`Could not delete storage object ${asset.path}: ${e.message}`);
      }
    }

    // 2. Clean up legacy local disk file if present
    if (asset.path && fs.existsSync(asset.path)) {
      try {
        fs.unlinkSync(asset.path);
      } catch (e) {
        // Ignore file removal error if already absent
      }
    }

    await prisma.mediaAsset.delete({
      where: { id },
    });

    return mapRowToCamelCase(asset);
  },
};
