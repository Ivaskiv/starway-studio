// backend/src/modules/ai-generator/service.ts
// fix code_x: end-to-end AI Producer pipeline (phase generation -> blueprint -> save funnel/products + owner onboarding metadata).
import { prisma } from '@/db/client.js';
import { openai } from '@/lib/openai.js';
import { encryptSecret } from '@/lib/secrets.js';
import { isSuperAdminEmail } from '@/modules/auth/superadmin.js';
import { AI_PRODUCER_SYSTEM_PROMPT } from '../../../config/prompts.js';
import type {
  AIGeneratorWorkflowState,
  BlueprintStepInput,
  FunnelBlueprint,
  GenerateStepInput,
  OwnerOnboardingPayload,
  SaveBlueprintInput,
} from './types.js';

const PHASES: Record<number, string> = {
  1: 'Крок 1 — Ніша і трансформація',
  2: 'Крок 2 — Формат продукту і чек',
  3: 'Крок 3 — Портрет ЦА і тригери',
  4: 'Крок 4 — Модель монетизації',
  5: 'Крок 5 — Продукт №1: Колесо балансу',
  6: 'Крок 6 — Продукт №2: AI-ментор',
  7: 'Крок 7 — Ранок/вечір і daily cycle',
  8: 'Крок 8 — Звіти і PDF',
  9: 'Крок 9 — Telegram bot-flow',
  10: 'Крок 10 — Miniapp і гейміфікація',
  11: 'Крок 11 — Фінальна AI-воронка',
};

function parseJsonSafe<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

function compactText(text?: string | null): string {
  return String(text || '').trim();
}

const AI_PRODUCER_WORKFLOW_KEY = 'aiProducerWorkflow';

function parseInitialProductNames(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,;]+/g)
    .map((item) => compactText(item))
    .filter(Boolean)
    .filter((name, idx, arr) => arr.findIndex((x) => x.toLowerCase() === name.toLowerCase()) === idx);
}

function buildProductFromName(
  name: string,
  blueprint: FunnelBlueprint,
): {
  name: string;
  price: number;
  type: 'one_time' | 'subscription';
  format: string;
  integrations: string[];
  includesMentorship: boolean;
} {
  const normalized = name.toLowerCase();

  if (normalized.includes('ai') && normalized.includes('ментор')) {
    return {
      name,
      price: Math.max(0, Number(blueprint.coreOffer?.price || 33)),
      type: 'subscription',
      format: 'mentor',
      integrations: ['web', 'telegram', 'miniapp'],
      includesMentorship: true,
    };
  }

  if (normalized.includes('5 точ') || normalized.includes('5 point')) {
    return {
      name,
      price: Math.max(0, Number(blueprint.upsell?.price || 59)),
      type: 'one_time',
      format: 'practicum',
      integrations: ['web', 'telegram', 'miniapp'],
      includesMentorship: false,
    };
  }

  return {
    name,
    price: Math.max(0, Number(blueprint.coreOffer?.price || 33)),
    type: 'subscription',
    format: blueprint.coreOffer?.format || 'program',
    integrations: ['web', 'telegram', 'miniapp'],
    includesMentorship: true,
  };
}

function toCode(seed: string): string {
  return seed
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 36);
}

