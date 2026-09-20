import { CommissionService } from '../services/commission.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const CommissionController = {
  // Public
  async getOptions(req, res, next) {
    try {
      const options = await CommissionService.getOptions();
      return ApiResponse.success(res, {
        data: options,
      });
    } catch (err) {
      next(err);
    }
  },

  async createCommission(req, res, next) {
    try {
      const result = await CommissionService.createCommission(req.body);
      return ApiResponse.created(res, {
        message: 'Custom commission registered successfully with the Milan atelier.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  // Admin
  async listCommissions(req, res, next) {
    try {
      const { commissions, pagination } = await CommissionService.listCommissions(
        req.query
      );
      return ApiResponse.success(res, {
        data: commissions,
        pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  async getCommissionById(req, res, next) {
    try {
      const commission = await CommissionService.getCommissionById(req.params.id);
      return ApiResponse.success(res, {
        data: commission,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status, notes } = req.body;
      const updated = await CommissionService.updateStatus(
        req.params.id,
        status,
        notes
      );
      return ApiResponse.success(res, {
        message: `Commission dossier status updated to '${status}'`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async bulkUpdateStatus(req, res, next) {
    try {
      const { status, ids } = req.body;
      const result = await CommissionService.bulkUpdateStatus(status, ids);
      return ApiResponse.success(res, {
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },

  // Custom Options Management (Admin CRUD)
  async createSilhouette(req, res, next) {
    try {
      const item = await CommissionService.createSilhouette(req.body);
      return ApiResponse.created(res, { data: item });
    } catch (err) {
      next(err);
    }
  },
  async updateSilhouette(req, res, next) {
    try {
      const item = await CommissionService.updateSilhouette(req.params.id, req.body);
      return ApiResponse.success(res, { data: item });
    } catch (err) {
      next(err);
    }
  },
  async deleteSilhouette(req, res, next) {
    try {
      await CommissionService.deleteSilhouette(req.params.id);
      return ApiResponse.success(res, { message: 'Silhouette deleted' });
    } catch (err) {
      next(err);
    }
  },

  async createLeather(req, res, next) {
    try {
      const item = await CommissionService.createLeather(req.body);
      return ApiResponse.created(res, { data: item });
    } catch (err) {
      next(err);
    }
  },
  async updateLeather(req, res, next) {
    try {
      const item = await CommissionService.updateLeather(req.params.id, req.body);
      return ApiResponse.success(res, { data: item });
    } catch (err) {
      next(err);
    }
  },
  async deleteLeather(req, res, next) {
    try {
      await CommissionService.deleteLeather(req.params.id);
      return ApiResponse.success(res, { message: 'Leather deleted' });
    } catch (err) {
      next(err);
    }
  },

  async createColor(req, res, next) {
    try {
      const item = await CommissionService.createColor(req.body);
      return ApiResponse.created(res, { data: item });
    } catch (err) {
      next(err);
    }
  },
  async updateColor(req, res, next) {
    try {
      const item = await CommissionService.updateColor(req.params.id, req.body);
      return ApiResponse.success(res, { data: item });
    } catch (err) {
      next(err);
    }
  },
  async deleteColor(req, res, next) {
    try {
      await CommissionService.deleteColor(req.params.id);
      return ApiResponse.success(res, { message: 'Color deleted' });
    } catch (err) {
      next(err);
    }
  },

  async createLining(req, res, next) {
    try {
      const item = await CommissionService.createLining(req.body);
      return ApiResponse.created(res, { data: item });
    } catch (err) {
      next(err);
    }
  },
  async updateLining(req, res, next) {
    try {
      const item = await CommissionService.updateLining(req.params.id, req.body);
      return ApiResponse.success(res, { data: item });
    } catch (err) {
      next(err);
    }
  },
  async deleteLining(req, res, next) {
    try {
      await CommissionService.deleteLining(req.params.id);
      return ApiResponse.success(res, { message: 'Lining deleted' });
    } catch (err) {
      next(err);
    }
  },

  async createHardware(req, res, next) {
    try {
      const item = await CommissionService.createHardware(req.body);
      return ApiResponse.created(res, { data: item });
    } catch (err) {
      next(err);
    }
  },
  async updateHardware(req, res, next) {
    try {
      const item = await CommissionService.updateHardware(req.params.id, req.body);
      return ApiResponse.success(res, { data: item });
    } catch (err) {
      next(err);
    }
  },
  async deleteHardware(req, res, next) {
    try {
      await CommissionService.deleteHardware(req.params.id);
      return ApiResponse.success(res, { message: 'Hardware deleted' });
    } catch (err) {
      next(err);
    }
  },
};
