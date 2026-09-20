import { z } from 'zod';
import { COMMISSION_STATUS } from '../config/constants.js';

export const createCommissionSchema = z.object({
  silhouetteId: z.string().optional(),
  silhouetteName: z.string().optional(),
  leatherId: z.string().optional(),
  leatherName: z.string().optional(),
  colorId: z.string().optional(),
  colorName: z.string().optional(),
  liningId: z.string().optional(),
  liningName: z.string().optional(),
  hardwareId: z.string().optional(),
  hardwareName: z.string().optional(),
  monogramText: z.string().max(10).optional(),
  monogramPlacement: z.string().max(100).optional(),
  measurements: z
    .object({
      unit: z.enum(['cm', 'in']).default('cm'),
      chest: z.number().positive().optional(),
      waist: z.number().positive().optional(),
      shoulders: z.number().positive().optional(),
      sleeve: z.number().positive().optional(),
      backLength: z.number().positive().optional(),
    })
    .optional(),
  customer: z.object({
    name: z.string().min(2, 'Customer name is required'),
    email: z.string().email('Valid customer email is required'),
    phone: z.string().optional().default(''),
  }),
  notes: z.string().optional().default(''),
  estimatedPrice: z.number().positive().optional(),
});

export const updateCommissionStatusSchema = z.object({
  status: z.enum(Object.values(COMMISSION_STATUS)),
  notes: z.string().optional(),
});

export const bulkCommissionStatusSchema = z.object({
  status: z.enum(Object.values(COMMISSION_STATUS)),
  ids: z.array(z.string()).min(1),
});
