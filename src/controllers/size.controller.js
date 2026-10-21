import { SizeService } from '../services/size.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const SizeController = {
  async listSizesPublic(req, res, next) {
    try {
      const sizes = await SizeService.listSizes(req.query, true);
      return ApiResponse.success(res, {
        message: 'Active sizes retrieved successfully',
        data: sizes,
      });
    } catch (err) {
      next(err);
    }
  },

  async listSizesAdmin(req, res, next) {
    try {
      const sizes = await SizeService.listSizes(req.query, false);
      return ApiResponse.success(res, {
        message: 'All sizes retrieved successfully',
        data: sizes,
      });
    } catch (err) {
      next(err);
    }
  },

  async getSizeById(req, res, next) {
    try {
      const size = await SizeService.getSizeById(req.params.id);
      return ApiResponse.success(res, {
        data: size,
      });
    } catch (err) {
      next(err);
    }
  },

  async createSize(req, res, next) {
    try {
      const size = await SizeService.createSize(req.body);
      return ApiResponse.created(res, {
        message: 'Size created successfully',
        data: size,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateSize(req, res, next) {
    try {
      const size = await SizeService.updateSize(req.params.id, req.body);
      return ApiResponse.success(res, {
        message: 'Size updated successfully',
        data: size,
      });
    } catch (err) {
      next(err);
    }
  },

  async toggleActive(req, res, next) {
    try {
      const size = await SizeService.toggleActive(req.params.id);
      return ApiResponse.success(res, {
        message: `Size is now ${size.isActive ? 'active' : 'inactive'}`,
        data: size,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteSize(req, res, next) {
    try {
      const result = await SizeService.deleteSize(req.params.id);
      return ApiResponse.success(res, {
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },
};