async function uniqueProductCode(seed: string): Promise<string> {
  let code = toCode(seed) || `product-${Math.random().toString(36).slice(2, 8)}`;
  for (let i = 0; i < 8; i++) {
    const exists = await prisma.product.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
    code = `${toCode(seed) || 'product'}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `product-${Date.now().toString(36)}`;
}

async function uniqueFunnelCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = `funnel_${Math.random().toString(36).slice(2, 8)}`;
    const exists = await prisma.funnel.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  return `funnel_${Date.now().toString(36)}`;
}

function fallbackBlueprint(stepsData: BlueprintStepInput[]): FunnelBlueprint {
  const byStep = Object.fromEntries(stepsData.map((s) => [s.number, compactText(s.selectedContent || s.userInput)]));
  const coreName = byStep[6] || byStep[5] || 'AI Ментор';
  const audience = byStep[3] || 'Аудиторія не вказана';

  return {
    name: `AI Producer: ${coreName.slice(0, 42)}`,
    type: 'diagnostic',
    targetAudience: audience,
    steps: {
      hook: byStep[1] || 'Гачок через чітку діагностику точки А/Б',
      diagnostic: byStep[6] || 'AI-діагностика через колесо балансу',
      quickWin: 'Перший результат за 24-72 години',
      coreOffer: byStep[2] || 'Основний оффер з чітким CTA',
      upsell: byStep[4] || 'Upsell після малого результату',
    },
    coreOffer: {
      name: coreName.slice(0, 80),
      price: 33,
      format: 'subscription',
    },
    upsell: {
      name: 'Наставництво 1:1',
      price: 149,
    },
    financialModel: {
      averageCheck: 33,
      requiredSales: 100,
      conversion_rate: 5,
      targetRevenue: 3300,
    },
    automation: [
      'Telegram reminders (ранок/вечір)',
      'PDF weekly + monthly report',
      'Trigger-based upsell після 30 днів streak',
    ],
    products: [
      {
        name: 'AI-діагностика Колесо балансу',
        price: 0,
        type: 'one_time',
        format: 'diagnostic',
        integrations: ['web', 'telegram'],
        includesMentorship: false,
      },
      {
        name: coreName.slice(0, 80),
        price: 33,
        type: 'subscription',
        format: 'program',
        integrations: ['web', 'telegram', 'miniapp'],
        includesMentorship: true,
      },
    ],
  };
}

export async function generateStepVariant(input: GenerateStepInput): Promise<string> {
  const phaseName = PHASES[input.stepNumber] || `Фаза ${input.stepNumber}`;
  const contextText = Object.entries(input.context || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const prompt = `${AI_PRODUCER_SYSTEM_PROMPT}

Поточна фаза: ${phaseName}
Контекст попередніх фаз:
${contextText || 'Немає'}

Вхід користувача:
${input.userInput}

Поверни 1 фінальний структурований результат для цієї фази. Без markdown.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.45,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
    });

    return compactText(completion.choices[0]?.message?.content) || 'AI не повернув контент. Спробуйте ще раз.';
  } catch {
    const base = compactText(input.userInput) || 'Дані фази збережені.';
    const community = compactText(input.context?.community_builder_prompt);

    if (input.stepNumber === 1) {
      return [
        `${phaseName} — структурований результат`,
        `Точка А: ${base}`,
        `Точка Б: Вимірюваний стан через 30-60 днів (уточнити KPI: дохід/стабільність/конверсія).`,
        `Трансформація: від хаотичних рішень до системного щоденного ритму дій.`,
        `Унікальність: AI-супровід + сценарій "Стан → Вибір → Дія" + Telegram-нагадування.`,
        `Підтвердження експертності: додати 2-3 кейси, цифри до/після, тривалість результату.`,
        community ? `Контекст Community Builder GPT: ${community}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    return [
      `${phaseName} — структурований fallback`,
      `Вхідні дані: ${base}`,
      `Що зафіксовано: базовий результат збережено, потребує деталізації перед фінальним blueprint.`,
      community ? `Контекст Community Builder GPT: ${community}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}

export async function buildBlueprintFromSteps(stepsData: BlueprintStepInput[]): Promise<FunnelBlueprint> {
  const fallback = fallbackBlueprint(stepsData);

  const phasesText = stepsData
    .map((s) => `Фаза ${s.number}: ${compactText(s.selectedContent || s.userInput)}`)
    .join('\n\n');

  const prompt = `${AI_PRODUCER_SYSTEM_PROMPT}

На базі підсумків фаз побудуй фінальний FunnelBlueprint.
Поверни тільки валідний JSON у форматі:
{
  "name": string,
  "type": "fast_cash" | "diagnostic" | "evergreen",
  "targetAudience": string,
  "steps": { "hook": string, "diagnostic": string, "quickWin": string, "coreOffer": string, "upsell": string },
  "coreOffer": { "name": string, "price": number, "format": string },
  "upsell": { "name": string, "price": number } | null,
  "financialModel": { "averageCheck": number, "requiredSales": number, "conversion_rate": number, "targetRevenue": number },
  "automation": string[],
  "products": [{ "name": string, "price": number, "type": "one_time" | "subscription", "format": string, "integrations": string[], "includesMentorship": boolean }]
}

Підсумки фаз:
${phasesText}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2200,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = parseJsonSafe<FunnelBlueprint>(content, fallback);

    return {
      ...fallback,
      ...parsed,
      name: compactText(parsed.name) || fallback.name,
      targetAudience: compactText(parsed.targetAudience) || fallback.targetAudience,
      steps: { ...fallback.steps, ...(parsed.steps || {}) },
      coreOffer: {
        ...fallback.coreOffer,
        ...(parsed.coreOffer || {}),
        name: compactText(parsed.coreOffer?.name) || fallback.coreOffer.name,
      },
      financialModel: { ...fallback.financialModel, ...(parsed.financialModel || {}) },
      automation: Array.isArray(parsed.automation) && parsed.automation.length ? parsed.automation : fallback.automation,
      products: Array.isArray(parsed.products) && parsed.products.length ? parsed.products : fallback.products,
    };
  } catch {
    return fallback;
  }
}

async function resolveOwnerId(
  requester: { id: string; role?: string; email?: string },
  onboarding?: OwnerOnboardingPayload,
): Promise<string> {
  const ownerEmail = compactText(onboarding?.ownerEmail).toLowerCase();
  if (!ownerEmail) return requester.id;

  const canOverrideOwner = requester.role === 'ADMIN' || isSuperAdminEmail(requester.email);
  if (!canOverrideOwner) return requester.id;

  const owner = await prisma.user.findFirst({ where: { email: ownerEmail }, select: { id: true } });
  return owner?.id || requester.id;
}

async function maybeAttachTelegram(ownerId: string, onboarding?: OwnerOnboardingPayload) {
  const raw = compactText(onboarding?.telegramContact).replace(/^@/, '');
  if (!raw) return;

  const isChatId = /^-?\d+$/.test(raw);

  await prisma.user.update({
    where: { id: ownerId },
    data: {
      telegramUserName: isChatId ? undefined : raw,
      telegramChatId: isChatId ? raw : undefined,
    },
  });
}

export async function saveBlueprint(
  requester: { id: string; role?: string; email?: string },
  input: SaveBlueprintInput,
): Promise<{ funnelId: string }> {
  const ownerId = await resolveOwnerId(requester, input.onboarding);
  const initialProducts = parseInitialProductNames(input.onboarding?.initialProducts);

  // fix code_x: if onboarding includes explicit initial products, treat it as authoritative product set.
  const sourceProducts = initialProducts.length
    ? initialProducts.map((name) => buildProductFromName(name, input.blueprint))
    : input.blueprint.products?.length
      ? input.blueprint.products
      : [
          {
            name: input.onboarding?.productName || input.blueprint.coreOffer.name,
            price: input.blueprint.coreOffer.price,
            type: 'subscription' as const,
            format: input.blueprint.coreOffer.format,
            integrations: ['web', 'telegram', 'miniapp'],
            includesMentorship: true,
          },
        ];

  const createdProducts = [] as Array<{ id: string }>;

  for (const p of sourceProducts) {
    const productName = compactText(p.name) || 'AI Product';
    const code = await uniqueProductCode(input.onboarding?.productCode || productName);

    const created = await prisma.product.create({
      data: {
        code,
        ownerId,
        name: productName,
        description: compactText(input.onboarding?.productDescription),
        priceCents: Math.max(0, Math.round((p.price || 0) * 100)),
        currency: 'EUR',
        features: {
          aiProducer: {
            blueprintName: input.blueprint.name,
            funnelGoal: compactText(input.onboarding?.funnelGoal),
            coreTask: compactText(input.onboarding?.coreTask),
          },
          telegramProfile: {
            botName: compactText(input.onboarding?.telegramBotName),
            botTokenHint: compactText(input.onboarding?.telegramBotToken)
              ? `${compactText(input.onboarding?.telegramBotToken).slice(0, 8)}***`
              : '',
            // fix code_x: store sensitive bot token only in encrypted form.
            botTokenEncrypted: compactText(input.onboarding?.telegramBotToken)
              ? encryptSecret(compactText(input.onboarding?.telegramBotToken))
              : '',
            contact: compactText(input.onboarding?.telegramContact),
          },
        },
        limits: {
          mode: 'ai_producer',
        },
      },
      select: { id: true },
    });

    createdProducts.push(created);
  }

  const funnelCode = await uniqueFunnelCode();
  const baseFunnelName = compactText(input.onboarding?.funnelName) || compactText(input.blueprint.name) || 'AI Funnel';
  const uniqueFunnelName = `${baseFunnelName.slice(0, 96)}-${Math.random().toString(36).slice(2, 6)}`;

  const funnel = await prisma.funnel.create({
    data: {
      ownerId,
      code: funnelCode,
      name: uniqueFunnelName,
      status: 'draft',
    },
    select: { id: true },
  });

  await Promise.all(
    createdProducts.map((p) =>
      prisma.funnelProduct.create({
        data: {
          funnelId: funnel.id,
          productId: p.id,
        },
      }),
    ),
  );

  await maybeAttachTelegram(ownerId, input.onboarding);

  return { funnelId: funnel.id };
}

export async function getWorkflowState(userId: string): Promise<AIGeneratorWorkflowState | null> {
  const existing = await prisma.mentorConfig.findUnique({
    where: { userId },
    select: { config: true },
  });

  const rawConfig = ((existing?.config as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const workflow = rawConfig[AI_PRODUCER_WORKFLOW_KEY] as AIGeneratorWorkflowState | undefined;

  if (!workflow || typeof workflow !== 'object') return null;
  return workflow;
}

export async function saveWorkflowState(
  userId: string,
  workflow: AIGeneratorWorkflowState,
): Promise<{ success: true; updatedAt: string }> {
  const existing = await prisma.mentorConfig.findUnique({
    where: { userId },
    select: { config: true },
  });

  const prevConfig = ((existing?.config as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const updatedAt = new Date().toISOString();
  const mergedConfig = {
    ...prevConfig,
    [AI_PRODUCER_WORKFLOW_KEY]: {
      ...workflow,
      updatedAt,
      version: 1,
    },
  };

  await prisma.mentorConfig.upsert({
    where: { userId },
    update: { config: mergedConfig },
    create: { userId, config: mergedConfig },
  });

  return { success: true, updatedAt };
}
