// packages/shared/src/hooks/useFunnelForm.ts

import { z } from 'zod';

// ============================================
// Schemas
// ============================================

export const createFunnelSchema = z.object({
  name: z.string().min(3, 'Назва має містити мінімум 3 символи'),
  slug: z
    .string()
    .min(3, 'Slug має містити мінімум 3 символи')
    .regex(/^[a-z0-9-]+$/, 'Тільки малі літери, цифри та дефіс'),
  description: z.string().optional(),
});

export const updateFunnelSchema = z.object({
  name: z.string().min(3, 'Назва має містити мінімум 3 символи').optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused']).optional(),
});

// ============================================
// Types
// ============================================

export type CreateFunnelFormData = z.infer<typeof createFunnelSchema>;
export type UpdateFunnelFormData = z.infer<typeof updateFunnelSchema>;

// ============================================
// Helper: Auto-generate slug
// ============================================

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

