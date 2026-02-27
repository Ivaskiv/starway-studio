// backend/src/modules/ai-mentor/services/setup.ts
/**
 * Setup Service
 * Manages mentor initialization and configuration
 */

import { prisma } from '@/db/client.js';
import type { Prisma } from '@/db/generated/prisma/client.js';
import { openai } from '@/lib/openai.js';
import { ensureMentor } from './context.js';
import { generateWheelAnalysis } from '@/modules/wheel/ai.js';
import { WheelScore } from '@/modules/wheel/types.js';

// ==========================================
// TYPES
// ==========================================

export interface QuestionsConfig {
  frequency: 'morning' | 'evening' | 'both' | 'daily';
  morningQuestions?: string[];
  eveningQuestions?: string[];
  dailyQuestions?: string[];
  customQuestions?: string[];
  telegramContact?: string;
}

export interface GeneratedQuestionsVariant {
  id: string;
  title: string;
  morningQuestions: string[];
  eveningQuestions: string[];
}

export interface SetupProgress {
  userId: string;
  wheelCompleted: boolean;
  questionsConfigured: boolean;
  setupCompletedAt?: Date;
  currentStep: 'wheel' | 'questions' | 'complete';
}

// ==========================================
// SETUP PROGRESS
// ==========================================

/**
 * Get setup progress for user
 */
export async function getSetupProgress(userId: string): Promise<SetupProgress> {
  const mentor = await prisma.mentor.findUnique({
    where: { userId },
    select: {
      meta: true,
      rules: true,
    },
  });

  if (!mentor) {
    return {
      userId,
      wheelCompleted: false,
      questionsConfigured: false,
      currentStep: 'wheel',
    };
  }

  const meta = (mentor.meta as any) || {};
  const rules = (mentor.rules as any) || {};

  const wheelCompleted = meta.wheelCompleted === true;
  const questionsConfigured =
    rules.morningQuestions?.length > 0 ||
    rules.eveningQuestions?.length > 0 ||
    rules.dailyQuestions?.length > 0;

  const setupCompletedAt = meta.setupCompletedAt ? new Date(meta.setupCompletedAt) : undefined;

  return {
    userId,
    wheelCompleted,
    questionsConfigured,
    setupCompletedAt,
    currentStep: !wheelCompleted ? 'wheel' : !questionsConfigured ? 'questions' : 'complete',
  };
}

// ==========================================
// WHEEL CONFIGURATION
// ==========================================

/**
 * Configure wheel assessment
 */
export async function configureWheel(
  userId: string,
  scores: WheelScore[],
): Promise<{ wheelId: string; nextStep: string }> {
  // Generate AI analysis
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, firstName: true, email: true },
  });

  const analysis = await generateWheelAnalysis(scores, {
    name: user?.name || user?.firstName || 'Користувач',
    email: user?.email || null,
    phone: null,
    gender: null,
    age: null,
  });

  // Save wheel assessment
  const wheel = await prisma.wheelAssessment.create({
    data: {
      userId,
      scores: scores as unknown as Prisma.InputJsonValue,
      weakestSphere: scores[0]?.categoryId ?? 'focus',
      focusSphere: scores[0]?.categoryId ?? 'focus',
      analysis,
      createdAt: new Date(),
    },
  });

  // Update mentor meta
  await ensureMentor(userId);

  await prisma.mentor.update({
    where: { userId },
    data: {
      meta: {
        wheelCompleted: true,
        wheelId: wheel.id,
        setupStarted: new Date(),
      },
    },
  });

  return { wheelId: wheel.id, nextStep: 'questions' };
}

// ==========================================
// QUESTIONS CONFIGURATION
// ==========================================

/**
 * Configure daily questions
 */
export async function configureQuestions(
  userId: string,
  config: QuestionsConfig,
): Promise<{ setupComplete: boolean }> {
  const rules: any = {};

  // Set frequency
  rules.frequency = config.frequency;

  // Set questions based on frequency
  if (config.frequency === 'morning' || config.frequency === 'both') {
    rules.morningQuestions = config.morningQuestions || [
      'Який мій головний фокус сьогодні?',
      'Яка моя енергія (1-10)?',
      'Що може завадити мені сьогодні?',
    ];
  }

  if (config.frequency === 'evening' || config.frequency === 'both') {
    rules.eveningQuestions = config.eveningQuestions || [
      'Що я завершила сьогодні?',
      'Які були перемоги?',
      'Що навчила мене ця доба?',
    ];
  }

  if (config.frequency === 'daily') {
    rules.dailyQuestions = config.dailyQuestions || [
      'Як я себе почуваю?',
      'Що важливе сьогодні?',
      'Яка дія наблизить мене до цілі?',
    ];
  }

  // Add custom questions
  if (config.customQuestions && config.customQuestions.length > 0) {
    rules.customQuestions = config.customQuestions;
  }

  // fix code_x: setup flow requires telegram contact for reminders/reports delivery.
  const telegramRaw = String(config.telegramContact || '')
    .trim()
    .replace(/^@/, '');
  if (telegramRaw) {
    const isChatId = /^-?\d+$/.test(telegramRaw);
    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramUserName: isChatId ? null : telegramRaw,
        telegramChatId: isChatId ? telegramRaw : null,
      },
    });
    rules.telegramContact = telegramRaw;
  }

  // Update mentor
  await prisma.mentor.update({
    where: { userId },
    data: {
      rules,
      meta: {
        questionsConfigured: true,
        setupCompletedAt: new Date(),
      },
    },
  });

  return { setupComplete: true };
}

