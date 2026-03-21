import type {
  Product as PrismaProduct,
  Enrollment as PrismaEnrollment,
} from '@prisma/client';

export type Product = PrismaProduct;
export type Enrollment = PrismaEnrollment;

/** Product + enrollment для конкретного юзера */
export interface ProductWithEnrollment extends Product {
  enrollment: {
    id:         string;
    enrolledAt: Date;
    trialEnd:   Date | null;   // тільки trialEnd, expiresAt немає
    purchased:  boolean;
  } | null;
}

export interface CreateProductInput {
  code:         string;
  name:         string;
  description?: string;
  ownerId:      string;        // Prisma схема: Product.ownerId
  priceCents?:  number;
  currency?:    string;
  durationDays?: number;
  features?:   Record<string, unknown>;
  limits?:     Record<string, unknown>;
  systemPrompt?: string | null;
  mentorConfig?: Record<string, unknown> | null;
}

export interface UpdateProductInput {
  name?:         string;
  description?:  string;
  priceCents?:   number;
  currency?:     string;
  durationDays?: number;
  features?:    Record<string, unknown>;
  limits?:      Record<string, unknown>;
}

export interface EnrollUserInput {
  userId:      string;
  productId:   string;
  purchased?:  boolean;
  trialDays?:  number;
}
