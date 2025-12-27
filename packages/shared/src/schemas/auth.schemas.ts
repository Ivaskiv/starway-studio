// packages/shared/src/schemas/auth.schemas.ts

import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email обов\'язковий')
    .email('Невірний формат email'),
  password: z
    .string()
    .min(1, 'Пароль обов\'язковий'),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Ім\'я має містити мінімум 2 символи')
    .max(50, 'Ім\'я занадто довге'),
  email: z
    .string()
    .min(1, 'Email обов\'язковий')
    .email('Невірний формат email'),
  password: z
    .string()
    .min(8, 'Пароль має містити мінімум 8 символів')
    .regex(/[a-zA-Z]/, 'Пароль має містити хоча б одну букву')
    .regex(/\d/, 'Пароль має містити хоча б одну цифру'),
  confirmPassword: z
    .string()
    .min(1, 'Підтвердження пароля обов\'язкове'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Паролі не співпадають',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;