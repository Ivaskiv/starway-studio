import { prisma } from '../../db/client.js';
import type { DailyState, Prisma } from '@starway/db/prisma-client';
import { stankeyPrompts } from '@/products/stankey/config/stankey.prompts.js';
import { openai } from '../../lib/openai.js';
import { logDailyCycle, recordMicroSupport, calculateStreak, triggerAICheckIn } from '../daily-cycle/service.js';
import { getPrimaryGoal } from '../goals/service.js';
import { SPHERE_LABELS, type WheelSphereId } from '../wheel/types.js';
import { generatePayload as generateMentorPayload } from './generation.service.js';
import { ensureMentor } from './helpers.js';
import { buildContextPrompt, buildSystemPrompt } from './prompt.js';
import {
  detectRegression as detectRegressionState,
  generateMicroActions as generateMicroActionsState,
  isOpenAIQuotaError,
  updateUserState,
} from './state.service.js';
import { runGuardedAiTask, stableHash } from '../../services/aiGuard.service.js';
import { runRegisteredAiTask } from '../../services/aiTaskRunner.service.js';
import { resolveAiModel } from '../../platform/ai.registry.js';
import {
  SendMessageDto,
  ChatResponse,
  AIGenerationRequest,
  AIGenerationResponse,
  MentorSession,
  MentorMessage,
  DailyCycleInput,
  DailyCycleResponse,
  WheelScore,
  WheelAnalysis,
  OnboardingStage,
  CompleteStageDto,
  UpdateProgressDto,
  TrialStatus,
  PaidAccessStatus,
  AffirmationDto,
  MicroSupportItem,
  MentorChatContext,
  MentorExtendedContext,
  StreamChatInput,
} from './types.js';
import { rewardEngine } from '../gamification/reward.engine.js';


const ONBOARDING_ORDER: OnboardingStage[] = ['ENTRY', 'CHOICE', 'ACTIONS', 'GOAL', 'VISION', 'COMPLETED'];
const STAGE_LENGTH_MS: Record<OnboardingStage, number> = {
  ENTRY: 2 * 60 * 60 * 1000,
  CHOICE: 6 * 60 * 60 * 1000,
  ACTIONS: 12 * 60 * 60 * 1000,
  GOAL: 18 * 60 * 60 * 1000,
  VISION: 24 * 60 * 60 * 1000,
  COMPLETED: 0,
};
const PAID_MODULES = new Set(['VISION', 'GOAL', 'CHOICE', 'ACTION']);

const STATE_LABELS: Record<DailyState, string> = {
  NEUTRAL: 'Рівновага',
  TENSION: 'Напруга',
  FEAR: 'Страх',
  STABILITY: 'Стабільність',
  INNER_SUPPORT: 'Духовність',
};

const getStateLabel = (state?: DailyState): string | undefined => {
  if (!state) return undefined;
  return STATE_LABELS[state] ?? state;
};

function pickFocusSphere(scores: Record<string, unknown> | null | undefined) {
  if (!scores || typeof scores !== 'object') return undefined;
  const numericEntries = Object.entries(scores)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .map(([key, value]) => [key as WheelSphereId, value] as [WheelSphereId, number]);

  if (!numericEntries.length) return undefined;

  numericEntries.sort((a, b) => a[1] - b[1]);
  const [sphere, score] = numericEntries[0];

  return {
    sphereLabel: SPHERE_LABELS[sphere] ?? sphere,
    score: Math.round(score * 10) / 10,
  };
}

