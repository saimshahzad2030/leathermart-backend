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
});

export const updateSearchKeywordsSchema = z.object({
  keywords: z.array(z.string()).min(1),
});

export const updateNavigationMenuSchema = z.object({
  payload: z.any(),
});
