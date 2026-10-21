import { z } from 'zod';

export const createSizeSchema = z.object({
  name: z.string().min(1, 'Size name or label is required').max(50),
  slug: z.string().max(50).optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateSizeSchema = createSizeSchema.partial();