async function aiGenerate(prompt: AIGenerationRequest): Promise<AIGenerationResponse> {
  const contextPrompt = prompt.context?.join('\n') ?? ''
  const text = await runRegisteredAiTask(
    'mentor_reply',
    {
      userId: prompt.userId ?? `system:${stableHash({ contextPrompt, prompt: prompt.prompt }).slice(0, 12)}`,
      source: 'mentor-generate',
      label: 'mentor-generate',
      payloadHash: stableHash({ contextPrompt, prompt: prompt.prompt }),
      payload: {
        contextHash: stableHash(contextPrompt),
        promptHash: stableHash(prompt.prompt),
        contextLength: contextPrompt.length,
        promptLength: prompt.prompt.length,
      },
    },
    async () => {
      const result = await openai.chat.completions.create({
        model: resolveAiModel('mentor_reply'),
        temperature: 0.35,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          {
            role: 'user',
            content: contextPrompt
              ? `КОНТЕКСТ:\n${contextPrompt}\n\nЗАПИТ:\n${prompt.prompt}`
              : prompt.prompt,
          },
        ],
        max_tokens: 400,
      });
      return result.choices[0]?.message?.content ?? '';
    },
    () => '',
  )
  return { text, summary: text.split('\n')[0] ?? '', tone: 'harsh' };
}

async function getLatestSession(userMentorId: string): Promise<MentorSession | null> {
  return prisma.aiMentorSession.findFirst({
    where: { userMentorId },
    orderBy: { createdAt: 'desc' },
  });
}

async function createSession(userId: string, userMentorId: string): Promise<MentorSession> {
  return prisma.aiMentorSession.create({
    data: {
      userId,
      chatId: userId,
      userMentorId,
    },
  });
}

function scheduleStage(startedAt: Date): OnboardingStage {
  const elapsed = Date.now() - startedAt.getTime();
  let cumulative = 0;
  for (const stage of ONBOARDING_ORDER) {
    cumulative += STAGE_LENGTH_MS[stage];
    if (STAGE_LENGTH_MS[stage] === 0 || elapsed < cumulative) return stage;
  }
  return 'COMPLETED';
}

export async function getOrCreateSession(userId: string, sessionId?: string): Promise<MentorSession> {
  const userMentor = await ensureMentor(userId);
  if (sessionId) {
    const existing = await prisma.aiMentorSession.findUnique({ where: { id: sessionId } });
    if (existing) return existing;
  }
  const latest = await getLatestSession(userMentor.id);
  if (latest) return latest;
  return createSession(userId, userMentor.id);
}

export async function logMessage(payload: {
  sessionId: string;
  role: 'USER' | 'MENTOR' | 'SYSTEM';
  text: string;
}): Promise<MentorMessage> {
  const message = await prisma.aiMentorMessage.create({
    data: {
      sessionId: payload.sessionId,
      role: payload.role,
      content: payload.text,
    },
  });
  await prisma.aiMentorSession.update({
    where: { id: payload.sessionId },
    data: { endedAt: new Date() },
  });
  return message;
}

export async function sendMessage(params: SendMessageDto): Promise<ChatResponse> {
  const session = await getOrCreateSession(params.userId, params.sessionId);
  const userMessage = await logMessage({ sessionId: session.id, role: 'USER', text: params.message });
  const contextPrompt = await buildContextPrompt(params.userId)
  const activeTasks = await prisma.microTask.findMany({
    where: {
      userId: params.userId,
      status: 'active',
      isCompleted: false,
    },
    orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    take: 3,
    select: { title: true, why: true },
  })
  const taskPrompt = activeTasks.length
    ? `Активні задачі юзера:\n${activeTasks.map(task => `- ${task.title}${task.why ? ` — ${task.why}` : ''}`).join('\n')}`
    : 'Активних задач зараз немає.'
  const productPrompt = params.context?.product === 'stankey'
    ? stankeyPrompts.mentor.system
    : ''
  const ai = await aiGenerate({
    userId: params.userId,
    prompt: `Прийми рішення по повідомленню користувача. Визнач розрив між станом і дією. Дай відповідь JSON: { "reply": "string", "actionables": ["string"] }. Повідомлення: ${params.message}`,
    context: [productPrompt, contextPrompt, taskPrompt].filter(Boolean),
  });
  const mentorMessage = await logMessage({ sessionId: session.id, role: 'MENTOR', text: ai.text });
  await rewardEngine.onMentorSessionCompleted(params.userId);
  return { session, userMessage, mentorMessage };
}

