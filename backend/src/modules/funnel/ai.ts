// backend/src/modules/funnel/ai.ts
import { openai } from '../../lib/openai.js';
import { prisma } from '../../db/client.js';
import type { AIFunnelResult, GenerateAIFunnelInput } from './types.js';

// ── Існуючий код (не змінено) ────────────────────────────────────────────────

export async function generateAIFunnel(input: GenerateAIFunnelInput): Promise<AIFunnelResult> {
  const prompt = `Ти експерт з маркетингових воронок (sales funnels).

ЗАПИТ КОРИСТУВАЧА:
${input.userPrompt}

${input.businessType ? `Тип бізнесу: ${input.businessType}` : ''}
${input.targetAudience ? `Цільова аудиторія: ${input.targetAudience}` : ''}

ЗАВДАННЯ:
Створи маркетингову воронку з 3-5 етапів.

Для кожного етапу надай:
- name: назва етапу
- action: що робить користувач
- headline: заголовок для лендінгу
- cta: текст кнопки
- emailSequence: масив з 2-3 email листів

Також запропонуй 2-3 продукти для цієї воронки (name, description, priceCents).

ФОРМАТ ВІДПОВІДІ (JSON):
{
  "concept": "Короткий опис концепції воронки",
  "stages": [
    {
      "name": "Практикум (free)",
      "action": "Підписка на email",
      "headline": "Отримайте безкоштовний гайд",
      "cta": "Завантажити зараз",
      "emailSequence": ["Email 1...", "Email 2..."]
    }
  ],
  "aiRecommendations": ["Порада 1", "Порада 2"],
  "suggestedProducts": [
    {
      "name": "Базовий курс",
      "description": "Опис",
      "priceCents": 1900
    }
  ]
}

Відповідай ТІЛЬКИ JSON, без markdown.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      concept: parsed.concept || 'Згенерована воронка',
      stages: parsed.stages || [],
      aiRecommendations: parsed.aiRecommendations || [],
      suggestedProducts: parsed.suggestedProducts || [],
    };
  } catch (error) {
    console.error('❌ AI funnel parse error:', error);

    return {
      concept: input.userPrompt,
      stages: [
        {
          name: 'Практикум (free)',
          action: 'Підписка',
          headline: 'Отримайте безкоштовний ресурс',
          cta: 'Завантажити',
          emailSequence: ['Привітальний email', 'Корисний контент'],
        },
        {
          name: 'Продаж',
          action: 'Покупка',
          headline: 'Готові почати?',
          cta: 'Купити зараз',
          emailSequence: ['Презентація продукту', 'Останній шанс'],
        },
      ],
      aiRecommendations: ['Тестуйте різні заголовки', 'Додайте соціальні докази'],
      suggestedProducts: [
        {
          name: 'Базовий продукт',
          description: 'Стартовий пакет',
          priceCents: 1900,
        },
      ],
    };
  }
}

// ── analyzeFunnel: bottleneck detection (додано) ──────────────────────────────

export type FunnelHealth = 'good' | 'needs_attention' | 'critical';

export type BottleneckStage =
  | 'awareness'      // мало трафіку
  | 'registration'   // реєстрацій мало відносно переглядів
  | 'trial_to_paid'  // зареєструвались але не платять
  | 'engagement'     // платять але не взаємодіють
  | 'retention';     // відтік після першого місяця

export interface FunnelBottleneckResult {
  health:              FunnelHealth;
  bottleneck:          BottleneckStage;
  currentConversion:   number;           // %
  benchmark:           number;           // % — індустрійний стандарт
  dropoffRate:         number;           // % втрати на проблемному кроці
  recommendations:     string[];
  urgentAction:        string;           // одна дія яку треба зробити сьогодні
  readyTexts: {
    day3Email?:  string;
    day7Push?:   string;
    retarget?:   string;
  };
}

const BENCHMARKS: Record<BottleneckStage, number> = {
  awareness:      100,  // n/a — залежить від бюджету
  registration:   30,   // 30% відвідувачів → реєстрація
  trial_to_paid:  15,   // 15% trial → paid
  engagement:     60,   // 60% платних активні
  retention:      80,   // 80% подовжують підписку
};

export async function analyzeFunnel(funnelId: string): Promise<FunnelBottleneckResult> {
  const weekAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Витягуємо метрики з БД
  const funnel = await prisma.funnel.findUnique({
    where:  { id: funnelId },
    select: { id: true, name: true },
  });

  const enrollmentWhere = {
    product: {
      funnelLinks: {
        some: { funnelId },
      },
    },
  }

  const [
    totalEnrollments,
    weekEnrollments,
    weekPayments,
    monthPayments,
    monthEnrollments,
  ] = await Promise.all([
    prisma.enrollment.count({ where: enrollmentWhere }),
    prisma.enrollment.count({ where: { ...enrollmentWhere, enrolledAt: { gte: weekAgo } } }),
    prisma.purchaseHistory.count({
      where: { funnelId, createdAt: { gte: weekAgo } },
    }),
    prisma.purchaseHistory.count({
      where: { funnelId, createdAt: { gte: monthAgo } },
    }),
    prisma.enrollment.count({ where: { ...enrollmentWhere, enrolledAt: { gte: monthAgo } } }),
  ]);

  // Визначаємо вузьке місце
  const trialToPaid = weekEnrollments > 0
    ? Math.round((weekPayments / weekEnrollments) * 100)
    : 0;

  const monthConversion = monthEnrollments > 0
    ? Math.round((monthPayments / monthEnrollments) * 100)
    : 0;

  let bottleneck: BottleneckStage;
  let currentConversion: number;
  let dropoffRate: number;

  if (weekEnrollments < 3) {
    // Майже нема реєстрацій → проблема з awareness/трафіком
    bottleneck = 'awareness';
    currentConversion = weekEnrollments;
    dropoffRate = 100;
  } else if (trialToPaid < BENCHMARKS.trial_to_paid) {
    // Реєструються але не платять
    bottleneck = 'trial_to_paid';
    currentConversion = trialToPaid;
    dropoffRate = BENCHMARKS.trial_to_paid - trialToPaid;
  } else if (monthConversion < BENCHMARKS.retention) {
    // Платять але відтік
    bottleneck = 'retention';
    currentConversion = monthConversion;
    dropoffRate = BENCHMARKS.retention - monthConversion;
  } else {
    // Все добре
    bottleneck = 'engagement';
    currentConversion = trialToPaid;
    dropoffRate = 0;
  }

  const benchmark = BENCHMARKS[bottleneck];

  const health: FunnelHealth =
    dropoffRate === 0 ? 'good' :
    dropoffRate < 10  ? 'needs_attention' : 'critical';

  // GPT генерує рекомендації та готові тексти
  const aiPrompt = [
    `Воронка: ${funnel?.name ?? funnelId}`,
    `Вузьке місце: ${bottleneck}`,
    `Конверсія: ${currentConversion}% (бенчмарк: ${benchmark}%)`,
    `Просідання: ${dropoffRate}%`,
    `Реєстрацій за тиждень: ${weekEnrollments}`,
    `Оплат за тиждень: ${weekPayments}`,
    '',
    'JSON (без markdown):',
    '{',
    '  "recommendations": ["3 конкретні рекомендації українською"],',
    '  "urgentAction": "одна дія яку треба зробити сьогодні",',
    '  "readyTexts": {',
    '    "day3Email": "email для тих хто зареєструвався 3 дні тому і не купив",',
    '    "day7Push": "push повідомлення на 7-й день",',
    '    "retarget": "текст для ретаргетингу"',
    '  }',
    '}',
  ].join('\n');

  const aiResponse = await openai.chat.completions.create({
    model:           'gpt-4o-mini',
    temperature:     0.3,
    max_tokens:      600,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Маркетинговий аналітик. JSON тільки, українською.' },
      { role: 'user',   content: aiPrompt },
    ],
  });

  let aiData: {
    recommendations?: string[];
    urgentAction?:    string;
    readyTexts?:      FunnelBottleneckResult['readyTexts'];
  } = {};

  try {
    aiData = JSON.parse(aiResponse.choices[0]?.message?.content ?? '{}');
  } catch {
    aiData = {};
  }

  return {
    health,
    bottleneck,
    currentConversion,
    benchmark,
    dropoffRate,
    recommendations: aiData.recommendations ?? [
      'Додайте соціальні докази на лендінг',
      'Надішліть email-нагадування на 3-й день',
      'Запропонуйте знижку для trial-користувачів',
    ],
    urgentAction: aiData.urgentAction ?? 'Надішліть email всім trial-користувачам старше 3 днів',
    readyTexts:   aiData.readyTexts   ?? {},
  };
}
