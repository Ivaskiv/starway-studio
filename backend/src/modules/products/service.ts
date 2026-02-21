// backend/src/modules/products/service.ts
/**
 * Products Service - PROPER TYPES
 */

import { prisma } from '@/db/client.js';
import type {
  Product,
  ProductMember,
  ProductWithEnrollment,
  CreateProductInput,
  UpdateProductInput,
  EnrollUserInput
} from './types.js';

/**
 * Get all products
 */
export async function getAllProducts(): Promise<Product[]> {
  return prisma.product.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get product by ID
 */
export async function getProductById(productId: string): Promise<Product | null> {
  return prisma.product.findUnique({
    where: { id: productId }
  });
}

/**
 * Get product by code
 */
export async function getProductByCode(code: string): Promise<Product | null> {
  return prisma.product.findUnique({
    where: { code }
  });
}

/**
 * Create product
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  return prisma.product.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      ownerId: input.ownerId,
      priceCents: input.priceCents ?? 0,
      currency: input.currency ?? 'EUR',
      durationDays: input.durationDays ?? null,
      features: input.features ?? {},
      limits: input.limits ?? {}
      // ✅ createdAt/updatedAt - automatic
    }
  });
}

/**
 * Update product
 */
export async function updateProduct(
  productId: string,
  input: UpdateProductInput
): Promise<Product> {
  const updateData: any = {};

  // ✅ FIXED: !== undefined замість && (щоб пропускати порожні рядки)
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.priceCents !== undefined) updateData.priceCents = input.priceCents;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.durationDays !== undefined) updateData.durationDays = input.durationDays;
  if (input.features !== undefined) updateData.features = input.features;
  if (input.limits !== undefined) updateData.limits = input.limits;

  return prisma.product.update({
    where: { id: productId },
    data: updateData
    // ✅ updatedAt - automatic via @updatedAt
  });
}

/**
 * Delete product
 */
export async function deleteProduct(productId: string): Promise<void> {
  await prisma.product.delete({
    where: { id: productId }
  });
}

/**
 * Get user's products with enrollment status
 */
export async function getUserProducts(userId: string): Promise<ProductWithEnrollment[]> {
  const products = await prisma.product.findMany({
    include: {
      members: {
        where: { userId },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return products.map(product => {
    const member = product.members[0] || null;

    return {
      ...product,
      enrollment: member
        ? {
            id: member.id,
            enrolledAt: member.enrolledAt,
            expiresAt: member.expiresAt,
            trialEnd: member.trialEnd,
            purchased: member.purchased
          }
        : null
    };
  });
}

/**
 * Enroll user in product
 */
export async function enrollUser(input: EnrollUserInput): Promise<ProductMember> {
  const { userId, productId, purchased = false, trialDays = 0 } = input;

  // Check if already enrolled
  const existing = await prisma.productMember.findUnique({
    where: {
      userId_productId: { userId, productId }
    }
  });

  if (existing) {
    throw new Error('User already enrolled in this product');
  }

  // Get product
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    throw new Error('Product not found');
  }

  // ✅ SIMPLIFIED: Calculate expiration
  const now = new Date();
  let expiresAt: Date | null = null;
  let trialEnd: Date | null = null;

  if (trialDays > 0) {
    // Trial period
    trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    expiresAt = trialEnd;
  } else if (purchased && product.durationDays) {
    // Purchased with duration
    expiresAt = new Date(now.getTime() + product.durationDays * 24 * 60 * 60 * 1000);
  }
  // else: permanent access (expiresAt = null)

  // Create enrollment
  return prisma.productMember.create({
    data: {
      userId,
      productId,
      expiresAt,
      trialEnd,
      purchased
      // ✅ enrolledAt - automatic via @default(now())
    }
  });
}

/**
 * Check if user has access to product
 */
export async function checkProductAccess(
  userId: string,
  productId: string
): Promise<boolean> {
  const member = await prisma.productMember.findUnique({
    where: {
      userId_productId: { userId, productId }
    }
  });

  if (!member) return false;

  // Permanent access
  if (!member.expiresAt) return true;

  // Check expiration
  return member.expiresAt > new Date();
}

/**
 * Get user's active enrollments
 */
export async function getUserEnrollments(userId: string): Promise<ProductMember[]> {
  return prisma.productMember.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { enrolledAt: 'desc' }
  });
}