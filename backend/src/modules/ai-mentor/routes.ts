import { Request, Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../../db/client.js';
import { ProductKind } from '../../db/generated/prisma/client.js';
import { openai } from '../../lib/openai.js';
import { productOwnerGuard } from '../../middleware/productOwnerGuard.js';
import { authRequired } from '../../modules/auth/middleware/auth.js';
import { serverError } from '../../utils/serverError.js';
import { getPrimaryGoal } from '../goals/service.js';
import { requireGenerationQuota } from '../quota/generation.middleware.js';
import * as aiController from './controllers.js';

const router: Router = Router();
router.use(authRequired);

// ── Існуючі роути (не змінено) ───────────────────────────────────────────────
router.get('/session/:sessionId?', aiController.getSession);
router.get('/history',             aiController.getHistory);
router.get('/context',             aiController.getContext);

router.get('/daily-entry',         aiController.listDailyEntries);
router.get('/daily-entry/latest',  aiController.latestDailyEntry);
router.get('/daily-entry/today',   aiController.todayEntry);
router.post('/daily-cycle',        aiController.submitDailyCycle);

router.post('/wheel',              aiController.processWheel);

router.get('/trial/status',        aiController.getTrialStatus);
router.get('/paid/status',         aiController.getPaidStatus);

router.get('/setup/progress',              aiController.getOnboardingStage);
router.post('/setup/wheel',                aiController.setupWheel);
router.post('/setup/questions/generate',   aiController.generateQuestions);
router.post('/setup/questions',            aiController.submitQuestions);
router.post('/setup/complete',             aiController.completeSetup);

// ── З квотою (не змінено, виправлено дублікат /chat) ─────────────────────────
router.post('/morning',        requireGenerationQuota, aiController.morningSession);
router.post('/evening',        requireGenerationQuota, aiController.eveningSession);
router.post('/chat-legacy',    requireGenerationQuota, aiController.sendMessage);

router.post('/chat', async (req: Request, res: Response) => {
  const { messages = [], context = {} } = req.body as {
    messages?: { role: 'user' | 'assistant'; content: string }[]
    context?: Record<string, unknown>
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*')
    res.flushHeaders()

    const systemPrompt = buildSystemPrompt(context as any)
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-12),
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (error) {
    console.error('[SSE /chat error]', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream failed' })
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
      res.end()
    }
  }
})
  router.post(
    '/producer-chat',
    async (req: Request, res: Response) => {
      const userId = (req as any).user?.id

    const { message, history = [], stepContext, context } = req.body as {
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
      stepContext?: string
      context?: string
    }

    try {
      const [user, streak, lastEntry, wheel, goal, vision, subscription, products, microTasks, progress] =
        await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, trialStartsAt: true, trialEndsAt: true, onboardingStage: true },
          }),
          prisma.streak.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
          prisma.dailyEntry.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
          prisma.wheelAssessment.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
          getPrimaryGoal(userId),
          prisma.visionStatement.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { content: true } }),
          prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { status: true, planCode: true, trialEndsAt: true } }),
          prisma.product.findMany({ where: { ownerId: userId }, select: { id: true, name: true, kind: true }, take: 5 }),
          prisma.microTask.findMany({ where: { userId, isCompleted: false }, select: { title: true }, take: 3 }),
          prisma.userProgress.findUnique({ where: { userId }, select: { level: true, totalPoints: true } }),
        ])

      const scoresMap = wheel?.scores as Record<string, number> | undefined
      const avgScore = scoresMap && Object.keys(scoresMap).length
        ? Math.round(Object.values(scoresMap).reduce((a, b) => a + b, 0) / Object.values(scoresMap).length)
        : null
      const weakSphere = scoresMap
        ? Object.entries(scoresMap).sort(([, a], [, b]) => a - b)[0]?.[0]
        : null

      const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || user?.role === 'EXPERT'
      const subStatus = subscription?.status ?? 'none'
      const trialActive = subStatus === 'TRIAL'
      const trialDaysLeft = subscription?.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
        : user?.trialEndsAt
          ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))
          : 0
      const hasPaid = subStatus === 'ACTIVE'

