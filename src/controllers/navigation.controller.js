import { NavigationService } from '../services/navigation.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../config/constants.js';

export const NavigationController = {
  // ==========================================
  // Public Storefront
  // ==========================================
  async getPublicNavigation(req, res, next) {
    try {
      const deptParam = (req.query.department || req.query.menu || '').toLowerCase().trim();
      if (deptParam && deptParam !== 'men' && deptParam !== 'women' && deptParam !== 'all') {
        const err = new Error(`Invalid department '${deptParam}'. Supported values: 'men', 'women'.`);
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        err.errorCode = 'ERR_INVALID_DEPARTMENT';
        throw err;
      }

      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      const data = await NavigationService.getPublicNavigation(deptParam === 'all' ? null : deptParam || null);
      return ApiResponse.success(res, { data });
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // Admin Mega Menu (Legacy & Unified)
  // ==========================================
  async getMegaMenu(req, res, next) {
    try {
      const menu = (req.query.menu || req.query.department || '').toLowerCase().trim();
      const data = await NavigationService.getAdminMegaMenu(menu || null);
      return ApiResponse.success(res, { data });
    } catch (err) {
      next(err);
    }
  },

  async updateMegaMenu(req, res, next) {
    try {
      const menuKey = req.params.menuKey;
      const payload = req.body.payload || req.body;
      const asDraft = req.query.draft === 'true' || req.body.isDraft === true || req.body.draft === true;
      const updated = await NavigationService.saveAdminMegaMenu(menuKey, payload, { asDraft });
      return ApiResponse.success(res, {
        message: asDraft
          ? `Navigation menu '${menuKey}' draft saved successfully`
          : `Navigation menu '${menuKey}' updated successfully`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // Menus CRUD
  // ==========================================
  async listMenus(req, res, next) {
    try {
      const { department, isActive, isDraft } = req.query;
      const filter = {};
      if (department) filter.department = department;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (isDraft !== undefined) filter.isDraft = isDraft === 'true';

      const menus = await NavigationService.listMenus(filter);
      return ApiResponse.success(res, { data: menus });
    } catch (err) {
      next(err);
    }
  },

  async getMenuById(req, res, next) {
    try {
      const menu = await NavigationService.getMenuById(req.params.id);
      return ApiResponse.success(res, { data: menu });
    } catch (err) {
      next(err);
    }
  },

  async createMenu(req, res, next) {
    try {
      const menu = await NavigationService.createMenu(req.body);
      return ApiResponse.created(res, {
        message: 'Navigation menu created successfully',
        data: menu,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateMenu(req, res, next) {
    try {
      const menu = await NavigationService.updateMenu(req.params.id, req.body);
      return ApiResponse.success(res, {
        message: 'Navigation menu updated successfully',
        data: menu,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteMenu(req, res, next) {
    try {
      const result = await NavigationService.deleteMenu(req.params.id);
      return ApiResponse.success(res, {
        message: 'Navigation menu deleted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async publishMenu(req, res, next) {
    try {
      const menu = await NavigationService.publishMenu(req.params.id, req.body);
      return ApiResponse.success(res, {
        message: 'Navigation menu published successfully',
        data: menu,
      });
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // Sections CRUD
  // ==========================================
  async listSections(req, res, next) {
    try {
      const sections = await NavigationService.listSections(req.params.menuId);
      return ApiResponse.success(res, { data: sections });
    } catch (err) {
      next(err);
    }
  },

  async createSection(req, res, next) {
    try {
      const section = await NavigationService.createSection(req.params.menuId, req.body);
      return ApiResponse.created(res, {
        message: 'Navigation section created successfully',
        data: section,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateSection(req, res, next) {
    try {
      const section = await NavigationService.updateSection(req.params.id, req.body);
      return ApiResponse.success(res, {
        message: 'Navigation section updated successfully',
        data: section,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteSection(req, res, next) {
    try {
      const result = await NavigationService.deleteSection(req.params.id);
      return ApiResponse.success(res, {
        message: 'Navigation section deleted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async reorderSections(req, res, next) {
    try {
      const result = await NavigationService.reorderSections(req.body.items);
      return ApiResponse.success(res, {
        message: 'Navigation sections reordered successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // Items CRUD
  // ==========================================
  async listItems(req, res, next) {
    try {
      const items = await NavigationService.listItems(req.params.sectionId);
      return ApiResponse.success(res, { data: items });
    } catch (err) {
      next(err);
    }
  },

  async createItem(req, res, next) {
    try {
      const item = await NavigationService.createItem(req.params.sectionId, req.body);
      return ApiResponse.created(res, {
        message: 'Navigation item created successfully',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateItem(req, res, next) {
    try {
      const item = await NavigationService.updateItem(req.params.id, req.body);
      return ApiResponse.success(res, {
        message: 'Navigation item updated successfully',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteItem(req, res, next) {
    try {
      const result = await NavigationService.deleteItem(req.params.id);
      return ApiResponse.success(res, {
        message: 'Navigation item deleted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async reorderItems(req, res, next) {
    try {
      const result = await NavigationService.reorderItems(req.body.items);
      return ApiResponse.success(res, {
        message: 'Navigation items reordered successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // Features CRUD
  // ==========================================
  async listFeatures(req, res, next) {
    try {
      const features = await NavigationService.listFeatures(req.params.menuId);
      return ApiResponse.success(res, { data: features });
    } catch (err) {
      next(err);
    }
  },

  async createFeature(req, res, next) {
    try {
      const feature = await NavigationService.createFeature(req.params.menuId, req.body);
      return ApiResponse.created(res, {
        message: 'Navigation feature created successfully',
        data: feature,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateFeature(req, res, next) {
    try {
      const feature = await NavigationService.updateFeature(req.params.id, req.body);
      return ApiResponse.success(res, {
        message: 'Navigation feature updated successfully',
        data: feature,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteFeature(req, res, next) {
    try {
      const result = await NavigationService.deleteFeature(req.params.id);
      return ApiResponse.success(res, {
        message: 'Navigation feature deleted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async reorderFeatures(req, res, next) {
    try {
      const result = await NavigationService.reorderFeatures(req.body.items);
      return ApiResponse.success(res, {
        message: 'Navigation features reordered successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