export async function getChatHistory(userId: string) {
  const userMentor = await ensureMentor(userId);
  const sessions = await prisma.aiMentorSession.findMany({
    where: { userMentorId: userMentor.id },
    select: { id: true },
  });
  const sessionIds = sessions.map(s => s.id);
  return prisma.aiMentorMessage.findMany({
    where: { sessionId: { in: sessionIds } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMentorContext(userId: string): Promise<MentorChatContext> {
  const [latestEntry, latestWheel, streak, primaryGoal, activeTasks] = await Promise.all([
    prisma.dailyEntry.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { state: true },
    }),
    prisma.userBalanceEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { scores: true },
    }),
    prisma.streak.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { current: true },
    }),
    getPrimaryGoal(userId),
    prisma.microTask.findMany({
      where: { userId, status: 'active', isCompleted: false },
      orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 3,
      select: { title: true },
    }),
  ]);

  const focus = pickFocusSphere(latestWheel?.scores as Record<string, unknown> | undefined);

  return {
    lastState: getStateLabel(latestEntry?.state as DailyState | undefined),
    focusSphere: focus?.sphereLabel,
    wheelScore: focus?.score,
    primaryGoal: primaryGoal?.text ?? undefined,
    streakDays: streak?.current ?? undefined,
    activeTasks: activeTasks.map(task => task.title),
  };
}

export async function getInstantInsight(userId: string): Promise<{ title: string; insight: string }> {
  const context = await getMentorContext(userId)

  const insight = context.primaryGoal
    ? `Твій фокус зараз — ${context.primaryGoal}. Наступний крок буде найсильнішим, якщо ти закріпиш його однією дією сьогодні.`
    : context.focusSphere
      ? `Найбільше уваги зараз просить сфера "${context.focusSphere}". Один малий рух у цій зоні дасть найшвидший ефект.`
      : context.lastState
        ? `Твій поточний стан: ${context.lastState}. Зафіксуй один конкретний крок, щоб перетворити цей стан у результат.`
        : 'Твій наступний крок готовий: відкрий ABsystem і зроби один маленький крок, щоб запустити ритм дня.'

  return {
    title: 'Наступний крок готовий',
    insight,
  }
}

export async function getMentorExtendedContext(userId: string): Promise<MentorExtendedContext> {
  const [user, baseContext, vision, drains] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    }),
    getMentorContext(userId),
    prisma.visionStatement.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { content: true },
    }),
    prisma.dailyEntry.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { drain: true },
    }),
  ])

  if (!user) {
    throw new Error('user_not_found')
  }

  const recentDrains = [...new Set(
    drains
      .map((entry: { drain: string | null }) => entry.drain)
      .filter((drain): drain is string => Boolean(drain)),
  )]

  return {
    userId,
    lastState: baseContext.lastState,
    primaryGoal: baseContext.primaryGoal,
    focusSphere: baseContext.focusSphere,
    wheelScore: baseContext.wheelScore,
    streakDays: baseContext.streakDays ?? 0,
    visionText: vision?.content ?? null,
    recentDrains,
  }
}

export function buildStreamingSystemPrompt(ctx: MentorExtendedContext): string {
  return `Ти — AI-ментор системи Starway.

РОЛЬ: Ти не психолог і не мотиватор. Ти — керуючий модуль.
Твоя єдина функція: вести людину по системі СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.

СТИЛЬ:
- Жорстка ясність. Без "ти молодець", без підтримки, без мотивації
- Короткі речення. Максимум 3-4 речення за раз
- Питання тільки одне — найважливіше
- Якщо розмита відповідь — уточнюй конкретику
- Мова: тільки українська

КОНТЕКСТ КОРИСТУВАЧА:
- Поточний стан: ${ctx.lastState ?? 'не визначено'}
- Головна ціль: ${ctx.primaryGoal ?? 'не задана — потрібно з\'ясувати'}
- Фокус-сфера: ${ctx.focusSphere ?? 'не визначена'}
- Бал колеса: ${ctx.wheelScore != null ? `${ctx.wheelScore}/10` : 'не заповнено'}
- Streak: ${ctx.streakDays} днів
- Бачення: ${ctx.visionText ?? 'не задано'}
- Дренажі тижня: ${ctx.recentDrains.join(', ') || 'немає даних'}

ЛОГІКА:
1. Якщо ціль не задана → веди до модулю E (5 цілей → 1 головна)
2. Якщо є ціль → перевіряй чи кожен вибір веде до неї
3. При дренажі → фіксуй "зраду рішенню", не жалій
4. При streak < 3 → питай про перешкоди конкретно
5. Ніколи не пропонуй курси або платні продукти — це робить система окремо`
}

