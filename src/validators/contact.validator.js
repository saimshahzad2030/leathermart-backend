import { z } from 'zod';

export const createContactMessageSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Name must have at least 2 characters')
    .max(150, 'Name cannot exceed 150 characters'),
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Please provide a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  phone: z
    .string()
    .trim()
    .max(50, 'Phone number cannot exceed 50 characters')
    .optional()
    .default(''),
  subject: z
    .string({ required_error: 'Subject is required' })
    .trim()
    .min(2, 'Subject must have at least 2 characters')
    .max(150, 'Subject cannot exceed 150 characters'),
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(10, 'Message must have at least 10 characters')
    .max(5000, 'Message cannot exceed 5000 characters'),
});

export const updateContactMessageSchema = z.object({
  status: z
    .enum(['new', 'in_progress', 'resolved', 'spam'], {
      errorMap: () => ({ message: 'Status must be new, in_progress, resolved, or spam' }),
    })
    .optional(),
  adminNotes: z
    .string()
    .max(5000, 'Admin notes cannot exceed 5000 characters')
    .optional(),
});

export const contactFilterQuerySchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved', 'spam', 'all', '']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
});
