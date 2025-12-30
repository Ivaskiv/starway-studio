// packages/shared/src/utils/validation.ts

import { z } from 'zod';

// Email валідація
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Телефон валідація (український формат)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+38)?0\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Пароль валідація
export const isValidPassword = (password: string): boolean => {
  // Мінімум 8 символів, 1 велика, 1 мала, 1 цифра
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

// URL валідація
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Перевірка strength паролю
export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (password.length < 8) return 'weak';
  
  let strength = 0;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  if (password.length >= 12) strength++;
  
  if (strength <= 2) return 'weak';
  if (strength <= 3) return 'medium';
  return 'strong';
};

// Zod схеми
export const emailSchema = z.string().email('Невірний формат email');

export const passwordSchema = z
  .string()
  .min(8, 'Пароль має бути мінімум 8 символів')
  .regex(/[A-Z]/, 'Пароль має містити хоча б одну велику літеру')
  .regex(/[a-z]/, 'Пароль має містити хоча б одну малу літеру')
  .regex(/\d/, 'Пароль має містити хоча б одну цифру');

export const phoneSchema = z
  .string()
  .regex(/^(\+38)?0\d{9}$/, 'Невірний формат телефону');

export const urlSchema = z.string().url('Невірний формат URL');

// Валідація об'єктів
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: result.error.errors.map(err => err.message)
  };
};

// Sanitize HTML
export const sanitizeHtml = (html: string): string => {
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Перевірка чи строка пуста
export const isEmpty = (value: any): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

// Валідація кроку воронки
export const isValidStepConfig = (type: string, config: any): boolean => {
  if (!config) return false;
  
  switch (type) {
    case 'message':
      return !isEmpty(config.message?.text);
    case 'form':
      return Array.isArray(config.form?.fields) && config.form.fields.length > 0;
    case 'payment':
      return config.payment?.amount > 0 && !isEmpty(config.payment?.currency);
    case 'delay':
      return config.delay?.duration > 0;
    case 'webhook':
      return isValidUrl(config.webhook?.url);
    default:
      return true;
  }
};