export async function createMentorChatStream(input: StreamChatInput) {
  const systemPrompt = input.context
    ? buildStreamingSystemPrompt(input.context)
    : 'Ти — AI-ментор системи Starway. Мова: українська. Жорстка ясність. СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.'

  return openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.5,
    max_tokens: 400,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...input.history.slice(-12).map(message => ({
        role: message.role,
        content: message.content,
      })),
      { role: 'user', content: input.message },
    ],
  })
}

export async function advanceOnboarding(userId: string): Promise<OnboardingStage> {
  const userMentor = await ensureMentor(userId);
  const session = await getLatestSession(userMentor.id);
  if (!session) return 'ENTRY';
  const stage = scheduleStage(session.createdAt);
  await prisma.userAiMentor.update({ where: { id: userMentor.id }, data: { currentStep: stage, lastInteractionAt: new Date() } });
  return stage;
}

export async function completeStage(dto: CompleteStageDto) {
  const userMentor = await ensureMentor(dto.userId);
  await prisma.userAiMentor.update({
    where: { id: userMentor.id },
    data: { currentStep: dto.stage, updatedAt: new Date() },
  });
}

export async function updateProgress(dto: UpdateProgressDto) {
  const userMentor = await ensureMentor(dto.userId);
  await prisma.userAiMentor.update({
    where: { id: userMentor.id },
    data: { currentStep: dto.stage },
  });
}

async function assertPaid(userId: string, module: string) {
  if (!PAID_MODULES.has(module)) return;
  const subscription = await prisma.subscription.findFirst({ where: { userId }, orderBy: [{ createdAt: 'desc' }] });
  if (subscription?.status !== 'ACTIVE') throw new Error('access_denied');
}

export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { trialStartsAt: true, trialEndsAt: true } });
  if (!user?.trialStartsAt || !user.trialEndsAt) return { state: 'EXPIRED', daysLeft: 0, streak: 0 };
  const now = new Date();
  if (now > user.trialEndsAt) return { state: 'EXPIRED', daysLeft: 0, streak: 0 };
  const streak = await prisma.dailyEntry.count({ where: { userId, createdAt: { gte: user.trialStartsAt } } });
  const daysLeft = Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { state: 'ACTIVE', daysLeft: Math.max(0, daysLeft), streak };
}

export async function getPaidAccessStatus(userId: string): Promise<PaidAccessStatus> {
  const subscription = await prisma.subscription.findFirst({ where: { userId }, orderBy: [{ createdAt: 'desc' }] });
  const hasAccess = subscription?.status === 'ACTIVE';
  const modules = Array.from(PAID_MODULES).map(name => ({ name, enabled: hasAccess }));
  return { hasAccess: Boolean(hasAccess), modules };
}

