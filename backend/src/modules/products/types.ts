// backend/src/modules/products/types.ts
import type { Product as PrismaProduct, ProductMember as PrismaProductMember } from '@prisma/client';

// ✅ Використовуємо Prisma types напряму
export type Product = PrismaProduct;

export type ProductMember = PrismaProductMember;

// ✅ Product з інформацією про enrollment
export interface ProductWithEnrollment extends Product {
  enrollment: {
    id: string;
    enrolledAt: Date;
    expiresAt: Date | null;
    trialEnd: Date | null;
    purchased: boolean;
  } | null;
}

// ✅ Input types
export interface CreateProductInput {
  code: string;
  name: string;
  description?: string;
  ownerId: string;
  priceCents?: number;
  currency?: string;
  durationDays?: number;
  features?: Record<string, any>;
  limits?: Record<string, any>;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  priceCents?: number;
  currency?: string;
  durationDays?: number;
  features?: Record<string, any>;
  limits?: Record<string, any>;
}

export interface EnrollUserInput {
  userId: string;
  productId: string;
  purchased?: boolean;
  trialDays?: number;
}