const SYSTEM = `Ти — AI-Ментор платформи Starway. Твоє ім'я — Starway Mentor.

════ РОЛЬ ════
Ти — не чатбот. Ти — керуючий модуль.
Методологія: СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ
Тон: жорстка ясність. Без «ти молодець», без мотивації заради мотивації.
AI фіксує стан — не рятує. AI аналізує вибір — не схвалює.

════ ВОРОНКА ПЛАТФОРМИ ════
1. ЛІДМАГНІТ "5 точок опори" — 5-денний практикум (безкоштовно, /5-tochok)
2. AI-МЕНТОР TRIAL — 7 днів безкоштовно
3. ПІДПИСКА — місяць/рік (повний доступ)

МОДУЛІ ЗА ТАРИФОМ:
▸ Free / Лідмагніт: перегляд, без AI-функцій
▸ Trial (7 днів):
  • Колесо балансу (6 сфер: гроші, реалізація, відносини, енергія, свобода, внутрішня опора)
  • Ранкові питання (3 хв, щоранку) → /dashboard/daily
  • Вечірні питання + рефлексія → /dashboard/daily
  • AI-аналіз відповідей
  • Афірмації під поточний стан
  • Мікрозавдання (конкретні дії 2-5 хв)
  • Дзеркало тижня (день 4 і фінал)
  • Чат з AI-ментором → /dashboard/sessions
▸ Підписка Active:
  • Все з trial + необмежено
  • Бачення → /dashboard/vision
  • Цілі (5 → 1 головна) → /dashboard/goals
  • Модуль вибору і рішень
  • PDF тижневі звіти → /dashboard/reports
  • Zoom-сесії → /dashboard/zoom
  • AI Генератор → /ai-generator
  • AI Продюсер → /producer
  • Пропозиція міні-курсів за патерном
  • Шлях у наставництво (30+ днів стабільності)

════ ПОТОЧНИЙ КОРИСТУВАЧ ════
- Ім'я: ${user?.name ?? 'Користувач'}
- Роль: ${isAdmin ? 'Адміністратор / Експерт' : 'Користувач'}
- Підписка: ${hasPaid ? `Активна (${subscription?.planCode ?? 'paid'})` : trialActive ? `Trial (${trialDaysLeft} дн. залишилось)` : 'Без підписки (free)'}
- Onboarding: ${user?.onboardingStage ?? 'не розпочато'}
- Streak: ${streak?.current ?? 0} днів | Рекорд: ${streak?.longest ?? 0}
- Рівень: ${progress?.level ?? 1} | XP: ${progress?.totalPoints ?? 0}
- Колесо балансу: ${avgScore != null ? `${avgScore}/10` : 'не заповнено'}
- Слабка сфера: ${weakSphere ?? 'невідомо'}
- Поточний стан: ${lastEntry ? String((lastEntry as any).state ?? 'не визначено') : 'немає записів'}
- Головна ціль: ${goal?.text ?? 'не задана'}
- Бачення: ${vision?.content ? vision.content.slice(0, 100) + '...' : 'не задано'}
- Активні мікрозавдання: ${microTasks.length ? microTasks.map((t: { title: string }) => t.title).join(', ') : 'немає'}
      - Продукти: ${products.length ? products.map((p: { name: string; kind: ProductKind | null }) => `${p.name} (${p.kind ?? 'без типу'})`).join(', ') : 'немає'}
${stepContext ? `▸ Контекст кроку: ${stepContext}` : ''}
${context ? `▸ Додатковий контекст: ${context}` : ''}

════ ЛОГІКА ПРОПОЗИЦІЙ (ЖОРСТКО) ════
- Колесо НЕ заповнено → перший крок: /dashboard/wheel
- Ціль не задана → другий крок: /dashboard/goals
- Trial закінчується (≤ 2 дні) → нагадай про підписку 1 раз, конкретно
- Патерн зливу 5+ днів → запропонуй відповідний міні-курс (1 раз за розмову)
- Стабільність 30+ днів → запропонуй наставництво
- Free без підписки → м'яко веди до trial: поясни що отримає
- НЕ пропонуй платне без тригера
- НЕ повторюй пропозицію в тій самій розмові двічі

════ ТВОЯ РОЛЬ ════
${isAdmin
  ? 'Адміністратор/Експерт. Допомагай з технічними аспектами платформи, налаштуванням продуктів, воронок, аналітикою.'
  : !trialActive && !hasPaid
    ? 'Без підписки. М\'яко веди до trial: /dashboard або /5-tochok для старту.'
    : avgScore === null
      ? 'Колесо не заповнено — це перший пріоритет. Запропонуй /dashboard/wheel.'
      : !goal?.text
        ? 'Ціль не задана — другий пріоритет. Запропонуй /dashboard/goals.'
        : 'Допомагай з поточними задачами відповідно до стану і цілей.'
}

════ СТИЛЬ ════
- Мова: ТІЛЬКИ українська
- Коротко: 2-4 речення для простих питань
- Структура: emoji-маркери і нумерація для кроків
- Посилання: формат /dashboard/wheel (без домену)
- Завершення: один конкретний наступний крок або питання
- НЕ вигадуй функцій яких немає в списку модулів вище`
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 600,
        temperature: 0.65,
        messages: [
          { role: 'system', content: SYSTEM },
          ...history.slice(-10),
          { role: 'user', content: message },
        ],
      })

      const result = completion.choices[0]?.message?.content ?? 'Системна помилка.'
      res.json({ result })
    } catch (err: any) {
      if (err?.status === 429 || err?.code === 'insufficient_quota') {
        console.warn('⚠️ [ai-producer-chat] rate limit', err.requestID ?? err)
        return res.status(429).json({
          error: 'ai-producer-chat',
          message: err?.error?.message ?? err?.message ?? 'Надто багато запитів. Спробуйте пізніше.',
        })
      }
      serverError(res, 'ai-producer-chat', err)
    }
  },
)

