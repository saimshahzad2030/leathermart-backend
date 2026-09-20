import { SettingsService } from '../services/settings.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

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
      const menu = await SettingsService.getNavigationMenu(req.query.menu);
      return ApiResponse.success(res, { data: menu });
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
