// packages/shared/src/schemas/auth.schemas.ts

import { z } from 'zod';
import { emailSchema, passwordSchema } from '../utils/validation';
import type { LoginRequest, RegisterRequest, ResetPasswordRequest, ResetPasswordConfirmRequest } from '../types';

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Пароль обов\'язковий'),
  remember: z.boolean().optional().default(false)
}) satisfies z.ZodType<LoginRequest>;

// Register schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string()
    .min(2, 'Ім\'я має бути мінімум 2 символи')
    .max(50, 'Ім\'я має бути максимум 50 символів'),
  lastName: z.string()
    .min(2, 'Прізвище має бути мінімум 2 символи')
    .max(50, 'Прізвище має бути максимум 50 символів')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Паролі не співпадають',
  path: ['confirmPassword']
}) satisfies z.ZodType<RegisterRequest>;

// Reset password schema
export const resetPasswordSchema = z.object({
  email: emailSchema
}) satisfies z.ZodType<ResetPasswordRequest>;

// Reset password confirm schema
export const resetPasswordConfirmSchema = z.object({
  token: z.string().min(1, 'Токен обов\'язковий'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Паролі не співпадають',
  path: ['confirmPassword']
}) satisfies z.ZodType<ResetPasswordConfirmRequest>;

// Verify email schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Токен обов\'язковий')
});

// Update profile schema
export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  company: z.string().max(100).optional(),
  website: z.string().url().optional(),
  avatar: z.string().url().optional()
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Поточний пароль обов\'язковий'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Паролі не співпадають',
  path: ['confirmPassword']
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;