export async function generateQuestionsVariants(input: {
  frequency: QuestionsConfig['frequency'];
  goal?: string;
  audience?: string;
  tone?: string;
}): Promise<GeneratedQuestionsVariant[]> {
  const fallback: GeneratedQuestionsVariant[] = [
    {
      id: 'default-focus',
      title: 'Фокус і дія',
      morningQuestions: [
        'Який головний фокус дня?',
        'Яка 1 дія дасть найбільший результат?',
        'Що може мене відволікти і як я це обійду?',
      ],
      eveningQuestions: [
        'Що сьогодні спрацювало найкраще?',
        'Що варто покращити завтра?',
        'Який мій наступний конкретний крок?',
      ],
    },
    {
      id: 'default-balance',
      title: 'Стан і баланс',
      morningQuestions: [
        'У якому стані я починаю день (1-10)?',
        'Що підсилить мою енергію сьогодні?',
        'Який вибір підтримає мою ціль?',
      ],
      eveningQuestions: [
        'Що сьогодні забрало найбільше енергії?',
        'Що мене підсилило?',
        'Що я роблю завтра, щоб вирівняти баланс?',
      ],
    },
    {
      id: 'default-mentor',
      title: 'Менторський ритм',
      morningQuestions: [
        'Яка ціль дня в одному реченні?',
        'Яка маленька дія наблизить мене до цілі?',
        'Який результат я хочу побачити ввечері?',
      ],
      eveningQuestions: [
        'Що я завершила/завершив сьогодні?',
        'Де я зробила/зробив вибір на користь майбутнього?',
        'Що важливо утримати завтра?',
      ],
    },
  ];

  const prompt = `
Ти створюєш набір запитань для AI-ментора.
Поверни тільки JSON-масив із 3 об'єктів:
[
 { "id": "...", "title": "...", "morningQuestions": ["...","...","..."], "eveningQuestions": ["...","...","..."] }
]

Контекст:
- Частота: ${input.frequency}
- Мета: ${input.goal || 'не вказано'}
- Аудиторія: ${input.audience || 'не вказано'}
- Тон: ${input.tone || 'підтримуючий, конкретний, без води'}

Правила:
- Кожне питання коротке, практичне, дієве.
- Без повторів.
- 3 ранкових + 3 вечірніх питання для кожного варіанту.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1400,
    });

    const raw = String(completion.choices[0]?.message?.content || '')
      .replace(/```json\n?|\n?```/g, '')
      .trim();
    const parsed = JSON.parse(raw) as GeneratedQuestionsVariant[];

    if (!Array.isArray(parsed) || parsed.length < 1) return fallback;

    return parsed.slice(0, 3).map((variant, index) => ({
      id: String(variant.id || `ai-${index + 1}`),
      title: String(variant.title || `Варіант ${index + 1}`),
      morningQuestions: Array.isArray(variant.morningQuestions)
        ? variant.morningQuestions.slice(0, 3).map(String)
        : fallback[index % fallback.length].morningQuestions,
      eveningQuestions: Array.isArray(variant.eveningQuestions)
        ? variant.eveningQuestions.slice(0, 3).map(String)
        : fallback[index % fallback.length].eveningQuestions,
    }));
  } catch {
    return fallback;
  }
}

// ==========================================
// COMPLETE SETUP
// ==========================================

/**
 * Mark setup as complete and activate mentor
 */
export async function completeSetup(userId: string): Promise<{ success: boolean }> {
  const progress = await getSetupProgress(userId);

  if (!progress.wheelCompleted || !progress.questionsConfigured) {
    throw new Error('Setup not complete. Both wheel and questions must be configured.');
  }

  // Update user onboarding
  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingStage: 'ENTRY',
      onboardingStartedAt: new Date(),
    },
  });

  return { success: true };
}
