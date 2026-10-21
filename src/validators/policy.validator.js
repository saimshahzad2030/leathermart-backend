import { z } from 'zod';

export const createPolicySchema = z.object({
  name: z.string().min(2, 'Policy name is required').max(150),
  slug: z.string().max(100).optional(),
  description: z.string().min(5, 'Policy description must be at least 5 characters'),
  bulletPoints: z.array(z.string()).default([]),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updatePolicySchema = createPolicySchema.partial();
