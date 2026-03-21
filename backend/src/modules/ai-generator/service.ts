/**
 * AI Generator Service – STRICT / NO as any
 * ✅ Рядки 1-220: оригінал без змін
 * ✅ Рядки 221+: re-export generateHeroVariants / generateAdTexts
 */

import { prisma } from '../../db/client.js';
import { openai } from '../../lib/openai.js';
import {
  ProductBlueprint,
  SaveBlueprintInput,
  SaveBlueprintResult,
  AIGeneratorWorkflowState,
  BlueprintStepInput,
  FunnelBlueprint,
  GenerateStepInput,
} from './types.js';
import { AI_PRODUCER_WORKFLOW_KEY } from './types.js';
import { FunnelType, Prisma, ProductKind } from '@prisma/client';

/* ======================================================
   JSON SAFE HELPERS (Prisma friendly)
====================================================== */

function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

/* ======================================================
   HELPERS
====================================================== */

function compactText(text?: string | null): string {
  return String(text ?? '').trim();
}

function parseInitialProductNames(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,;]+/g)
    .map(compactText)
    .filter(Boolean)
    .filter(
      (name, idx, arr) =>
        arr.findIndex(x => x.toLowerCase() === name.toLowerCase()) === idx
    );
}

function toCode(seed: string): string {
  return seed
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 36);
}