export async function submitDailyCycle(input: DailyCycleInput): Promise<DailyCycleResponse> {
  await assertPaid(input.userId, 'DAILY');
  const jsonMicroSupport = (input.microSupport ?? []).map(item => ({
    id: item.id,
    action: item.action,
    durationDays: item.durationDays,
    completed: item.completed ?? false,
    note: item.note ?? null,
  })) as Prisma.JsonArray;
  const entry = await prisma.dailyEntry.create({
    data: {
      userId: input.userId,
      expertId: input.expertId,
      state: input.state,
      choice: input.choice,
      drain: input.drain ?? null,
      dayFact: input.dayFact,
      microSupport: jsonMicroSupport,
      aiAnalysis: input.aiAnalysis ?? null,
      date: new Date(),
    },
  });
  const contextPrompt = await buildContextPrompt(input.userId)
  const analysis = await aiGenerate({
    userId: input.userId,
    prompt: `Аналіз циклу: ${JSON.stringify(input)}`,
    context: [contextPrompt],
  });

  // fix etap6: persist core cycle log for analytics and AI summaries
  await logDailyCycle(input.userId, {
    state: input.state,
    choice: input.choice,
    drain: input.drain,
    dayFact: input.dayFact,
    aiSummary: analysis.text,
  });
  // fix etap6: record each micro-support action separately
  await Promise.all(
    (input.microSupport ?? []).map(item =>
      recordMicroSupport(input.userId, item.action, {
        ...item,
      }),
    ),
  );
  void updateUserState({
    userId: input.userId,
    source: 'daily',
    answers: {
      state: input.state,
      choice: input.choice,
      factOfDay: input.dayFact ?? '',
      drain: input.drain ?? '',
    },
  }).catch(error => {
    if (isOpenAIQuotaError(error)) {
      console.warn('[updateUserState] skipped enrichment due to OpenAI quota', {
        userId: input.userId,
        source: 'daily',
      })
      return
    }

    console.error('[updateUserState]', error)
  })
  // fix etap6: recompute derived streak metrics and trigger AI check-in reminders
  await calculateStreak(input.userId);
  await triggerAICheckIn(input.userId);
  return {
    id: entry.id,
    userId: entry.userId,
    expertId: entry.expertId,
    date: entry.date,
    state: entry.state,
    choice: entry.choice,
    drain: entry.drain ?? null,
    dayFact: entry.dayFact,
    aiAnalysis: analysis.text,
    microSupport: ((entry.microSupport ?? []) as Prisma.JsonArray).map(
      value => {
        const item = (value as Prisma.JsonObject) ?? {};
        return {
          id: String(item.id ?? ''),
          action: String(item.action ?? ''),
          durationDays: Number(item.durationDays ?? 0),
          completed: Boolean(item.completed ?? false),
          note: typeof item.note === 'string' ? item.note : undefined,
        } as MicroSupportItem;
      }
    ),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export async function listDailyEntries(userId: string, limit = 30) {
  return prisma.dailyEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
  });
}

export async function getLatestDailyEntry(userId: string) {
  return prisma.dailyEntry.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
  });
}

export async function hasTodayEntry(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = await prisma.dailyEntry.count({
    where: {
      userId,
      date: { gte: today },
    },
  });
  return count > 0;
}

export async function processWheel(userId: string, scores: WheelScore[]): Promise<WheelAnalysis> {
  await assertPaid(userId, 'WHEEL');
  const weakest = scores.reduce((prev, curr) => (curr.score < prev.score ? curr : prev));
  const strongest = scores.reduce((prev, curr) => (curr.score > prev.score ? curr : prev));
  const imbalance = scores.reduce((acc, score) => acc + Math.abs(5 - score.score), 0) / scores.length;
  const session = await getOrCreateSession(userId);
  await logMessage({ sessionId: session.id, role: 'MENTOR', text: `Колесо: слабка ${weakest.categoryId}` });
  return {
    weakestSphere: weakest.categoryId,
    focusSphere: strongest.categoryId,
    imbalance: imbalance.toFixed(1),
    scores,
  };
}

export async function submitPaidModule(userId: string, module: string, payload: Record<string, unknown>) {
  await assertPaid(userId, module);
  return aiGenerate({ userId, prompt: `${module}: ${JSON.stringify(payload)}` });
}

export async function generateAffirmation(type: 'morning' | 'evening'): Promise<AffirmationDto> {
  const text = type === 'morning' ? 'Можеш почати день з чіткої мети' : 'Завтра — ще один стандарт, тож закінчуємо!';
  return { text, category: type, generatedAt: new Date() };
}

