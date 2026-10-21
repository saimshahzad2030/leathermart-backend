import { z } from 'zod';
import { GENDERS, SORT_OPTIONS } from '../config/constants.js';

export const productImageSchema = z.object({
  url: z.string().min(1, 'Image URL is required').refine(
    (val) =>
      val.startsWith('http://') ||
      val.startsWith('https://') ||
      val.startsWith('data:') ||
      val.startsWith('/'),
    { message: 'Invalid image URL or data URI' }
  ),
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
  inStock: z.boolean().optional().default(true),
  stock: z.number().int().optional(), // transitional legacy support
  priceOverride: z.number().positive().nullable().optional(),
});

export const colorOptionSchema = z.object({
  name: z.string().min(1),
  hex: z.string().min(1),
});

export const regionalPriceSchema = z.object({
  id: z.string().optional(),
  regionCode: z.enum(['PK', 'IT', 'GLOBAL']),
  currency: z.enum(['PKR', 'EUR']),
  price: z.coerce.number().positive('Regional price must be a positive number'),
  salePrice: z.coerce.number().positive().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const baseProductSchema = z.object({
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
  price: z.coerce.number().positive('Price must be a positive number'),
  salePrice: z.coerce.number().positive('Sale price must be positive').nullable().optional(),
  isFeatured: z.boolean().optional().default(false),
  isBestseller: z.boolean().optional().default(false),
  isNewArrival: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(true),
  isInStock: z.union([
    z.boolean(),
    z.string().transform((v) => v === 'true' || v === '1'),
    z.number().transform((v) => v === 1),
  ]).optional().default(true),
  sortOrder: z.number().int().optional().default(0),
  images: z.array(productImageSchema).optional().default([]),
  variants: z.array(productVariantSchema).optional().default([]),
  specifications: z.array(z.string()).optional().default([]),
  careInstructions: z.array(z.string()).optional().default([]),
  // Every product must have at least one size and one color
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.union([z.string(), colorOptionSchema])).optional(),
  availableColors: z.array(colorOptionSchema).optional().default([]),
  availableSizes: z.array(z.string()).optional().default([]),
  regionalPrices: z.array(regionalPriceSchema).optional().default([]),
  policies: z.array(z.string()).optional().default([]),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

export const createProductSchema = baseProductSchema.refine(
  (data) => {
    const hasSizes = (data.sizes && data.sizes.length > 0) || (data.availableSizes && data.availableSizes.length > 0);
    return hasSizes;
  },
  { message: 'Every product must have at least one available size selected', path: ['sizes'] }
).refine(
  (data) => {
    const hasColors = (data.colors && data.colors.length > 0) || (data.availableColors && data.availableColors.length > 0);
    return hasColors;
  },
  { message: 'Every product must have at least one available color selected', path: ['colors'] }
);

export const updateProductSchema = baseProductSchema.partial();

const booleanQueryParam = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (val === 'true' || val === true || val === '1' || val === 1) return true;
  if (val === 'false' || val === false || val === '0' || val === 0) return false;
  return val;
}, z.boolean().optional());

export const productFilterQuerySchema = z.object({
  category: z.string().optional(),
  gender: z.enum(['men', 'women', 'unisex', 'all']).optional(),
  style: z.string().optional(),
  leather_type: z.string().optional(),
  leatherType: z.string().optional(),
  leatherFamily: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  market: z.string().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  is_new: booleanQueryParam,
  is_bestseller: booleanQueryParam,
  is_featured: booleanQueryParam,
  in_stock: booleanQueryParam,
  isInStock: booleanQueryParam,
  is_in_stock: booleanQueryParam,
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
