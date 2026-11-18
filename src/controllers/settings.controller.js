import { SettingsService } from '../services/settings.service.js';
import { CategoryService } from '../services/category.service.js';
import { NavigationService } from '../services/navigation.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../config/constants.js';

export const SettingsController = {
  // Public
  async getFooter(req, res, next) {
    try {
      const footer = await SettingsService.getFooterSettings();
      return ApiResponse.success(res, { data: footer });
    } catch (err) {
      next(err);
    }
  },

  async updateFooter(req, res, next) {
    try {
      const footer = await SettingsService.updateFooterSettings(req.body);
      return ApiResponse.success(res, {
        message: 'Footer settings updated successfully',
        data: footer,
      });
    } catch (err) {
      next(err);
    }
  },

  async getAnnouncement(req, res, next) {
    try {
      const announcement = await SettingsService.getAnnouncement();
      return ApiResponse.success(res, { data: announcement });
    } catch (err) {
      next(err);
    }
  },

  async getShipping(req, res, next) {
    try {
      const shipping = await SettingsService.getShippingSettings();
      return ApiResponse.success(res, { data: shipping });
    } catch (err) {
      next(err);
    }
  },

  async getSearchKeywords(req, res, next) {
    try {
      const keywords = await SettingsService.getSearchKeywords();
      return ApiResponse.success(res, { data: keywords });
    } catch (err) {
      next(err);
    }
  },

  async getNavigation(req, res, next) {
    try {
      const deptParam = (req.query.department || req.query.menu || '').toLowerCase().trim();
      if (deptParam && deptParam !== 'men' && deptParam !== 'women' && deptParam !== 'all') {
        const err = new Error(`Invalid department '${deptParam}'. Supported values: 'men', 'women'.`);
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        err.errorCode = 'ERR_INVALID_DEPARTMENT';
        throw err;
      }

      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      const navigation = await NavigationService.getPublicNavigation(deptParam === 'all' ? null : deptParam || null);
      return ApiResponse.success(res, { data: navigation });
    } catch (err) {
      next(err);
    }
  },

  async getSeoMetadata(req, res, next) {
    try {
      const path = req.query.path || '/';
      const metadata = await SettingsService.getSeoMetadata(path);
      return ApiResponse.success(res, { data: metadata });
    } catch (err) {
      next(err);
    }
  },

  async getBranding(req, res, next) {
    try {
      const branding = await SettingsService.getBranding();
      return ApiResponse.success(res, { data: branding });
    } catch (err) {
      next(err);
    }
  },

  // Admin
  async getSettings(req, res, next) {
    try {
      const settings = await SettingsService.getSettings();
      return ApiResponse.success(res, { data: settings });
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req, res, next) {
    try {
      const settings = await SettingsService.updateSettings(req.body);
      return ApiResponse.success(res, {
        message: 'Settings updated successfully',
        data: settings,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateBranding(req, res, next) {
    try {
      const branding = await SettingsService.updateBranding(req.body);
      return ApiResponse.success(res, {
        message: 'Platform branding updated successfully',
        data: branding,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateSearchKeywords(req, res, next) {
    try {
      const keywords = await SettingsService.updateSearchKeywords(
        req.body.keywords
      );
      return ApiResponse.success(res, {
        message: 'Search keywords updated successfully',
        data: keywords,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateNavigationMenu(req, res, next) {
    try {
      const menuKey = req.params.menuKey;
      const updated = await SettingsService.updateNavigationMenu(
        menuKey,
        req.body.payload
      );
      return ApiResponse.success(res, {
        message: `Navigation menu '${menuKey}' updated successfully`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },
};
