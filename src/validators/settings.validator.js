import { z } from 'zod';

export const updateSettingsSchema = z.object({
  announcement: z
    .object({
      enabled: z.boolean().optional(),
      badge: z.string().optional(),
      message: z.string().optional(),
      linkText: z.string().optional(),
      linkHref: z.string().optional(),
      countryNotice: z.string().optional(),
    })
    .optional(),
  shipping: z
    .object({
      freeShippingThreshold: z.number().min(0).optional(),
      standardShippingCost: z.number().min(0).optional(),
      countries: z
        .array(
          z.object({
            code: z.string(),
            name: z.string(),
            rate: z.number().optional(),
            days: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  footer: z
    .object({
      certificationLine: z.string().optional(),
      atelierAddress: z.string().optional(),
      instagramHandle: z.string().optional(),
      copyrightText: z.string().optional(),
      cities: z.array(z.string()).optional(),
      columns: z
        .array(
          z.object({
            title: z.string(),
            links: z.array(
              z.object({
                label: z.string(),
                href: z.string(),
              })
            ),
          })
        )
        .optional(),
    })
    .optional(),
  searchKeywords: z.array(z.string()).optional(),
  platformName: z.string().min(1).max(150).optional(),
  platformShortName: z.string().max(50).optional().nullable().or(z.literal('')),
  logoUrl: z
    .string()
    .max(1000)
    .refine((val) => !val || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'), {
      message: 'Must be a valid URL or path',
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  logoDarkUrl: z
    .string()
    .max(1000)
    .refine((val) => !val || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'), {
      message: 'Must be a valid URL or path',
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  logoLightUrl: z
    .string()
    .max(1000)
    .refine((val) => !val || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'), {
      message: 'Must be a valid URL or path',
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  faviconUrl: z
    .string()
    .max(1000)
    .refine((val) => !val || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'), {
      message: 'Must be a valid URL or path',
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  browserTitle: z.string().min(1).max(200).optional(),
  metaDescription: z.string().max(1000).optional().nullable().or(z.literal('')),
});

const urlOrPathValidator = z
  .string()
  .max(1000)
  .refine((val) => !val || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'), {
    message: 'Must be a valid URL or path',
  })
  .optional()
  .nullable()
  .or(z.literal(''));

export const updateBrandingSchema = z.object({
  platformName: z.string().min(1, 'Platform name cannot be empty').max(150, 'Platform name must be under 150 characters').optional(),
  platformShortName: z.string().max(50, 'Short name must be under 50 characters').optional().nullable().or(z.literal('')),
  logoUrl: urlOrPathValidator,
  logoDarkUrl: urlOrPathValidator,
  logoLightUrl: urlOrPathValidator,
  faviconUrl: urlOrPathValidator,
  browserTitle: z.string().min(1, 'Browser title cannot be empty').max(200, 'Browser title must be under 200 characters').optional(),
  metaDescription: z.string().max(1000, 'Meta description must be under 1000 characters').optional().nullable().or(z.literal('')),
});

export const updateSearchKeywordsSchema = z.object({
  keywords: z.array(z.string()).min(1),
});

export const updateNavigationMenuSchema = z.object({
  payload: z.any(),
});
