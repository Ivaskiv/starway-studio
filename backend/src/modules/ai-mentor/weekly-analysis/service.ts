// backend/src/modules/ai-mentor/service.ts
import type {
  WeeklyRawData,
  UserWeeklyReport,
  MentorWeeklyProfile,
  WeeklyAnalysisResult,
} from './types.js'
import { prisma } from '../../../db/client.js'
import { openai } from '../../../lib/openai.js'
import { cacheGet, cacheSet } from '../../../lib/cache/index.js'
import { invalidateWeeklyReportCache } from '../../../lib/db/weeklyReportCache.js'
import { MODEL_FOR_TASK } from '../../../lib/openaiModels.js'
import { suggestNextProduct } from '../../assistant/service.js'
import { logger } from '../../../utils/logger.js'
import { Prisma, SubscriptionStatus } from '@starway/db/prisma-client'
import { extractProgressPercent } from '../../microTask/service.js'
import { runGuardedAiTask, stableHash } from '../../../services/aiGuard.service.js'
import { storeWeeklySocialProofArtifacts } from '../../admin/content-research.service.js'
import { parseZoomPostReport } from '../../zoom/zoomPostReport.types.js'

const extractAnswers = (value: unknown): string[] => {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  if (!('answers' in record)) return []
  const answers = record.answers
  if (!Array.isArray(answers)) return []
  return answers.filter((answer): answer is string => typeof answer === 'string')
}

function extractTaggedLines(transcripts: WeeklyRawData['zoomTranscripts'], prefix: string): string[] {
  return transcripts.flatMap((item) =>
    item.transcript
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith(prefix))
      .map((line) => line.slice(prefix.length).trim())
      .filter((line) => line.length > 0),
  )
}

function getMicroTaskProgressStats(tasks: WeeklyRawData['microTasks']) {
  const taskProgress = tasks
    .map(task => task.progressPercent)
    .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))

  const partialTaskCount = taskProgress.filter(value => value > 0 && value < 100).length
  const slowProgressTaskCount = taskProgress.filter(value => value > 0 && value < 80).length
  const averageTaskProgress = taskProgress.length
    ? Math.round(taskProgress.reduce((sum, value) => sum + value, 0) / taskProgress.length)
    : null

  return {
    partialTaskCount,
    slowProgressTaskCount,
    averageTaskProgress,
  }
}

function normalizeZoomTranscript(value: unknown): WeeklyRawData['zoomTranscripts'][number] | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const transcript = String(record.transcript ?? '').trim()
  if (!transcript) return null

  const scheduledAtValue = record.scheduledAt
  const scheduledAt = scheduledAtValue instanceof Date
    ? scheduledAtValue
    : typeof scheduledAtValue === 'string' && scheduledAtValue.trim()
      ? new Date(scheduledAtValue)
      : null

  return {
    sessionId: typeof record.sessionId === 'string' ? record.sessionId : null,
    scheduledAt: scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null,
    transcript,
    transcriptLength: typeof record.transcriptLength === 'number' ? record.transcriptLength : transcript.length,
    fileId: typeof record.fileId === 'string' ? record.fileId : null,
    fileUniqueId: typeof record.fileUniqueId === 'string' ? record.fileUniqueId : null,
    chatId: typeof record.chatId === 'string' ? record.chatId : null,
    messageId: typeof record.messageId === 'number' ? record.messageId : null,
    mediaType: typeof record.mediaType === 'string' ? record.mediaType : null,
    fileName: typeof record.fileName === 'string' ? record.fileName : null,
    mimeType: typeof record.mimeType === 'string' ? record.mimeType : null,
    caption: typeof record.caption === 'string' ? record.caption : null,
    observedAt: typeof record.observedAt === 'string' ? record.observedAt : null,
  }
}