async function uniqueProductCode(seed: string): Promise<string> {
  let code = toCode(seed) || `product-${Math.random().toString(36).slice(2, 8)}`;

  for (let i = 0; i < 8; i++) {
    const exists = await prisma.product.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!exists) return code;

    code = `${toCode(seed).slice(0, 12)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
  }

  return `product-${Date.now().toString(36)}`;
}

async function uniqueFunnelCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = `funnel_${Math.random().toString(36).slice(2, 8)}`;
    const exists = await prisma.funnel.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!exists) return code;
  }

  return `funnel_${Date.now().toString(36)}`;
}

function mapProductKind(name: string): ProductKind {
  const lower = name.toLowerCase();
  if (lower.includes('wheel')) return ProductKind.WHEEL;
  if (lower.includes('mentor')) return ProductKind.AI_MENTOR;
  if (lower.includes('video')) return ProductKind.VIDEO_REMINDER;
  return ProductKind.UPSELL_5_POINTS;
}

function mapFunnelType(type: string): FunnelType {
  const upper = type.toUpperCase();
  if (upper === 'FAST_CASH') return FunnelType.FAST_CASH;
  if (upper === 'DIAGNOSTIC') return FunnelType.DIAGNOSTIC;
  return FunnelType.EVERGREEN;
}

/* ======================================================
   STEP GENERATION
====================================================== */

export async function generateStepVariant(
  input: GenerateStepInput
): Promise<string> {
  const prompt = buildStepPrompt(
    input.stepNumber,
    input.userInput,
    input.context
  );

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert funnel and product generator. Generate clear, actionable content.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content ?? '';
}

function buildStepPrompt(
  stepNumber: number,
  userInput: string,
  context?: Record<string, string>
): string {
  const prompts: Record<number, string> = {
    1: `Based on this business description: "${userInput}", generate a compelling hook.`,
    2: `Create a diagnostic question based on: "${userInput}".`,
    3: `Generate a quick win offer for: "${userInput}".`,
    4: `Create a core offer description for: "${userInput}".`,
    5: `Design an upsell offer that complements: "${userInput}".`,
    6: `Build financial model for: "${userInput}".`,
    7: `List automation steps for: "${userInput}".`,
    8: `Define target audience for: "${userInput}".`,
    9: `Create funnel structure for: "${userInput}".`,
    10: `Generate product descriptions for: "${userInput}".`,
    11: `Finalize blueprint for: "${userInput}".`,
  };

  return prompts[stepNumber] ?? `Generate step ${stepNumber}: ${userInput}`;
}

/* ======================================================
   BLUEPRINT BUILD
====================================================== */

export async function buildBlueprintFromSteps(
  stepsData: BlueprintStepInput[]
): Promise<FunnelBlueprint> {
  const sorted = [...stepsData].sort((a, b) => a.number - b.number);

  const financial = JSON.parse(
    sorted.find(s => s.number === 6)?.selectedContent ?? '{}'
  );

  const products = JSON.parse(
    sorted.find(s => s.number === 10)?.selectedContent ?? '[]'
  );

  return {
    name: sorted.find(s => s.number === 11)?.userInput ?? 'Generated Funnel',
    type: 'DIAGNOSTIC',
    targetAudience: sorted.find(s => s.number === 8)?.selectedContent ?? '',
    painPoint: sorted.find(s => s.number === 1)?.selectedContent ?? '',
    quickWin: sorted.find(s => s.number === 3)?.selectedContent ?? '',
    steps: {
      hook: sorted.find(s => s.number === 1)?.selectedContent ?? '',
      diagnostic: sorted.find(s => s.number === 2)?.selectedContent ?? '',
      quickWin: sorted.find(s => s.number === 3)?.selectedContent ?? '',
      coreOffer: sorted.find(s => s.number === 4)?.selectedContent ?? '',
      upsell: sorted.find(s => s.number === 5)?.selectedContent ?? '',
    },
    coreOffer: {
      name: sorted.find(s => s.number === 4)?.selectedContent ?? '',
      price: financial.averageCheck ?? 0,
      format: 'digital',
    },
    upsell: sorted.find(s => s.number === 5)
      ? {
          name: sorted.find(s => s.number === 5)?.selectedContent ?? '',
          price: (financial.averageCheck ?? 0) * 2,
        }
      : null,
    financialModel: {
      averageCheck: financial.averageCheck ?? 0,
      requiredSales: financial.requiredSales ?? 0,
      conversion_rate: financial.conversion_rate ?? 0.02,
      targetRevenue: financial.targetRevenue ?? 0,
    },
    automation: JSON.parse(
      sorted.find(s => s.number === 7)?.selectedContent ?? '[]'
    ),
    products,
  };
}

/* ======================================================
   SAVE BLUEPRINT
====================================================== */

export async function saveBlueprint(
  requester: { id: string; role?: string; email?: string },
  input: SaveBlueprintInput
): Promise<SaveBlueprintResult> {
  const ownerId = requester.id;

  const initialProducts = parseInitialProductNames(
    input.onboarding?.initialProducts
  );

  const sourceProducts: ProductBlueprint[] = [];

  if (initialProducts.length > 0) {
    for (const name of initialProducts) {
      sourceProducts.push({
        kind: mapProductKind(name),
        name,
        description: '',
        price: 0,
        currency: 'EUR',
        config: {},
      });
    }
  } else if (Array.isArray(input.blueprint.products)) {
    for (const p of input.blueprint.products) {
      sourceProducts.push({
        kind: mapProductKind(p.name),
        name: p.name,
        description: p.purpose ?? '',
        price: p.price ?? 0,
        currency: 'EUR',
        config: {
          type: p.type,
          format: p.format,
          integrations: p.integrations,
          goals: p.goals,
        },
      });
    }
  }

  const productIds: string[] = [];

  for (const p of sourceProducts) {
    const product = await prisma.product.create({
      data: {
        code: await uniqueProductCode(p.name),
        ownerId,
        name: compactText(p.name),
        description: compactText(p.description),
        priceCents: Math.round((p.price ?? 0) * 100),
        currency: p.currency ?? 'EUR',
        kind: p.kind,
        features: toJson(p.config),
        limits: toJson({ mode: 'ai_producer' }),
      },
    });

    productIds.push(product.id);
  }

  const funnel = await prisma.funnel.create({
    data: {
      ownerId,
      code: await uniqueFunnelCode(),
      name: input.blueprint.name,
      slug: toCode(input.blueprint.name),
      type: mapFunnelType(input.blueprint.type),
      blueprint: toJson(input.blueprint),
      status: 'draft',
      definition: {},
    },
  });

  await Promise.all(
    productIds.map(productId =>
      prisma.funnelProduct.create({
        data: { funnelId: funnel.id, productId },
      })
    )
  );

  return { funnelId: funnel.id, productIds };
}

/* ======================================================
   WORKFLOW STATE
====================================================== */

export async function getWorkflowState(
  userId: string
): Promise<AIGeneratorWorkflowState | null> {
  const record = await prisma.mentorConfig.findUnique({
    where: { userId },
    select: { config: true },
  });

  if (!record?.config || typeof record.config !== 'object') return null;

  return (
    (record.config as Record<string, unknown>)[
      AI_PRODUCER_WORKFLOW_KEY
    ] as AIGeneratorWorkflowState
  );
}

export async function saveWorkflowState(
  userId: string,
  workflow: AIGeneratorWorkflowState
): Promise<{ success: true; updatedAt: string }> {
  const updatedAt = new Date().toISOString();

  const merged = toJson({
    [AI_PRODUCER_WORKFLOW_KEY]: {
      ...workflow,
      updatedAt,
      version: 1,
    },
  });

  await prisma.mentorConfig.upsert({
    where: { userId },
    update: { config: merged },
    create: { userId, config: merged },
  });

  return { success: true, updatedAt };
}

/* ======================================================
   RE-EXPORTS з producer.ts (додано)
   controller.ts імпортує звідси — один рівень доступу
====================================================== */
export {
  generateHeroVariants,
  generateAdTexts,
  type HeroGenerateInput,
  type AdTextsInput,
  type HeroVariant,
  type AdTexts,
} from './products-generator/producer.js';