import { ProductService } from '../services/product.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const ProductController = {
  // Public APIs
  async listProducts(req, res, next) {
    try {
      const { products, pagination } = await ProductService.listProducts(
        req.query,
        true
      );
      return ApiResponse.success(res, {
        message: 'Products retrieved successfully',
        data: products,
        pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  async getProductBySlug(req, res, next) {
    try {
      const product = await ProductService.getProductBySlug(
        req.params.slug,
        true
      );
      return ApiResponse.success(res, {
        message: 'Product retrieved successfully',
        data: product,
      });
    } catch (err) {
      next(err);
    }
  },

  async getFacets(req, res, next) {
    try {
      const facets = await ProductService.getFacets();
      return ApiResponse.success(res, {
        data: facets,
      });
    } catch (err) {
      next(err);
    }
  },

  async search(req, res, next) {
    try {
      const query = req.query.q || req.query.query || '';
      const results = await ProductService.searchProducts(query);
      return ApiResponse.success(res, {
        data: results,
      });
    } catch (err) {
      next(err);
    }
  },

  async getRelated(req, res, next) {
    try {
      const product = await ProductService.getProductBySlug(
        req.params.slug,
        true
      );
      return ApiResponse.success(res, {
        data: product.relatedProducts || [],
      });
    } catch (err) {
      next(err);
    }
  },

  async addReview(req, res, next) {
    try {
      const review = await ProductService.addReview(req.params.id, req.body);
      return ApiResponse.created(res, {
        message:
          'Your review has been submitted and is pending atelier moderation.',
        data: review,
      });
    } catch (err) {
      next(err);
    }
  },

  async listReviews(req, res, next) {
    try {
      const product = await ProductService.getProductBySlug(
        req.params.slug,
        true
      );
      return ApiResponse.success(res, {
        data: product.reviews || [],
      });
    } catch (err) {
      next(err);
    }
  },

  // Admin APIs
  async listProductsAdmin(req, res, next) {
    try {
      const { products, pagination } = await ProductService.listProducts(
        req.query,
        false
      );
      return ApiResponse.success(res, {
        data: products,
        pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  async getProductById(req, res, next) {
    try {
      const product = await ProductService.getProductById(req.params.id);
      return ApiResponse.success(res, {
        data: product,
      });
    } catch (err) {
      next(err);
    }
  },

  async createProduct(req, res, next) {
    try {
      const product = await ProductService.createProduct(req.body);
      return ApiResponse.created(res, {
        message: 'Garment specification created successfully',
        data: product,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateProduct(req, res, next) {
    try {
      const product = await ProductService.updateProduct(
        req.params.id,
        req.body
      );
      return ApiResponse.success(res, {
        message: 'Product updated successfully',
        data: product,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteProduct(req, res, next) {
    try {
      await ProductService.deleteProduct(req.params.id);
      return ApiResponse.success(res, {
        message: 'Product removed from collection successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async togglePublish(req, res, next) {
    try {
      const product = await ProductService.togglePublish(req.params.id);
      return ApiResponse.success(res, {
        message: `Product is now ${product.isPublished ? 'published' : 'draft'}`,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  },

  async duplicateProduct(req, res, next) {
    try {
      const cloned = await ProductService.duplicateProduct(req.params.id);
      return ApiResponse.created(res, {
        message: 'Product duplicated successfully as draft',
        data: cloned,
      });
    } catch (err) {
      next(err);
    }
  },

  async bulkAction(req, res, next) {
    try {
      const { action, ids } = req.body;
      const result = await ProductService.bulkAction(action, ids);
      return ApiResponse.success(res, {
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },

  async reorder(req, res, next) {
    try {
      const result = await ProductService.reorderProducts(req.body.items);
      return ApiResponse.success(res, {
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },

  async listAllReviews(req, res, next) {
    try {
      const reviews = await ProductService.listAllReviewsForAdmin(req.query);
      return ApiResponse.success(res, { data: reviews });
    } catch (err) {
      next(err);
    }
  },

  async moderateReview(req, res, next) {
    try {
      const { isApproved } = req.body;
      const review = await ProductService.moderateReview(
        req.params.id,
        isApproved
      );
      return ApiResponse.success(res, {
        message: `Review ${isApproved ? 'approved' : 'rejected'} successfully`,
        data: review,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteReview(req, res, next) {
    try {
      await ProductService.deleteReview(req.params.id);
      return ApiResponse.success(res, {
        message: 'Review deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};
