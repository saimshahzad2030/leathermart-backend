import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../config/constants.js';
import { mapRowToCamelCase } from '../utils/mapper.js';

export const MediaService = {
  async saveAsset(file, metadata = {}, req) {
    const bucket = env.SUPABASE_STORAGE_BUCKET || 'media';
    const folder = metadata.folder || 'general';
    const storagePath = `${folder}/${Date.now()}-${file.filename || file.originalname}`;

    let fileUrl = '';

    // Attempt upload to Supabase Storage if configured
    try {
      if (file.path && fs.existsSync(file.path)) {
        const fileBuffer = fs.readFileSync(file.path);
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(storagePath, fileBuffer, {
            contentType: file.mimetype,
            upsert: true,
          });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(storagePath);
          if (publicUrlData?.publicUrl) {
            fileUrl = publicUrlData.publicUrl;
          }
        }
      }
    } catch (e) {
      // Supabase storage bucket might not be created or network offline; fallback gracefully
    }

    // Fallback to local server URL if Supabase storage was not used or failed
    if (!fileUrl && req) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      fileUrl = `${baseUrl}/${env.UPLOAD_DIR}/${file.filename || path.basename(file.path)}`;
    } else if (!fileUrl) {
      fileUrl = `/${env.UPLOAD_DIR}/${file.filename || path.basename(file.path)}`;
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        filename: file.filename || path.basename(file.path),
        originalName: file.originalname || file.filename || 'unnamed',
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size || 0,
        url: fileUrl,
        path: file.path || storagePath,
        folder: folder,
        altText: metadata.altText || file.originalname || '',
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

    // Delete from Supabase Storage if applicable
    try {
      const bucket = env.SUPABASE_STORAGE_BUCKET || 'media';
      await supabase.storage.from(bucket).remove([asset.path]);
    } catch (e) {
      // Ignore storage deletion errors
    }

    // Delete local disk file if present
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
