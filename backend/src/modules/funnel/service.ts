// backend/src/modules/funnel/services.ts
// backend/src/modules/funnel/funnel.service.ts
import { prisma } from '@/db/client.js';
import type {
  FunnelInput,
  FunnelWithProducts,
  GenerateAIFunnelInput,
  AIFunnelResult,
} from './types.js';
import { generateAIFunnel } from './ai.js';

// ========== HELPERS ==========
function generateFunnelCode(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = 'funnel_';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function generateUniqueCode(): Promise<string> {
  let code = generateFunnelCode();
  let attempts = 0;

  while (attempts < 10) {
    const existing = await prisma.funnel.findUnique({ where: { code } });
    if (!existing) return code;
    code = generateFunnelCode();
    attempts++;
  }

  throw new Error('Failed to generate unique funnel code');
}

// ========== GET FUNNELS ==========
export async function getFunnels(ownerId: string): Promise<FunnelWithProducts[]> {
  const funnels = await prisma.funnel.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    include: {
      products: {
        include: { product: true },
      },
    },
  });

  return funnels.map(f => ({
    id: f.id,
    code: f.code,
    ownerId: f.ownerId,
    name: f.name,
    status: f.status,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    products: f.products.map(fp => fp.product),
  }));
}

// ========== GET FUNNEL BY ID ==========
export async function getFunnelById(id: string): Promise<FunnelWithProducts | null> {
  const funnel = await prisma.funnel.findUnique({
    where: { id },
    include: {
      products: {
        include: { product: true },
      },
    },
  });

  if (!funnel) return null;

  return {
    id: funnel.id,
    code: funnel.code,
    ownerId: funnel.ownerId,
    name: funnel.name,
    status: funnel.status,
    createdAt: funnel.createdAt,
    updatedAt: funnel.updatedAt,
    products: funnel.products.map(fp => fp.product),
  };
}

// ========== CREATE FUNNEL ==========
export async function createFunnel(
  ownerId: string,
  input: FunnelInput
): Promise<FunnelWithProducts> {
  // Перевірка унікальності імені
  const existing = await prisma.funnel.findUnique({
    where: { name: input.name },
  });

  if (existing) {
    throw new Error('Funnel name already exists');
  }

  // Генерація коду
  const code = await generateUniqueCode();

  // Створення funnel
  const funnel = await prisma.funnel.create({
    data: {
      ownerId,
      name: input.name,
      code,
      status: input.status || 'draft',
    },
  });

  // Додавання продуктів
  if (input.productIds.length > 0) {
    await Promise.all(
      input.productIds.map(productId =>
        prisma.funnelProduct.create({
          data: {
            funnelId: funnel.id,
            productId,
          },
        })
      )
    );
  }

  return getFunnelById(funnel.id) as Promise<FunnelWithProducts>;
}

// ========== UPDATE FUNNEL ==========
export async function updateFunnel(id: string, input: Partial<FunnelInput>) {
  return prisma.funnel.update({
    where: { id },
    data: {
      name: input.name,
      status: input.status,
    },
  });
}

// fix code_x: attach product to funnel editor flow.
export async function attachProductToFunnel(funnelId: string, productId: string) {
  const existing = await prisma.funnelProduct.findUnique({
    where: { funnelId_productId: { funnelId, productId } },
    select: { funnelId: true },
  });

  if (existing) return existing;

  return prisma.funnelProduct.create({
    data: {
      funnelId,
      productId,
    },
  });
}

// fix code_x: detach product from funnel editor flow.
export async function detachProductFromFunnel(funnelId: string, productId: string) {
  return prisma.funnelProduct.delete({
    where: { funnelId_productId: { funnelId, productId } },
  });
}

export async function getAttachableProductsForFunnel(funnelId: string) {
  const funnel = await prisma.funnel.findUnique({
    where: { id: funnelId },
    select: { ownerId: true },
  });
  if (!funnel) return null;

  const attached = await prisma.funnelProduct.findMany({
    where: { funnelId },
    select: { productId: true },
  });
  const attachedIds = attached.map((item) => item.productId);

  return prisma.product.findMany({
    where: {
      ownerId: funnel.ownerId,
      ...(attachedIds.length ? { id: { notIn: attachedIds } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ========== DELETE FUNNEL ==========
export async function deleteFunnel(id: string): Promise<void> {
  await prisma.funnel.delete({
    where: { id },
  });
}

// ========== AI GENERATION ==========
export async function generateAndSaveFunnel(
  ownerId: string,
  input: GenerateAIFunnelInput
): Promise<{ funnel: FunnelWithProducts; aiResult: AIFunnelResult }> {
  // 1. Генерація AI funnel
  const aiResult = await generateAIFunnel(input);

  // 2. Створення products з AI рекомендацій
  const createdProducts = await Promise.all(
    aiResult.suggestedProducts.map(p =>
      prisma.product.create({
        data: {
          code: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: p.name,
          description: p.description,
          ownerId,
          priceCents: p.priceCents,
          features: {},
          limits: {},
        },
      })
    )
  );

  // 3. Створення funnel
  const funnelName = `AI: ${aiResult.concept.slice(0, 50)}`;
  const code = await generateUniqueCode();

  const funnel = await prisma.funnel.create({
    data: {
      ownerId,
      name: funnelName,
      code,
      status: 'draft',
    },
  });

  // 4. Зв'язування products з funnel
  await Promise.all(
    createdProducts.map(product =>
      prisma.funnelProduct.create({
        data: {
          funnelId: funnel.id,
          productId: product.id,
        },
      })
    )
  );

  const fullFunnel = await getFunnelById(funnel.id);

  return {
    funnel: fullFunnel!,
    aiResult,
  };
}
