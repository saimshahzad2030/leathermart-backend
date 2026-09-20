import { CategoryService } from '../services/category.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const CategoryController = {
  // Public
  async listCategories(req, res, next) {
    try {
      const categories = await CategoryService.getAllCategories(true);
      return ApiResponse.success(res, {
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  },

  async getCategoryBySlug(req, res, next) {
    try {
      const category = await CategoryService.getCategoryBySlug(
        req.params.slug,
        true
      );
      return ApiResponse.success(res, {
        data: category,
      });
    } catch (err) {
      next(err);
    }
  },

  async listCollections(req, res, next) {
    try {
      const collections = await CategoryService.getCollections(true);
      return ApiResponse.success(res, {
        data: collections,
      });
    } catch (err) {
      next(err);
    }
  },

  // Admin
  async listCategoriesAdmin(req, res, next) {
    try {
      const categories = await CategoryService.getAllCategories(false);
      return ApiResponse.success(res, {
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  },

  async createCategory(req, res, next) {
    try {
      const category = await CategoryService.createCategory(req.body);
      return ApiResponse.created(res, {
        message: 'Category created successfully',
        data: category,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateCategory(req, res, next) {
    try {
      const category = await CategoryService.updateCategory(
        req.params.id,
        req.body
      );
      return ApiResponse.success(res, {
        message: 'Category updated successfully',
        data: category,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteCategory(req, res, next) {
    try {
      await CategoryService.deleteCategory(req.params.id);
      return ApiResponse.success(res, {
        message: 'Category deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async reorderCategories(req, res, next) {
    try {
      const result = await CategoryService.reorderCategories(req.body.items);
      return ApiResponse.success(res, {
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },

  async listCollectionsAdmin(req, res, next) {
    try {
      const collections = await CategoryService.getCollections(false);
      return ApiResponse.success(res, {
        data: collections,
      });
    } catch (err) {
      next(err);
    }
  },

  async createCollection(req, res, next) {
    try {
      const collection = await CategoryService.createCollection(req.body);
      return ApiResponse.created(res, {
        message: 'Collection created successfully',
        data: collection,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateCollection(req, res, next) {
    try {
      const collection = await CategoryService.updateCollection(
        req.params.id,
        req.body
      );
      return ApiResponse.success(res, {
        message: 'Collection updated successfully',
        data: collection,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteCollection(req, res, next) {
    try {
      await CategoryService.deleteCollection(req.params.id);
      return ApiResponse.success(res, {
        message: 'Collection deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};
