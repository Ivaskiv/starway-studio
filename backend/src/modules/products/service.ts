import { prisma } from '../../db/client.js';
import type {
  CreateProductInput,
  UpdateProductInput,
  Product,
  ProductWithEnrollment,
  EnrollUserInput,
} from './types.js';
import { Prisma } from '@prisma/client';

/** Graceful catch для відсутньої таблиці Product (P2021) */
function isMissingProductsTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; meta?: { table?: string } };
  if (e.code !== 'P2021') return false;
  const msg   = (e.message ?? '').toLowerCase();
  const table = (e.meta?.table ?? '').toLowerCase();
  return table.includes('product') || msg.includes('product');
}

// ── Queries ───────────────────────────────────────────────

export async function getAllProducts(ownerId?: string): Promise<Product[]> {
  try {
    return await prisma.product.findMany({
      where:   ownerId ? { ownerId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    if (isMissingProductsTableError(err)) return [];
    throw err;
  }
}

export async function getProductById(productId: string, ownerId?: string): Promise<Product | null> {
  return prisma.product.findFirst({
    where: { id: productId, ...(ownerId ? { ownerId } : {}) },
  });
}

export async function getProductByCode(code: string, ownerId?: string): Promise<Product | null> {
  return prisma.product.findFirst({
    where: { code, ...(ownerId ? { ownerId } : {}) },
  });
}

// ── Mutations ─────────────────────────────────────────────

export async function createProduct(input: CreateProductInput): Promise<Product> {
  return prisma.product.create({
    data: {
      code:         input.code,
      name:         input.name,
      description:  input.description ?? null,
      ownerId:      input.ownerId,
      priceCents:   input.priceCents ?? 0,
      currency:     input.currency ?? 'EUR',
      durationDays: input.durationDays ?? 30,
      features:     (input.features ?? {}) as Prisma.InputJsonValue,
      limits:       (input.limits ?? {}) as Prisma.InputJsonValue,
      systemPrompt: input.systemPrompt ?? null,
      mentorConfig: input.mentorConfig ? (input.mentorConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput,
  ownerId?: string,
): Promise<Product> {
  if (ownerId) {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== ownerId) {
      throw new Error('product_not_found');
    }
  }

  const updateData: Prisma.ProductUpdateInput = {};
  if (input.name !== undefined)         updateData.name         = input.name;
  if (input.description !== undefined)  updateData.description  = input.description;
  if (input.priceCents !== undefined)   updateData.priceCents   = input.priceCents;
  if (input.currency !== undefined)     updateData.currency     = input.currency;
  if (input.durationDays !== undefined) updateData.durationDays = input.durationDays;
  if (input.features !== undefined)     updateData.features     = input.features as Prisma.InputJsonValue;
  if (input.limits !== undefined)       updateData.limits       = input.limits as Prisma.InputJsonValue;

  return prisma.product.update({
    where: { id: productId },
    data: updateData,
  });
}

export async function deleteProduct(productId: string, ownerId?: string): Promise<void> {
  if (ownerId) {
    const existing = await prisma.product.findUnique({
      where:  { id: productId },
      select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== ownerId) throw new Error('product_not_found');
  }
  await prisma.product.delete({ where: { id: productId } });
}

// ── User products + enrollment ─────────────────────────────

export async function getUserProducts(userId: string): Promise<ProductWithEnrollment[]> {
  const products = await prisma.product.findMany({
    include: { enrollments: { where: { userId }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  });

  return products.map(p => {
    const e = p.enrollments[0] ?? null;
    return {
      ...p,
      enrollment: e
        ? {
            id:         e.id,
            enrolledAt: e.enrolledAt,
            trialEnd:   e.trialEnd,
            purchased:  e.purchased,
          }
        : null,
    };
  });
}

export async function enrollUser(input: EnrollUserInput) {
  const { userId, productId, purchased = false, trialDays = 0 } = input;

  const existing = await prisma.enrollment.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) throw new Error('already_enrolled');

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('product_not_found');

  const trialEnd: Date | null =
    trialDays > 0 ? new Date(Date.now() + trialDays * 86400000) : null;

  return prisma.enrollment.create({
    data: {
      userId,
      productId,
      purchased,
      trialEnd,
    },
  });
}

export async function checkProductAccess(userId: string, productId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!enrollment) return false;
  if (enrollment.purchased) return true;
  if (enrollment.trialEnd) return enrollment.trialEnd > new Date();
  return false;
}

export async function getUserEnrollments(userId: string) {
  return prisma.enrollment.findMany({
    where:   { userId },
    include: { product: true },
    orderBy: { enrolledAt: 'desc' },
  });
}
