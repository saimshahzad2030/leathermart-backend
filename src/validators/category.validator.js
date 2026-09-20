import { z } from 'zod';

export const createCategorySchema = z.object({
  slug: z.string().min(2).max(100),
  name: z.string().min(2, 'Name is required'),
  subtitle: z.string().optional().default(''),
  description: z.string().optional().default(''),
  heroImage: z.string().optional().default(''),
  featuredOrder: z.number().int().optional().default(0),
  isPublished: z.boolean().optional().default(true),
  highlightSpecs: z.array(z.string()).optional().default([]),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createCollectionSchema = z.object({
  slug: z.string().min(2).max(100),
  title: z.string().min(2, 'Title is required'),
  season: z.string().min(1, 'Season is required'),
  subtitle: z.string().optional().default(''),
  description: z.string().optional().default(''),
  heroImage: z.string().optional().default(''),
  badge: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateCollectionSchema = createCollectionSchema.partial();
