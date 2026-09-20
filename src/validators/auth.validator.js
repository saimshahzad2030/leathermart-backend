import { z } from 'zod';
import { ROLES } from '../config/constants.js';

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const createAdminUserSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(Object.values(ROLES)).optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateAdminUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});
