import { prisma } from '../lib/prisma.js';
import { mapCategory } from '../utils/mapper.js';
import { HTTP_STATUS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

export const CategoryService = {
  async getAllCategories(isPublic = true) {
    const where = isPublic ? { isPublished: true } : {};

    const categories = await prisma.category.findMany({
      where,
      orderBy: { featuredOrder: 'asc' },
      include: {
        _count: {
          select: {
            products: {
              where: isPublic ? { isPublished: true } : {},
            },
          },
        },
      },
    });

    return categories.map((cat) => mapCategory(cat, cat._count?.products || 0));
  },

  async getCategoryBySlug(slug, isPublic = true) {
    const where = { slug };
    if (isPublic) where.isPublished = true;

    const category = await prisma.category.findFirst({
      where,
      include: {
        _count: {
          select: {
            products: {
              where: isPublic ? { isPublished: true } : {},
            },
          },
        },
      },
    });

    if (!category) {
      const err = new Error(`Category '${slug}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    return mapCategory(category, category._count?.products || 0);
  },

  async createCategory(data) {
    try {
      const cat = await prisma.category.create({
        data: {
          slug: data.slug,
          name: data.name,
          subtitle: data.subtitle || '',
          description: data.description || '',
          heroImage: data.heroImage || '',
          featuredOrder: data.featuredOrder || 0,
          isPublished: data.isPublished ?? true,
          highlightSpecs: data.highlightSpecs || [],
          seoTitle: data.seoTitle || null,
          seoDescription: data.seoDescription || null,
        },
      });

      return mapCategory(cat, 0);
    } catch (error) {
      if (error.code === 'P2002') {
        const err = new Error(`Category slug '${data.slug}' already exists`);
        err.statusCode = HTTP_STATUS.CONFLICT;
        err.errorCode = 'ERR_DUPLICATE_SLUG';
        throw err;
      }
      throw error;
    }
  },

  async updateCategory(id, data) {
    const updates = {};
    if (data.name) updates.name = data.name;
    if (data.slug) updates.slug = data.slug;
    if (data.subtitle !== undefined) updates.subtitle = data.subtitle;
    if (data.description !== undefined) updates.description = data.description;
    if (data.heroImage !== undefined) updates.heroImage = data.heroImage;
    if (data.featuredOrder !== undefined) updates.featuredOrder = data.featuredOrder;
    if (data.isPublished !== undefined) updates.isPublished = data.isPublished;
    if (data.highlightSpecs) updates.highlightSpecs = data.highlightSpecs;
    if (data.seoTitle !== undefined) updates.seoTitle = data.seoTitle;
    if (data.seoDescription !== undefined) updates.seoDescription = data.seoDescription;

    try {
      const cat = await prisma.category.update({
        where: { id },
        data: updates,
      });

      return mapCategory(cat, 0);
    } catch (error) {
      const err = new Error('Category not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },

  async deleteCategory(id) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      const err = new Error('Category not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'CATEGORY_NOT_FOUND';
      throw err;
    }

    const productCount = await prisma.product.count({
      where: {
        categorySlug: category.slug,
      },
    });

    if (productCount > 0) {
      const productWord = productCount === 1 ? 'product' : 'products';
      const err = new Error(
        `Cannot delete category because it is being used by ${productCount} ${productWord}.`
      );
      err.statusCode = HTTP_STATUS.CONFLICT;
      err.errorCode = 'CATEGORY_IN_USE';
      err.details = {
        categoryId: category.id,
        productCount,
      };
      throw err;
    }

    try {
      const deleted = await prisma.category.delete({
        where: { id },
      });

      return deleted;
    } catch (error) {
      if (error.code === 'P2003') {
        const err = new Error(
          'Cannot delete category because it is being used by products.'
        );
        err.statusCode = HTTP_STATUS.CONFLICT;
        err.errorCode = 'CATEGORY_IN_USE';
        err.details = {
          categoryId: id,
        };
        throw err;
      }

      if (error.code === 'P2025') {
        const err = new Error('Category not found');
        err.statusCode = HTTP_STATUS.NOT_FOUND;
        err.errorCode = 'CATEGORY_NOT_FOUND';
        throw err;
      }

      logger.error(`Delete category error: ${error.message}`, {
        categoryId: id,
        code: error.code,
      });
      throw error;
    }
  },

  async reorderCategories(items) {
    const updates = items.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: { featuredOrder: item.order },
      })
    );
    await prisma.$transaction(updates);
    return { message: 'Categories reordered successfully' };
  },

  async getCollections(isPublic = true) {
    const where = isPublic ? { isActive: true } : {};

    const collections = await prisma.collection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return collections.map((col) => ({
      id: col.id,
      _id: col.id,
      slug: col.slug,
      title: col.title,
      season: col.season,
      subtitle: col.subtitle,
      description: col.description,
      heroImage: col.heroImage,
      badge: col.badge,
      isActive: col.isActive,
    }));
  },

  async createCollection(data) {
    try {
      const col = await prisma.collection.create({
        data: {
          slug: data.slug,
          title: data.title,
          season: data.season,
          subtitle: data.subtitle || '',
          description: data.description || '',
          heroImage: data.heroImage || '',
          badge: data.badge || null,
          isActive: data.isActive ?? true,
        },
      });

      return {
        ...col,
        _id: col.id,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        const err = new Error(`Collection slug '${data.slug}' already exists`);
        err.statusCode = HTTP_STATUS.CONFLICT;
        err.errorCode = 'ERR_DUPLICATE_SLUG';
        throw err;
      }
      throw error;
    }
  },

  async updateCollection(id, data) {
    const updates = {};
    if (data.title) updates.title = data.title;
    if (data.slug) updates.slug = data.slug;
    if (data.season) updates.season = data.season;
    if (data.subtitle !== undefined) updates.subtitle = data.subtitle;
    if (data.description !== undefined) updates.description = data.description;
    if (data.heroImage !== undefined) updates.heroImage = data.heroImage;
    if (data.badge !== undefined) updates.badge = data.badge;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    try {
      const col = await prisma.collection.update({
        where: { id },
        data: updates,
      });

      return {
        ...col,
        _id: col.id,
      };
    } catch (error) {
      const err = new Error('Collection not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },

  async deleteCollection(id) {
    try {
      const col = await prisma.collection.delete({
        where: { id },
      });
      return {
        ...col,
        _id: col.id,
      };
    } catch (error) {
      const err = new Error('Collection not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },
};
