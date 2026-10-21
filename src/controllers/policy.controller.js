import { PolicyService } from '../services/policy.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const PolicyController = {
  async listPoliciesPublic(req, res, next) {
    try {
      const policies = await PolicyService.listPolicies(req.query, true);
      return ApiResponse.success(res, {
        message: 'Active policies retrieved successfully',
        data: policies,
      });
    } catch (err) {
      next(err);
    }
  },

  async listPoliciesAdmin(req, res, next) {
    try {
      const policies = await PolicyService.listPolicies(req.query, false);
      return ApiResponse.success(res, {
        message: 'All policies retrieved successfully',
        data: policies,
      });
    } catch (err) {
      next(err);
    }
  },

  async getPolicyById(req, res, next) {
    try {
      const policy = await PolicyService.getPolicyById(req.params.id);
      return ApiResponse.success(res, {
        data: policy,
      });
    } catch (err) {
      next(err);
    }
  },

  async createPolicy(req, res, next) {
    try {
      const policy = await PolicyService.createPolicy(req.body);
      return ApiResponse.created(res, {
        message: 'Policy created successfully',
        data: policy,
      });
    } catch (err) {
      next(err);
    }
  },

  async updatePolicy(req, res, next) {
    try {
      const policy = await PolicyService.updatePolicy(req.params.id, req.body);
      return ApiResponse.success(res, {
        message: 'Policy updated successfully',
        data: policy,
      });
    } catch (err) {
      next(err);
    }
  },

  async toggleActive(req, res, next) {
    try {
      const policy = await PolicyService.toggleActive(req.params.id);
      return ApiResponse.success(res, {
        message: `Policy is now ${policy.isActive ? 'active' : 'inactive'}`,
        data: policy,
      });
    } catch (err) {
      next(err);
    }
  },

  async deletePolicy(req, res, next) {
    try {
      const result = await PolicyService.deletePolicy(req.params.id);
      return ApiResponse.success(res, {
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },
};
