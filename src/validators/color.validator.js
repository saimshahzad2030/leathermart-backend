import { z } from 'zod';

export const createColorSchema = z.object({
  name: z.string().min(1, 'Color name is required').max(50),
  slug: z.string().max(50).optional(),
  hex: z
    .string()
    .min(1, 'Color HEX value is required')
    .refine(
      (val) => /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val),
      { message: 'Invalid HEX color format (e.g. #11100F or #000)' }
    ),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateColorSchema = createColorSchema.partial();
