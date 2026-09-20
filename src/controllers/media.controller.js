import { MediaService } from '../services/media.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../config/constants.js';

export const MediaController = {
  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, {
          message: 'No file uploaded',
          errorCode: 'ERR_NO_FILE',
          statusCode: HTTP_STATUS.BAD_REQUEST,
        });
      }

      const asset = await MediaService.saveAsset(
        req.file,
        {
          folder: req.body.folder,
          altText: req.body.altText || req.body.alt_text,
        },
        req
      );

      return ApiResponse.created(res, {
        message: 'File uploaded successfully',
        data: asset,
      });
    } catch (err) {
      next(err);
    }
  },

  async listMedia(req, res, next) {
    try {
      const { assets, pagination } = await MediaService.listAssets(req.query);
      return ApiResponse.success(res, {
        data: assets,
        pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteMedia(req, res, next) {
    try {
      await MediaService.deleteAsset(req.params.id);
      return ApiResponse.success(res, {
        message: 'Media asset deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};
