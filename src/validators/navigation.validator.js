import { z } from 'zod';

export const createMenuSchema = z.object({
  name: z.string().min(1, 'Menu name is required').max(100),
  department: z.string().min(1, 'Department is required').max(50),
  slug: z.string().max(100).optional(),
  menuKey: z.string().max(50).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  isDraft: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
  payload: z.any().optional().nullable(),
});

export const updateMenuSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  department: z.string().min(1).max(50).optional(),
  slug: z.string().max(100).optional(),
  menuKey: z.string().max(50).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  payload: z.any().optional().nullable(),
});

export const createSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(100),
  slug: z.string().max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
  isDraft: z.boolean().optional().default(false),
});

export const updateSectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isDraft: z.boolean().optional(),
});

export const createItemSchema = z.object({
  type: z.enum(['CUSTOM_LINK', 'CATEGORY', 'PRODUCT']).default('CUSTOM_LINK'),
  label: z.string().min(1, 'Item label is required').max(100),
  labelKey: z.string().max(100).optional().nullable(),
  url: z.string().max(500).optional().nullable(),
  categoryId: z.string().uuid('Valid category ID required').optional().nullable(),
  productId: z.string().uuid('Valid product ID required').optional().nullable(),
  badge: z.string().max(50).optional().nullable(),
  legacyId: z.string().max(100).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
  isDraft: z.boolean().optional().default(false),
});

export const updateItemSchema = z.object({
  type: z.enum(['CUSTOM_LINK', 'CATEGORY', 'PRODUCT']).optional(),
  label: z.string().min(1).max(100).optional(),
  labelKey: z.string().max(100).optional().nullable(),
  url: z.string().max(500).optional().nullable(),
  categoryId: z.string().uuid('Valid category ID required').optional().nullable(),
  productId: z.string().uuid('Valid product ID required').optional().nullable(),
  badge: z.string().max(50).optional().nullable(),
  legacyId: z.string().max(100).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isDraft: z.boolean().optional(),
});

export const createFeatureSchema = z.object({
  title: z.string().min(1, 'Feature title is required').max(150),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().min(1, 'Image URL is required').max(1000),
  ctaText: z.string().max(100).optional().nullable(),
  ctaTextKey: z.string().max(100).optional().nullable(),
  ctaUrl: z.string().min(1, 'CTA destination URL is required').max(500),
  badge: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
  isDraft: z.boolean().optional().default(false),
});

export const updateFeatureSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().min(1).max(1000).optional(),
  ctaText: z.string().max(100).optional().nullable(),
  ctaTextKey: z.string().max(100).optional().nullable(),
  ctaUrl: z.string().min(1).max(500).optional(),
  badge: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isDraft: z.boolean().optional(),
});

export const reorderNavigationSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1, 'ID is required'),
        sortOrder: z.number().int(),
      })
    )
    .min(1, 'At least one item required for reordering'),
});

export const publishMenuSchema = z.object({
  isDraft: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const saveMegaMenuSchema = z.object({
  payload: z.record(z.any()),
});