export async function createMorningSession(userId: string) {
  await assertPaid(userId, 'DAILY');
  const affirmation = await generateAffirmation('morning');
  await rewardEngine.onMentorSessionCompleted(userId);
  return affirmation;
}

export async function createEveningSession(userId: string) {
  await assertPaid(userId, 'DAILY');
  const affirmation = await generateAffirmation('evening');
  await rewardEngine.onMentorSessionCompleted(userId);
  return affirmation;
}

export async function generateMicroActions(userId: string) {
  return generateMicroActionsState(userId)
}

export async function detectRegression(userId: string) {
  return detectRegressionState(userId)
}

export { aiGenerate, generateMentorPayload as generatePayload };


// ── generateWeeklyReport ────────────────────────────────────────────

export interface WeeklyReportData {
  userId:    string;
  productId?: string;
  weekStart: Date;
  weekEnd:   Date;
  metrics: {
    newEntries:    number;
    avgWheelScore: number | null;
    streakDays:    number;
    totalSessions: number;
  };
  heroVariants: Array<{
    headline: string;
    subline: string;
    cta: string;
    angle: 'pain' | 'desire' | 'curiosity';
    description: string;
  }>;
  analysis:     string;
  adTexts: {
    facebook: string;
    instagram_caption: string;
    tiktok_hook: string;
    stories: string;
    reels_script: string;
  };
}

export async function generateWeeklyReport(
  userId: string,
  productId?: string,
): Promise<WeeklyReportData> {
  const weekEnd   = new Date();
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Збираємо метрики за тиждень з БД
  const [newEntries, totalSessions, wheelEntries] = await Promise.all([
    prisma.dailyEntry.count({
      where: { userId, createdAt: { gte: weekStart } },
    }),
    prisma.aiMentorSession.count({
      where: {
        userMentor: { userId },
        createdAt: { gte: weekStart },
      },
    }),
    prisma.userBalanceEntry.findMany({
      where: { userId, createdAt: { gte: weekStart } },
      select: { scores: true },
    }),
  ]);

  // Середній бал колеса (якщо є записи)
  let avgWheelScore: number | null = null;
  if (wheelEntries.length > 0) {
    const allScores = wheelEntries.flatMap(entry => {
      const scores = entry.scores as Record<string, number> | null;
      return scores ? Object.values(scores) : [];
    });
    if (allScores.length > 0) {
      avgWheelScore = Math.round(
        (allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10,
      ) / 10;
    }
  }

  // Streak з останніх записів
  const streakDays = await prisma.dailyEntry.count({
    where: { userId, createdAt: { gte: weekStart } },
  });

  const metrics = { newEntries, avgWheelScore, streakDays, totalSessions };

  // 2. Генеруємо аналіз через GPT-4o-mini
  const analysisPrompt = [
    'Ти — AI-ментор. Проаналізуй тиждень користувача українською.',
    '',
    `Метрики тижня (${weekStart.toLocaleDateString('uk-UA')} – ${weekEnd.toLocaleDateString('uk-UA')}):`,
    `• Записів щоденного циклу: ${newEntries}`,
    `• Сесій з ментором: ${totalSessions}`,
    `• Середній бал колеса: ${avgWheelScore ?? 'немає даних'}`,
    `• Активних днів: ${streakDays}`,
    '',
    'Надай: 1) Оцінку тижня (2 речення) 2) Головне досягнення 3) Що покращити наступного тижня',
    'Тон: підтримуючий, конкретний, без загальних фраз.',
  ].join('\n');

  const analysis = (await aiGenerate({
    userId,
    prompt: analysisPrompt,
  })).text.trim();

  const heroVariants: WeeklyReportData['heroVariants'] = []
  const adTexts: WeeklyReportData['adTexts'] = {
    facebook: '',
    instagram_caption: '',
    tiktok_hook: '',
    stories: '',
    reels_script: '',
  }

  return {
    userId,
    productId,
    weekStart,
    weekEnd,
    metrics,
    heroVariants,
    analysis,
    adTexts,
  };
}
