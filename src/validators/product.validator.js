import { z } from 'zod';
import { GENDERS, SORT_OPTIONS } from '../config/constants.js';

export const productImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  alt: z.string().optional().default(''),
  isPrimary: z.boolean().optional().default(false),
  isHover: z.boolean().optional().default(false),
  type: z.enum(['front', 'back', 'detail', 'editorial', 'perspective']).optional().default('perspective'),
  sortOrder: z.number().int().optional().default(0),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, 'Variant SKU is required'),
  size: z.string().min(1, 'Size is required'),
  color: z.string().min(1, 'Color is required'),
  colorHex: z.string().min(1, 'Color HEX is required'),
  stock: z.number().int().min(0, 'Stock cannot be negative').default(0),
  priceOverride: z.number().positive().nullable().optional(),
});

export const colorOptionSchema = z.object({
  name: z.string().min(1),
  hex: z.string().min(1),
});

export const createProductSchema = z.object({
  sku: z.string().min(3).max(50),
  slug: z.string().min(3).max(150).optional(),
  name: z.string().min(2, 'Product name must have at least 2 characters'),
  tagline: z.string().optional().default(''),
  category: z.string().min(1, 'Category is required'),
  categoryLabel: z.string().optional().default(''),
  collectionId: z.string().nullable().optional(),
  gender: z.enum(Object.values(GENDERS)).optional().default(GENDERS.UNISEX),
  styles: z.array(z.string()).optional().default([]),
  leatherType: z.string().min(1, 'Leather type is required'),
  hardware: z.string().optional().default(''),
  lining: z.string().optional().default(''),
  modelInfo: z.string().optional().default(''),
  description: z.string().min(10, 'Description must have at least 10 characters'),
  editorialQuote: z.string().optional().default(''),
  price: z.number().positive('Price must be a positive number in EUR'),
  salePrice: z.number().positive('Sale price must be positive').nullable().optional(),
  isFeatured: z.boolean().optional().default(false),
  isBestseller: z.boolean().optional().default(false),
  isNewArrival: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
  images: z.array(productImageSchema).optional().default([]),
  variants: z.array(productVariantSchema).optional().default([]),
  specifications: z.array(z.string()).optional().default([]),
  careInstructions: z.array(z.string()).optional().default([]),
  availableColors: z.array(colorOptionSchema).optional().default([]),
  availableSizes: z.array(z.string()).optional().default([]),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productFilterQuerySchema = z.object({
  category: z.string().optional(),
  gender: z.enum(['men', 'women', 'unisex', 'all']).optional(),
  style: z.string().optional(),
  leather_type: z.string().optional(),
  leatherType: z.string().optional(),
  leatherFamily: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  is_new: z.coerce.boolean().optional(),
  is_bestseller: z.coerce.boolean().optional(),
  is_featured: z.coerce.boolean().optional(),
  status: z.enum(['published', 'draft', 'all']).optional(),
  sort: z.enum(Object.values(SORT_OPTIONS)).optional(),
  sortBy: z.string().optional(),
  search: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const createReviewSchema = z.object({
  author: z.string().min(2, 'Author name is required'),
  location: z.string().min(2, 'Location is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  title: z.string().min(2, 'Review title is required'),
  comment: z.string().min(5, 'Review comment must have at least 5 characters'),
  verified: z.boolean().optional().default(true),
});

export const bulkProductActionSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'delete']),
  ids: z.array(z.string()).min(1, 'At least one product ID is required'),
});

export const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      order: z.number().int(),
    })
  ).min(1, 'At least one item required for reordering'),
});
