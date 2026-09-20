import { z } from 'zod';

export const updateCmsSectionSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  eyebrow: z.string().optional(),
  body: z.any().optional(),
  primaryCta: z
    .object({
      label: z.string().optional().default(''),
      href: z.string().optional().default(''),
    })
    .optional(),
  secondaryCta: z
    .object({
      label: z.string().optional().default(''),
      href: z.string().optional().default(''),
    })
    .optional(),
  mediaUrl: z.string().optional(),
  secondaryMediaUrl: z.string().optional(),
  extraPayload: z.any().optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateSectionVisibilitySchema = z.object({
  isVisible: z.boolean(),
});

export const createTestimonialSchema = z.object({
  quote: z.string().min(5, 'Quote is required'),
  author: z.string().min(2, 'Author is required'),
  city: z.string().min(2, 'City is required'),
  country: z.string().min(2, 'Country is required'),
  verifiedGarment: z.string().min(2, 'Verified garment is required'),
  rating: z.number().int().min(1).max(5).default(5),
  sortOrder: z.number().int().optional().default(0),
  isPublished: z.boolean().optional().default(true),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();

export const createSocialLookSchema = z.object({
  imageUrl: z.string().url('Valid image URL required'),
  caption: z.string().min(2, 'Caption is required'),
  tag: z.string().optional().default('@ATELIERVALENTI'),
  instagramUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().optional().default(0),
  isPublished: z.boolean().optional().default(true),
});

export const updateSocialLookSchema = createSocialLookSchema.partial();

export const subscribeNewsletterSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  locale: z.string().optional().default('en'),
});
