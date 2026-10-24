import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { StorageService } from '../services/storage.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

async function runMigration() {
  logger.info('Starting safe migration of local uploaded files to Supabase Storage...');

  const uploadsDir = path.resolve(process.cwd(), env.UPLOAD_DIR || 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    logger.info(`Uploads directory ${uploadsDir} does not exist. Nothing to migrate.`);
    return;
  }

  let migratedProductCount = 0;
  let migratedMediaCount = 0;
  let failedCount = 0;

  // 1. Migrate Product Images
  const productImages = await prisma.productImage.findMany();
  logger.info(`Checking ${productImages.length} product images for local references...`);

  for (const img of productImages) {
    if (img.url && (img.url.includes(`/${env.UPLOAD_DIR}/`) || img.url.startsWith(`uploads/`))) {
      const filename = path.basename(img.url);
      const localFilePath = path.join(uploadsDir, filename);

      if (fs.existsSync(localFilePath)) {
        try {
          const buffer = fs.readFileSync(localFilePath);
          const ext = path.extname(filename).toLowerCase();
          const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.avif': 'image/avif',
            '.gif': 'image/gif',
          };
          const mimeType = mimeTypes[ext] || 'application/octet-stream';

          const uploaded = await StorageService.uploadBuffer({
            buffer,
            originalName: filename,
            mimeType,
            folder: 'migrated/products',
          });

          await prisma.productImage.update({
            where: { id: img.id },
            data: { url: uploaded.url },
          });

          migratedProductCount++;
          logger.info(`Migrated product image ${img.id} -> ${uploaded.url}`);
        } catch (err) {
          failedCount++;
          logger.error(`Failed to migrate product image ${img.id}: ${err.message}`);
        }
      } else {
        logger.warn(`Local file not found for product image ${img.id}: ${localFilePath}`);
      }
    }
  }

  // 2. Migrate Media Assets
  const mediaAssets = await prisma.mediaAsset.findMany();
  logger.info(`Checking ${mediaAssets.length} media assets for local references...`);

  for (const asset of mediaAssets) {
    const isLocalUrl = asset.url && (asset.url.includes(`/${env.UPLOAD_DIR}/`) || asset.url.startsWith(`uploads/`));
    const isLocalPath = asset.path && fs.existsSync(asset.path);

    if (isLocalUrl || isLocalPath) {
      const localFilePath = isLocalPath ? asset.path : path.join(uploadsDir, asset.filename || path.basename(asset.url));

      if (fs.existsSync(localFilePath)) {
        try {
          const buffer = fs.readFileSync(localFilePath);
          const uploaded = await StorageService.uploadBuffer({
            buffer,
            originalName: asset.originalName || asset.filename || 'asset',
            mimeType: asset.mimeType || 'application/octet-stream',
            folder: `migrated/${asset.folder || 'general'}`,
          });

          await prisma.mediaAsset.update({
            where: { id: asset.id },
            data: {
              url: uploaded.url,
              path: uploaded.path,
            },
          });

          migratedMediaCount++;
          logger.info(`Migrated media asset ${asset.id} -> ${uploaded.url}`);
        } catch (err) {
          failedCount++;
          logger.error(`Failed to migrate media asset ${asset.id}: ${err.message}`);
        }
      }
    }
  }

  logger.info(`\nMigration completed!`);
  logger.info(`Product Images Migrated: ${migratedProductCount}`);
  logger.info(`Media Assets Migrated: ${migratedMediaCount}`);
  logger.info(`Failed Migrations: ${failedCount}`);
  logger.info(`Local files were preserved in ${uploadsDir} for backup security.`);
}

runMigration()
  .catch((err) => {
    logger.error(`Migration script failed: ${err.message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
