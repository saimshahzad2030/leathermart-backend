import { ColorService } from '../services/color.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const ColorController = {
  async listColorsPublic(req, res, next) {
    try {
      const colors = await ColorService.listColors(req.query, true);
      return ApiResponse.success(res, {
        message: 'Active colors retrieved successfully',
        data: colors,
      });
    } catch (err) {
      next(err);
    }
  },

  async listColorsAdmin(req, res, next) {
    try {
      const colors = await ColorService.listColors(req.query, false);
      return ApiResponse.success(res, {
        message: 'All colors retrieved successfully',
        data: colors,
      });
    } catch (err) {
      next(err);
    }
  },

  async getColorById(req, res, next) {
    try {
      const color = await ColorService.getColorById(req.params.id);
      return ApiResponse.success(res, {
        data: color,
      });
    } catch (err) {
      next(err);
    }
  },

  async createColor(req, res, next) {
    try {
      const color = await ColorService.createColor(req.body);
      return ApiResponse.created(res, {
        message: 'Color created successfully',
        data: color,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateColor(req, res, next) {
    try {
      const color = await ColorService.updateColor(req.params.id, req.body);
      return ApiResponse.success(res, {
        message: 'Color updated successfully',
        data: color,
      });
    } catch (err) {
      next(err);
    }
  },

  async toggleActive(req, res, next) {
    try {
      const color = await ColorService.toggleActive(req.params.id);
      return ApiResponse.success(res, {
        message: `Color is now ${color.isActive ? 'active' : 'inactive'}`,
        data: color,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteColor(req, res, next) {
    try {
      const result = await ColorService.deleteColor(req.params.id);
      return ApiResponse.success(res, {
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },
};