// ── 1. Збір даних з БД ────────────────────────────────────────
export async function collectWeeklyData(
  userId: string,
  weekStart: Date,
  weekEnd:   Date,
): Promise<WeeklyRawData> {

  const [
    user,
    dailyEntries,
    goalsSet,
    wheelEntries,
    prevWheelEntries,
    wheelCheckins,
    microTasks,
    messages,
    sessionCount,
    streak,
    subscription,
    zoomTranscripts,
  ] = await Promise.all([

    prisma.user.findUnique({
      where: { id: userId },
      select: {
        trialStartsAt: true,
        trialEndsAt: true,
      },
    }),

    prisma.dailyEntry.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      orderBy: { date: 'asc' },
    }),

    prisma.goalsSet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.wheelAssessment.findFirst({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.wheelAssessment.findFirst({
      where: { userId, createdAt: { lt: weekStart } },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.wheelAssessment.count({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
    }),

    prisma.microTask.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
    }),

    prisma.aiMentorMessage.findMany({
      where: {
        session: {
          userMentor: { userId },
        },
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { createdAt: 'asc' },
      take: 40,   // обмежуємо щоб не перевантажити контекст
    }),

    prisma.aiMentorSession.count({
      where: {
        userMentor: { userId },
        createdAt: { gte: weekStart, lte: weekEnd },
      },
    }),

    prisma.streak.findFirst({ where: { userId } }),

    prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.zoomSession.findMany({
      where: {
        scheduledAt: { gte: weekStart, lte: weekEnd },
        postSessionReport: {
          not: Prisma.JsonNull,
        },
      },
      orderBy: { scheduledAt: 'desc' },
      select: {
        id: true,
        topic: true,
        scheduledAt: true,
        postSessionReport: true,
      },
    }),
  ])

  // Формуємо wheelScores з delta
  const currentSpheres = (wheelEntries?.scores as Record<string, number>) ?? {}
  const prevSpheres    = (prevWheelEntries?.scores as Record<string, number>) ?? {}

  const wheelScores = Object.entries(currentSpheres).map(([sphere, score]) => ({
    sphere,
    score,
    prev: prevSpheres[sphere],
  }))
  const primaryGoal = Array.isArray(goalsSet?.goals)
    ? (goalsSet.goals as Array<{ text?: unknown; isPrimary?: unknown }>).find(
      goal => Boolean(goal?.isPrimary && typeof goal.text === 'string' && goal.text.trim()),
    )
    : null
  const userGoal = primaryGoal?.text ? String(primaryGoal.text).trim() : null
  const morningReflections = dailyEntries
    .map(entry => [
      entry.state ? `Стан: ${entry.state}` : '',
      entry.dayFact ? `Факт: ${entry.dayFact}` : '',
      entry.drain ? `Дренаж: ${entry.drain}` : '',
    ].filter(Boolean).join(' · '))
    .filter(Boolean)
  const eveningReflections = dailyEntries
    .map(entry => [
      entry.dayFact ? `Підсумок: ${entry.dayFact}` : '',
      entry.drain ? `Що заважало: ${entry.drain}` : '',
    ].filter(Boolean).join(' · '))
    .filter(Boolean)

  const transcriptItems = zoomTranscripts
    .map((session) => {
      const report = parseZoomPostReport(session.postSessionReport)
      if (!report) return null

      const transcript = [
        session.topic ? `Topic: ${session.topic}` : '',
        report.summary ? `Summary: ${report.summary}` : '',
        ...(report.highlights ?? []).map((highlight) => `HIGHLIGHT: ${highlight}`),
        ...(report.quotes ?? []).map((quote) => `QUOTE: ${quote}`),
        report.transcript ? `Transcript: ${report.transcript}` : '',
      ].filter((line) => line.trim().length > 0).join('\n')

      if (!transcript.trim()) return null

      return normalizeZoomTranscript({
        sessionId: session.id,
        scheduledAt: session.scheduledAt,
        transcript,
        transcriptLength: transcript.length,
        fileId: typeof report.audioFileId === 'string' ? report.audioFileId : null,
        fileUniqueId: null,
        chatId: null,
        messageId: null,
        mediaType: null,
        fileName: null,
        mimeType: null,
        caption: null,
        observedAt: report.transcribedAt ?? null,
      })
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  return {
    userId,
    weekStart,
    weekEnd,
    trialStartedAt: user?.trialStartsAt ?? null,
    trialEndsAt: user?.trialEndsAt ?? null,
    userGoal,
    accessState: subscription?.status === SubscriptionStatus.ACTIVE
      ? 'active'
      : user?.trialEndsAt && user.trialEndsAt > weekEnd
        ? 'trial'
        : 'paused',
    reflectionCount: dailyEntries.length,
    sessionCount,
    wheelCheckins,
    morningReflections,
    eveningReflections,

    dailyCycles: dailyEntries.map(entry => ({
      date:    entry.date,
      state:   entry.state as string,
      choices: extractAnswers(entry.content),
      drains:  entry.drain ? [entry.drain] : [],
      facts:   entry.dayFact ?? '',
    })),

    wheelScores,

    microTasks: microTasks.map(t => {
      const isOverdue = t.dueAt ? t.dueAt.getTime() < weekEnd.getTime() : false
      return {
        title:     t.title,
        completed: t.isCompleted,
        skipped:   !t.isCompleted && isOverdue,
        progressPercent: extractProgressPercent(t.aiContext),
        daysToComplete: t.daysToComplete,
      }
    }),

    mentorMessages: messages.map(m => ({
      role:    m.role.toLowerCase() === 'user' ? 'user' : 'assistant',
      content: m.content,
      date:    m.createdAt,
    })),
    zoomTranscripts: transcriptItems,

    streakDays:       streak?.current ?? 0,
    subscriptionPlan: subscription?.planCode ?? 'trial',
  }
}

async function resolveWeeklyReportProductId(userId: string): Promise<string | null> {
  const latestSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      productId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    select: { productId: true },
  })

  if (latestSubscription?.productId) {
    return latestSubscription.productId
  }

  const latestEnrollment = await prisma.enrollment.findFirst({
    where: { userId },
    orderBy: { enrolledAt: 'desc' },
    select: { productId: true },
  })

  if (latestEnrollment?.productId) {
    return latestEnrollment.productId
  }

  const mentorProduct = await prisma.product.findFirst({
    where: {
      OR: [
        { code: { contains: 'mentor', mode: 'insensitive' } },
        { name: { contains: 'mentor', mode: 'insensitive' } },
        { name: { contains: 'ментор', mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  if (mentorProduct?.id) {
    return mentorProduct.id
  }

  const fallbackProduct = await prisma.product.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  return fallbackProduct?.id ?? 'AI_MENTOR'
}

function buildFallbackUserReport(data: WeeklyRawData): UserWeeklyReport {
  const completedTasks = data.microTasks.filter(task => task.completed).length
  const totalTasks = data.microTasks.length
  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0
  const progressStats = getMicroTaskProgressStats(data.microTasks)

  const wheelDelta = data.wheelScores
    .filter(score => score.prev !== undefined)
    .map(score => ({ sphere: score.sphere, delta: score.score - (score.prev ?? score.score) }))

  const overallScore = Math.max(
    1,
    Math.min(
      10,
      Math.round(
        (
          completionRate / 20
          + Math.min(data.streakDays, 10) * 0.25
          + Math.min(data.sessionCount, 7) * 0.3
        ),
      ),
    ),
  )

  const activeSignalCount = data.reflectionCount + data.sessionCount + completedTasks + data.wheelCheckins
  const pausedSummary = activeSignalCount > 0
    ? `Trial вже завершився, але система зберегла твій реальний слід: ${data.reflectionCount} рефлексій, ${data.sessionCount} сесій, ${completedTasks} завершених задач і ${data.wheelCheckins} зріз${data.wheelCheckins === 1 ? '' : 'и'} колеса.`
    : 'Trial завершився раніше, ніж система встигла зібрати повний ритм, але старт і базові дані все одно збережені.'
  const pausedNextSteps = activeSignalCount > 0
    ? [
        'Відновити доступ і продовжити з уже зібраної точки',
        'Повернути одну щоденну сесію в ритм',
      ]
    : [
        'Повернути доступ до ABsystem',
        'Запустити ранкову сесію як перший крок',
      ]

  return {
    userId: data.userId,
    weekStart: data.weekStart,
    weekEnd: data.weekEnd,
    overallScore,
    topInsights: [
      data.accessState === 'paused'
        ? 'Ритм був на паузі, але історія збережена.'
        : completedTasks > 0
          ? 'Тиждень дав рух, але не все доводилось до кінця.'
          : 'Ритм ще формується, але база вже є.',
      progressStats.partialTaskCount > 0
        ? `Є ${progressStats.partialTaskCount} задачі в процесі${progressStats.slowProgressTaskCount > 0 ? `, ${progressStats.slowProgressTaskCount} нижче 80%` : ''}.`
        : completedTasks > 0
          ? 'Є на що спертися для наступного тижня.'
          : 'Потрібен простіший старт без перевантаження.',
      `Вибір на тиждень: ${data.streakDays > 0 ? 'зберігати одну головну дію щодня.' : 'тримати день простим і ясним.'}`,
    ],
    growthAreas: data.wheelScores.filter(score => score.prev !== undefined && score.score > (score.prev ?? score.score)).map(score => score.sphere),
    struggleAreas: data.wheelScores.filter(score => score.score <= 5).map(score => score.sphere).slice(0, 3),
    completionRate,
    streakDays: data.streakDays,
    wheelDelta,
    summaryText: data.accessState === 'paused'
      ? `${pausedSummary} Повернення в підписку не обнуляє шлях, а просто відкриває наступний крок із того місця, де ти зупинився.`
      : completedTasks > 0
        ? 'Тиждень показав рух, але не все доводилось до кінця.'
        : 'Тиждень був тихіший, але система зберегла контекст і напрям.',
    motivationText: '',
    nextWeekFocus: data.accessState === 'paused'
      ? 'Відновити доступ і продовжити з уже зібраної точки.'
      : progressStats.slowProgressTaskCount > 0
        ? 'Доводити незавершені задачі до 80–100% без нових стартів.'
        : 'Тримати один ясний крок на день.',
    nextWeekTasks: data.accessState === 'paused'
      ? pausedNextSteps
      : progressStats.slowProgressTaskCount > 0
        ? [
            'Довести одну задачу з прогресом нижче 80% до завершення',
            'Залишити лише одну головну дію на день',
          ]
        : [
            'Підтвердити одну головну дію на завтра',
            'Повернути ранкову або вечірню сесію в ритм',
          ],
  }
}

function buildFallbackMentorProfile(data: WeeklyRawData, userReport: UserWeeklyReport): MentorWeeklyProfile {
  return {
    userId: data.userId,
    weekStart: data.weekStart,
    createdAt: new Date(),
    behaviorPattern: data.sessionCount > 0 ? 'повертається, коли бачить конкретний наступний крок' : 'зупиняється без явного зовнішнього тригера',
    engagementRhythm: data.sessionCount > 0 || data.reflectionCount > 0 ? 'спадає' : 'хаотична',
    mainPainThisWeek: userReport.struggleAreas[0] ?? (userReport.slowProgressTaskCount ? 'мікрозавдання не доводяться до завершення' : 'нестабільний ритм'),
    emotionalTone: 'стабільна',
    retentionRisk: data.sessionCount > 0 || data.reflectionCount > 0 ? 6 : 4,
    retentionFactors: data.streakDays > 0 ? ['є попередній ритм', 'користувач уже проходив цикл'] : ['є історія та звіти'],
    churnSignals: [
      ...(data.sessionCount === 0 && data.reflectionCount === 0 ? ['тиждень без активної взаємодії'] : []),
      ...(userReport.slowProgressTaskCount && userReport.slowProgressTaskCount > 0 ? ['мікрозавдання застрягають нижче 80%'] : []),
    ],
    upsellReady: true,
    upsellProduct: 'subscription',
    upsellTiming: 'після перегляду тижневого звіту',
    upsellReasoning: 'Користувачу потрібен зрозумілий шлях повернення в систему через підписку та відновлення доступу.',
    nextMessageTone: 'підтримуючий',
    triggerForContact: 'коли користувач відкриває звіти або сторінку підписки',
    recommendedOffer: '🚀 Відновити доступ до ABsystem',
    systemNotes: userReport.slowProgressTaskCount && userReport.slowProgressTaskCount > 0
      ? 'Показувати історію і звіти, але підкреслювати незавершені задачі як продовження, а не новий старт.'
      : 'Показувати історію і звіти, але не тиснути mentor-нагадуваннями без активного доступу.',
  }
}

function applyPausedReportFraming(data: WeeklyRawData, report: UserWeeklyReport): UserWeeklyReport {
  if (data.accessState !== 'paused') {
    return report
  }

  const activitySnapshot = [
    data.reflectionCount > 0 ? `${data.reflectionCount} рефлекс${data.reflectionCount === 1 ? 'ія' : data.reflectionCount < 5 ? 'ії' : 'ій'}` : null,
    data.sessionCount > 0 ? `${data.sessionCount} AI-сес${data.sessionCount === 1 ? 'ія' : data.sessionCount < 5 ? 'ії' : 'ій'}` : null,
    report.streakDays > 0 ? `стрік ${report.streakDays} дн.` : null,
    report.completionRate > 0 ? `${report.completionRate}% виконання` : null,
    report.partialTaskCount && report.partialTaskCount > 0 ? `${report.partialTaskCount} задач у процесі` : null,
  ].filter(Boolean).join(' · ')

  const summaryText = activitySnapshot
    ? `Trial вже завершився, але твоя база не зникла: ${activitySnapshot}. Зараз на паузі живий ABsystem, нові мікрозавдання, ранкові й вечірні сесії, тому без підписки система більше не буде вести тебе далі.\n\nПовернення в підписку не обнуляє шлях. Воно повертає тобі доступ до щоденного циклу, персональних задач, аналітики і звітів — з тієї точки, де ти зупинився.`
    : 'Trial завершився, і система майже не встигла розкритися. Зараз у тебе на паузі ABsystem, нові мікрозавдання, ранкові й вечірні сесії, але стартова база все одно збережена.\n\nПідписка потрібна, щоб не починати навмання: ти отримуєш готовий ритм дня, персональні задачі, аналітику і супровід без хаосу.'

  const motivationText = activitySnapshot
    ? 'Ти вже не на нулі. У тебе є зібраний слід, і підписка потрібна не для “ще однієї спроби”, а щоб повернути систему в дію й довести почате до результату.'
    : 'Навіть якщо trial був уривчастим, цього достатньо, щоб побачити напрям. Підписка дає не абстрактну мотивацію, а щоденну структуру, яка доводить до руху.'

  const topInsights = [
    ...report.topInsights,
    'Дані та історія збережені навіть після завершення trial.',
  ].slice(0, 3)

  return {
    ...report,
    topInsights,
    summaryText,
    motivationText,
    nextWeekFocus: 'Відновити доступ і повернути систему в щоденний ритм без втрати вже напрацьованого.',
    nextWeekTasks: report.completionRate > 0 || report.streakDays > 0
      ? [
          'Відкрити тижневий звіт і побачити, що вже реально зібрано',
          'Активувати підписку без втрати прогресу',
          'Повернути одну щоденну сесію як точку нового ритму',
        ]
      : [
          'Активувати підписку',
          'Запустити першу ранкову сесію',
          'Дати системі один повний тиждень без розриву',
        ],
  }
}

// ── 2. Генерація звіту для користувача ───────────────────────
async function generateUserReport(
  data: WeeklyRawData,
): Promise<UserWeeklyReport> {

  const completedTasks = data.microTasks.filter(t => t.completed).length
  const totalTasks     = data.microTasks.length
  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0
  const progressStats = getMicroTaskProgressStats(data.microTasks)
  const userGoal = data.userGoal?.trim() || 'не задано'
  const morningReflections = data.morningReflections.slice(-5)
  const eveningReflections = data.eveningReflections.slice(-5)
  const allHighlights = extractTaggedLines(data.zoomTranscripts, 'HIGHLIGHT:')
  const allQuotes = extractTaggedLines(data.zoomTranscripts, 'QUOTE:')
  const allSummaries = extractTaggedLines(data.zoomTranscripts, 'Summary:')
  const weakestWheel = data.wheelScores
    .slice()
    .sort((left, right) => left.score - right.score)[0]
  const strongestWheel = data.wheelScores
    .slice()
    .sort((left, right) => right.score - left.score)[0]

  const wheelDelta = data.wheelScores
    .filter(s => s.prev !== undefined)
    .map(s => ({ sphere: s.sphere, delta: s.score - (s.prev ?? s.score) }))
  const weekCacheKey = `weekly-report:${data.userId}:${data.weekStart.toISOString().split('T')[0]}:${stableHash({
    completionRate,
    totalTasks,
    streakDays: data.streakDays,
    sessionCount: data.sessionCount,
    weakestWheel: weakestWheel?.sphere ?? null,
    strongestWheel: strongestWheel?.sphere ?? null,
    morningReflections,
    eveningReflections,
  })}`
  const cached = await cacheGet<UserWeeklyReport | null>(weekCacheKey)
  if (cached) {
    return cached
  }

  const prompt = `You write the weekly coaching report for Starway Studio users.
Write in Ukrainian. Tone: direct, warm, peer-level coach.
Not motivational fluff. Not database readout. Like a smart friend who looked at your week and tells you what they actually see.

Input data provided:
- week_range: ${data.weekStart.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} — ${data.weekEnd.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
- morning_sessions: ${data.dailyCycles.filter(d => d.state).length}
- evening_sessions: ${data.dailyCycles.filter(d => d.facts || d.drains.length > 0).length}
- tasks_done: ${completedTasks}
- tasks_skipped: ${data.microTasks.filter(task => task.skipped).length}
- tasks_total: ${totalTasks}
- streak: ${data.streakDays}
- score: ${Math.max(1, Math.min(10, Math.round((completionRate / 20) + Math.min(data.streakDays, 10) * 0.25 + Math.min(data.sessionCount, 7) * 0.3)))}
- morning_reflections: ${JSON.stringify(morningReflections)}
- evening_reflections: ${JSON.stringify(eveningReflections)}
- zoom_transcript_highlights: ${JSON.stringify(allHighlights)}
- zoom_transcript_quotes: ${JSON.stringify(allQuotes)}
- zoom_transcript_summaries: ${JSON.stringify(allSummaries)}
- user_goal: ${JSON.stringify(userGoal)}
- wheel_weak_area: ${JSON.stringify(weakestWheel?.sphere ?? '')}
- wheel_strong_area: ${JSON.stringify(strongestWheel?.sphere ?? '')}
- previous_week_focus: null

Rules for generation:
1. focus_next: ONE sentence. What ONE thing matters most next week, derived from what the user actually wrote in their reflections. Not generic. Must reference something real from their week. Max 15 words.
2. summary: TWO sentences max. What actually happened this week — honest, specific. No "СТАН:", "ЦІЛЬ:", "ВИБІР:", "ДІЯ:" prefixes.
3. insights: array of 1–3 strings. Real observations from the data. Each max 12 words. Plain sentence, no bullet prefix, no dash prefix.
4. next_steps: array of 1–2 strings. Specific to this user's week. Must be derived from actual reflections or missed sessions. If you can't generate a non-generic step, return [].
5. support_note: null. Remove this field entirely. Do not generate encouragement paragraphs.

Return JSON only:
{
  "focus_next": "string",
  "summary": "string",
  "insights": ["string"],
  "next_steps": ["string"]
}`

  const raw = await runGuardedAiTask(
    {
      userId: data.userId,
      source: 'weekly-report',
      label: 'weekly-report',
      payloadHash: stableHash({
        userId: data.userId,
        weekStart: data.weekStart.toISOString(),
        weekEnd: data.weekEnd.toISOString(),
        completionRate,
        totalTasks,
        weakestWheel: weakestWheel?.sphere ?? null,
        strongestWheel: strongestWheel?.sphere ?? null,
        streakDays: data.streakDays,
        sessionCount: data.sessionCount,
        progressStats,
      }),
      throttleMs: 10_000,
      duplicateWindowMs: 10 * 60_000,
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model:       MODEL_FOR_TASK.weekly_report,
        temperature: 0.7,
        max_tokens:  1200,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      })

      return JSON.parse(completion.choices[0].message.content ?? '{}')
    },
    () => ({
      focus_next: '',
      summary: '',
      insights: [],
      next_steps: [],
    }),
  )
  const focusNext = String(raw.focus_next ?? raw.nextWeekFocus ?? '').trim()
  const summary = String(raw.summary ?? raw.summaryText ?? '').trim()
  const insights = Array.isArray(raw.insights) ? raw.insights : raw.topInsights ?? []
  const nextSteps = Array.isArray(raw.next_steps) ? raw.next_steps : raw.nextWeekTasks ?? []
  const overallScore = Math.max(
    1,
    Math.min(
      10,
      Math.round(
        (
          completionRate / 20
          + Math.min(data.streakDays, 10) * 0.25
          + Math.min(data.sessionCount, 7) * 0.3
        ),
      ),
    ),
  )

  const report = {
    userId:         data.userId,
    weekStart:      data.weekStart,
    weekEnd:        data.weekEnd,
    overallScore,
    topInsights:    insights,
    growthAreas:    raw.growthAreas    ?? [],
    struggleAreas:  raw.struggleAreas  ?? [],
    completionRate,
    partialTaskCount: progressStats.partialTaskCount,
    averageTaskProgress: progressStats.averageTaskProgress,
    slowProgressTaskCount: progressStats.slowProgressTaskCount,
    streakDays:     data.streakDays,
    wheelDelta,
    summaryText:    summary,
    motivationText: '',
    nextWeekFocus:  focusNext,
    nextWeekTasks:  nextSteps,
  }
  await cacheSet(weekCacheKey, report, 7 * 24 * 3600)
  return report
}

// ── 3. Генерація прихованого профілю для ментора ─────────────
async function generateMentorProfile(
  data: WeeklyRawData,
  userReport: UserWeeklyReport,
): Promise<MentorWeeklyProfile> {

  const allHighlights = extractTaggedLines(data.zoomTranscripts, 'HIGHLIGHT:')
  const allQuotes = extractTaggedLines(data.zoomTranscripts, 'QUOTE:')
  const allSummaries = extractTaggedLines(data.zoomTranscripts, 'Summary:')

  const prompt = `Ти — аналітична система для онлайн-школи. Проаналізуй поведінку користувача за тиждень.
Твоя мета: допомогти ментору утримати користувача і запропонувати потрібний продукт у правильний момент.

ПОВЕДІНКОВІ ДАНІ:
Стрік: ${data.streakDays} днів
Тарифний план: ${data.subscriptionPlan}
Загальний прогрес тижня: ${userReport.overallScore}/10
Виконано задач: ${userReport.completionRate}%
Емоційний тон розмов: ${data.mentorMessages.filter(m=>m.role==='user').slice(-3).map(m=>m.content).join(' | ')}

Патерни активності:
${data.dailyCycles.map(d =>
  `${new Date(d.date).toLocaleDateString('uk', { weekday: 'short' })}: стан="${d.state}", дренажі=[${d.drains.join(',')}]`
).join('\n')}

Zoom transcript highlights:
${allHighlights.slice(0, 5).map((item, index) =>
  `${index + 1}. ${item}`
).join('\n')}

Zoom transcript quotes:
${allQuotes.slice(0, 5).map((item, index) =>
  `${index + 1}. ${item}`
).join('\n')}

Zoom transcript summaries:
${allSummaries.slice(0, 5).map((item, index) =>
  `${index + 1}. ${item}`
).join('\n')}

Найбільші проблемні зони (з колеса): ${userReport.struggleAreas.join(', ')}
Зони росту: ${userReport.growthAreas.join(', ')}

ЗАВДАННЯ: Дай відповідь у форматі JSON (без markdown):
{
  "behaviorPattern": "короткий опис поведінкового патерну",
  "engagementRhythm": "регулярна | хаотична | спадає | зростає",
  "mainPainThisWeek": "головний біль або виклик тижня",
  "emotionalTone": "тривожна | мотивована | виснажена | стабільна | піднесена",

  "retentionRisk": число 1-10,
  "retentionFactors": ["що тримає користувача"],
  "churnSignals": ["тривожні сигнали якщо є, інакше []"],

  "upsellReady": true або false,
  "upsellProduct": "назва продукту або ''",
  "upsellTiming": "коли показати оффер",
  "upsellReasoning": "чому саме зараз або чому не зараз",

  "nextMessageTone": "підтримуючий | спонукальний | святкуючий | спокійний",
  "triggerForContact": "що має статись щоб написати позачергово",
  "recommendedOffer": "конкретна пропозиція або ''",
  "systemNotes": "нотатки для AI-ментора на наступний тиждень (2-3 речення)"
}

Будь аналітичним, конкретним, без загальних фраз.`

  const raw = await runGuardedAiTask(
    {
      userId: data.userId,
      source: 'weekly-mentor-profile',
      label: 'weekly-mentor-profile',
      payloadHash: stableHash({
        userId: data.userId,
        weekStart: data.weekStart.toISOString(),
        prompt,
      }),
      throttleMs: 10_000,
      duplicateWindowMs: 10 * 60_000,
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model:       MODEL_FOR_TASK.weekly_report,
        temperature: 0.3,   // нижча температура — більш аналітично
        max_tokens:  800,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      })

      return JSON.parse(completion.choices[0].message.content ?? '{}')
    },
    () => ({
      behaviorPattern: '',
      engagementRhythm: 'регулярна',
      mainPainThisWeek: '',
      emotionalTone: 'стабільна',
      retentionRisk: 5,
      retentionFactors: [],
      churnSignals: [],
      upsellReady: false,
      upsellProduct: '',
      upsellTiming: '',
      upsellReasoning: '',
      nextMessageTone: 'спокійний',
      triggerForContact: '',
      recommendedOffer: '',
      systemNotes: '',
    }),
  )

  return {
    userId:            data.userId,
    weekStart:         data.weekStart,
    createdAt:         new Date(),
    behaviorPattern:   raw.behaviorPattern   ?? '',
    engagementRhythm:  raw.engagementRhythm  ?? '',
    mainPainThisWeek:  raw.mainPainThisWeek  ?? '',
    emotionalTone:     raw.emotionalTone     ?? '',
    retentionRisk:     raw.retentionRisk     ?? 5,
    retentionFactors:  raw.retentionFactors  ?? [],
    churnSignals:      raw.churnSignals      ?? [],
    upsellReady:       raw.upsellReady       ?? false,
    upsellProduct:     raw.upsellProduct     ?? '',
    upsellTiming:      raw.upsellTiming      ?? '',
    upsellReasoning:   raw.upsellReasoning   ?? '',
    nextMessageTone:   raw.nextMessageTone   ?? 'підтримуючий',
    triggerForContact: raw.triggerForContact ?? '',
    recommendedOffer:  raw.recommendedOffer  ?? '',
    systemNotes:       raw.systemNotes       ?? '',
  }
}

// ── 4. Зберегти результати в БД ───────────────────────────────
async function saveResults(result: WeeklyAnalysisResult): Promise<void> {
  const productId = await resolveWeeklyReportProductId(result.userReport.userId)
  if (!productId) {
    logger.warn(`[WeeklyAnalysis] no product found for weekly report userId=${result.userReport.userId}`)
    return
  }

  const profileData = {
    userId:            result.mentorProfile.userId,
    weekStart:         result.mentorProfile.weekStart,
    behaviorPattern:   result.mentorProfile.behaviorPattern,
    engagementRhythm:  result.mentorProfile.engagementRhythm,
    mainPainThisWeek:  result.mentorProfile.mainPainThisWeek,
    emotionalTone:     result.mentorProfile.emotionalTone,
    retentionRisk:     result.mentorProfile.retentionRisk,
    retentionFactors:  result.mentorProfile.retentionFactors,
    churnSignals:      result.mentorProfile.churnSignals,
    upsellReady:       result.mentorProfile.upsellReady,
    upsellProduct:     result.mentorProfile.upsellProduct,
    upsellTiming:      result.mentorProfile.upsellTiming,
    upsellReasoning:   result.mentorProfile.upsellReasoning,
    offerShownAt:      result.mentorProfile.offerShownAt ?? null,
    nextMessageTone:   result.mentorProfile.nextMessageTone,
    triggerForContact: result.mentorProfile.triggerForContact,
    recommendedOffer:  result.mentorProfile.recommendedOffer,
    systemNotes:       result.mentorProfile.systemNotes,
  }

  const existing = await prisma.mentorWeeklyProfile.findFirst({
    where: {
      userId:    profileData.userId,
      weekStart: profileData.weekStart,
    },
    select: { id: true },
  })

  if (existing) {
    await prisma.mentorWeeklyProfile.update({
      where: { id: existing.id },
      data:  profileData,
    })
  } else {
    await prisma.mentorWeeklyProfile.create({ data: profileData })
  }

  const reportData = {
    productId,
    userId: result.userReport.userId,
    weekStart: result.userReport.weekStart,
    weekEnd: result.userReport.weekEnd,
    overallScore: result.userReport.overallScore,
    completionRate: result.userReport.completionRate,
    streakDays: result.userReport.streakDays,
    topInsights: result.userReport.topInsights,
    growthAreas: result.userReport.growthAreas,
    struggleAreas: result.userReport.struggleAreas,
    wheelDelta: result.userReport.wheelDelta,
    summaryText: result.userReport.summaryText,
    motivationText: result.userReport.motivationText,
    nextWeekFocus: result.userReport.nextWeekFocus,
    nextWeekTasks: result.userReport.nextWeekTasks,
    metrics: {
      sessions: result.metrics.sessions,
      reflections: result.metrics.reflections,
      tasksDone: result.metrics.tasksDone,
      tasksTotal: result.metrics.tasksTotal,
      wheels: result.metrics.wheels,
      streakDays: result.userReport.streakDays,
      partialTasks: result.userReport.partialTaskCount ?? 0,
      averageTaskProgress: result.userReport.averageTaskProgress ?? null,
      slowProgressTaskCount: result.userReport.slowProgressTaskCount ?? 0,
    },
    analysis: {
      behaviorPattern: result.mentorProfile.behaviorPattern,
      engagementRhythm: result.mentorProfile.engagementRhythm,
      mainPainThisWeek: result.mentorProfile.mainPainThisWeek,
      emotionalTone: result.mentorProfile.emotionalTone,
      retentionRisk: result.mentorProfile.retentionRisk,
      retentionFactors: result.mentorProfile.retentionFactors,
      churnSignals: result.mentorProfile.churnSignals,
      upsellReady: result.mentorProfile.upsellReady,
      upsellProduct: result.mentorProfile.upsellProduct,
      upsellTiming: result.mentorProfile.upsellTiming,
      upsellReasoning: result.mentorProfile.upsellReasoning,
      recommendedOffer: result.mentorProfile.recommendedOffer,
      systemNotes: result.mentorProfile.systemNotes,
      microTaskProgress: {
        partialTaskCount: result.userReport.partialTaskCount ?? 0,
        averageTaskProgress: result.userReport.averageTaskProgress ?? null,
        slowProgressTaskCount: result.userReport.slowProgressTaskCount ?? 0,
      },
    },
    heroVariants: [],
    adTexts: {
      facebook: '',
      instagram_caption: '',
      tiktok_hook: '',
      stories: '',
      reels_script: '',
    },
  }

  const existingWeeklyReport = await prisma.weeklyReport.findFirst({
    where: {
      userId: result.userReport.userId,
      weekStart: result.userReport.weekStart,
    },
    select: { id: true },
  })

  if (existingWeeklyReport) {
    await prisma.weeklyReport.update({
      where: { id: existingWeeklyReport.id },
      data: reportData,
    })
    await invalidateWeeklyReportCache(result.userReport.userId, result.userReport.weekStart, existingWeeklyReport.id)
  } else {
    const createdWeeklyReport = await prisma.weeklyReport.create({ data: reportData })
    await invalidateWeeklyReportCache(result.userReport.userId, result.userReport.weekStart, createdWeeklyReport.id)
  }
}

// ── 5. Головна функція (викликається з scheduler) ────────────
export async function runWeeklyAnalysis(
  userId: string,
): Promise<WeeklyAnalysisResult | null> {

  const weekEnd   = new Date()
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekStart.getDate() - 7)

  try {
    logger.info(`[WeeklyAnalysis] start userId=${userId}`)

    const rawData      = await collectWeeklyData(userId, weekStart, weekEnd)

    const shouldUseFallback = rawData.dailyCycles.length < 2 && rawData.mentorMessages.length < 2
    let userReport = buildFallbackUserReport(rawData)

    if (!shouldUseFallback) {
      try {
        userReport = await generateUserReport(rawData)
      } catch (error) {
        logger.warn(`[WeeklyAnalysis] user report AI failed, using fallback userId=${userId}`, error)
      }
    }

    userReport = applyPausedReportFraming(rawData, userReport)

    let profile = buildFallbackMentorProfile(rawData, userReport)

    if (!shouldUseFallback) {
      try {
        profile = await generateMentorProfile(rawData, userReport)
      } catch (error) {
        logger.warn(`[WeeklyAnalysis] mentor profile AI failed, using fallback userId=${userId}`, error)
      }
    }

    const suggestion = await suggestNextProduct(userId).catch((error) => {
      logger.warn(`[WeeklyAnalysis] next product suggestion failed, using fallback userId=${userId}`, error)
      return null
    })

    const offerMap: Record<string, string> = {
      '5points': '🧭 Знайти свої точки опори',
      'trial': '✨ Спробувати 7 днів',
      'subscription': '🚀 Отримати повний доступ',
      'mentorship': '💬 Записатись на наставництво',
    }

    const upsellMap: Record<string, string> = {
      '5points': '5points',
      'trial': 'trial',
      'subscription': 'subscription',
      'mentorship': 'mentorship',
    }

    if (suggestion) {
      profile.recommendedOffer = offerMap[suggestion] ?? profile.recommendedOffer
      profile.upsellProduct = upsellMap[suggestion] ?? profile.upsellProduct
      profile.upsellReady = true
    }

    const result: WeeklyAnalysisResult = {
      userReport,
      mentorProfile: profile,
      metrics: {
        sessions: rawData.sessionCount,
        reflections: rawData.reflectionCount,
        tasksDone: rawData.microTasks.filter(task => task.completed).length,
        tasksTotal: rawData.microTasks.length,
        wheels: rawData.wheelCheckins,
      },
    }

    await saveResults(result)
    await storeWeeklySocialProofArtifacts({
      userId: result.userReport.userId,
      weekStart: result.userReport.weekStart,
      weekEnd: result.userReport.weekEnd,
      userReport: {
        summaryText: result.userReport.summaryText,
        topInsights: result.userReport.topInsights,
        nextWeekFocus: result.userReport.nextWeekFocus,
        nextWeekTasks: result.userReport.nextWeekTasks,
        completionRate: result.userReport.completionRate,
        streakDays: result.userReport.streakDays,
        growthAreas: result.userReport.growthAreas,
        struggleAreas: result.userReport.struggleAreas,
      },
      mentorProfile: {
        behaviorPattern: result.mentorProfile.behaviorPattern,
        mainPainThisWeek: result.mentorProfile.mainPainThisWeek,
        emotionalTone: result.mentorProfile.emotionalTone,
        retentionRisk: result.mentorProfile.retentionRisk,
        retentionFactors: result.mentorProfile.retentionFactors,
        churnSignals: result.mentorProfile.churnSignals,
        upsellReady: result.mentorProfile.upsellReady,
        upsellProduct: result.mentorProfile.upsellProduct,
        upsellTiming: result.mentorProfile.upsellTiming,
        upsellReasoning: result.mentorProfile.upsellReasoning,
        recommendedOffer: result.mentorProfile.recommendedOffer,
        systemNotes: result.mentorProfile.systemNotes,
      },
      zoomTranscripts: rawData.zoomTranscripts,
    })

    logger.info(`[WeeklyAnalysis] done userId=${userId} retention=${profile.retentionRisk}`)
    return result

  } catch (err) {
    logger.error(`[WeeklyAnalysis] error userId=${userId}`, err)
    return null
  }
}

// ── 6. Запуск для всіх активних юзерів (з scheduler) ─────────
export async function runWeeklyAnalysisForAll(): Promise<void> {
  const activeUsers = await prisma.user.findMany({
    where: {
      subscriptions: {
        some: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
      },
    },
    select: { id: true },
  })

  logger.info(`[WeeklyAnalysis] processing ${activeUsers.length} users`)

  // По черзі щоб не спалити rate limit OpenAI
  for (const user of activeUsers) {
    await runWeeklyAnalysis(user.id)
    await new Promise(r => setTimeout(r, 1500))  // 1.5s між запитами
  }

  logger.info('[WeeklyAnalysis] all done')
}