router.post('/wheel-analysis', requireGenerationQuota, aiController.processWheel);
router.post('/weekly',         requireGenerationQuota, aiController.weeklySession);
router.post('/pdf-report',     requireGenerationQuota, aiController.pdfReport);

// ── Новий роут (додано) ───────────────────────────────────────────────────────
// GET /api/mentor/weekly-report?productId=xxx
// Повний тижневий звіт: метрики + Hero варіанти + рекламні тексти
router.get('/weekly-report', requireGenerationQuota, productOwnerGuard, aiController.weeklyReportHandler);

function buildSystemPrompt(ctx: {
  primaryGoal:  string | null;
  focusSphere:  string | null;
  wheelScore:   number | null;
  streakDays:   number;
  lastState:    string | null;
  visionText:   string | null;
  recentDrains: string[];
}): string {
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
5. Ніколи не пропонуй курси або платні продукти — це робить система окремо`;
}

router.get('/context/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const [user, streak, lastCycle, wheel, goal, vision] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.streak.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.dailyEntry.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wheelAssessment.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      getPrimaryGoal(userId),
      prisma.visionStatement.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { content: true },
      }),
    ]);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const scoresMap = wheel?.scores as Record<string, number> | undefined;
    const minSphereEntry = scoresMap ? Object.entries(scoresMap).sort(([, a], [, b]) => a - b)[0] : undefined;
    const avgScore = scoresMap && Object.keys(scoresMap).length
      ? Math.round(Object.values(scoresMap).reduce((sum, value) => sum + value, 0) / Object.values(scoresMap).length)
      : null;

    const drains = await prisma.dailyEntry.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { drain: true },
    });
    const recentDrains = [...new Set(drains.map(d => d.drain).filter(Boolean) as string[])];

    res.json({
      userId,
      lastState: (lastCycle?.state as string) ?? null,
      primaryGoal: goal?.text ?? null,
      focusSphere: minSphereEntry?.[0] ?? null,
      wheelScore: avgScore,
      streakDays: streak?.current ?? 0,
      visionText: vision?.content ?? null,
      recentDrains,
    });
  } catch (err) {
    serverError(res, 'ai-mentor/context', err);
  }
});

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { userId, message, history = [], context } = req.body as {
      userId: string;
      message: string;
      history: { role: string; content: string }[];
      context?: Parameters<typeof buildSystemPrompt>[0];
    };

    const systemPrompt = context
      ? buildSystemPrompt(context)
      : `Ти — AI-ментор системи Starway. Мова: українська. Жорстка ясність. СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.`;

    const trimmedHistory = history.slice(-12);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.5,
      max_tokens: 400,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...trimmedHistory.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ],
    });

    let aborted = false;

    req.on('close', () => {
      aborted = true;
    });

    for await (const chunk of stream) {
      if (aborted) break;
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    if (!aborted) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (err) {
    res.write('data: [DONE]\n\n');
    res.end();
    serverError(res, 'ai-mentor/chat', err);
  }
});

export default router;
