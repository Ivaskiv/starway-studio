import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { openai } from '../../lib/openai.js'
import { sendDedupedTelegramMessage } from '../../lib/telegram.js'
import { runGuardedAiTask, stableHash } from '../../services/aiGuard.service.js'

type WheelScores = Record<string, number>

type GeneratedGoal = {
  title: string
  description: string
  actions: string[]
  targetMonth: number
}

type GeneratedMonth = {
  month: number
  focus: string
  actions: string[]
  goalIndexes: number[]
}

type GeneratedWebMapPayload = {
  identityStatement: string
  mainGoalIndex: number
  goals: GeneratedGoal[]
  months: GeneratedMonth[]
}

type MonthlyAnalysisPayload = {
  onTrackGoals: string[]
  behindGoals: string[]
  avoidancePattern: string
  keyInsight: string
  mainRecommendation: string
  nextMonthPlan: {
    focus: string
    actions: string[]
    goalIds: string[]
  }
}

type StrategyMapWithRelations = Prisma.AnnualStrategyMapGetPayload<{
  include: {
    goals: true
    monthlyReviews: true
  }
}>

export type WebMapMonth = {
  id: string
  month: number
  year: number
  focus: string | null
  actions: string[]
  goalIds: string[]
  status: string
  aiAnalysis: string | null
  doneActions: string[]
  missedActions: string[]
  nextMonthRec: string | null
  completedActions: string[]
  skippedActions: string[]
}

export type WebMapGoal = {
  id: string
  order: number
  isMain: boolean
  sphere: string
  title: string
  description: string | null
  actions: string[]
  progress: number
  status: string
  targetMonth: number | null
  priority: number
}

export type WebMap = {
  id: string
  userId: string
  year: number
  vision: string | null
  identityStatement: string | null
  mainGoalId: string | null
  status: string
  goals: WebMapGoal[]
  months: WebMapMonth[]
}

type TelegramButton = {
  label: string
  url: string
}

const WEB_MAP_DASHBOARD_PATH = '/dashboard/vision'

function stripJsonFences(value: string): string {
  return value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
}

function parseJsonObject<T>(raw: string): T {
  return JSON.parse(stripJsonFences(raw)) as T
}

function isGeneratedGoal(value: unknown): value is GeneratedGoal {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.title === 'string'
    && typeof candidate.description === 'string'
    && Array.isArray(candidate.actions)
    && candidate.actions.every(item => typeof item === 'string')
    && typeof candidate.targetMonth === 'number'
  )
}

function isGeneratedMonth(value: unknown): value is GeneratedMonth {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.month === 'number'
    && typeof candidate.focus === 'string'
    && Array.isArray(candidate.actions)
    && candidate.actions.every(item => typeof item === 'string')
    && Array.isArray(candidate.goalIndexes)
    && candidate.goalIndexes.every(item => typeof item === 'number')
  )
}

function validateGeneratedWebMap(value: unknown): value is GeneratedWebMapPayload {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.identityStatement === 'string'
    && typeof candidate.mainGoalIndex === 'number'
    && Array.isArray(candidate.goals)
    && candidate.goals.length === 5
    && candidate.goals.every(isGeneratedGoal)
    && Array.isArray(candidate.months)
    && candidate.months.length === 3
    && candidate.months.every(isGeneratedMonth)
  )
}

function validateMonthlyAnalysis(value: unknown): value is MonthlyAnalysisPayload {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  if (
    !Array.isArray(candidate.onTrackGoals)
    || !candidate.onTrackGoals.every(item => typeof item === 'string')
    || !Array.isArray(candidate.behindGoals)
    || !candidate.behindGoals.every(item => typeof item === 'string')
    || typeof candidate.avoidancePattern !== 'string'
    || typeof candidate.keyInsight !== 'string'
    || typeof candidate.mainRecommendation !== 'string'
    || !candidate.nextMonthPlan
    || typeof candidate.nextMonthPlan !== 'object'
  ) {
    return false
  }

  const nextMonthPlan = candidate.nextMonthPlan as Record<string, unknown>
  return (
    typeof nextMonthPlan.focus === 'string'
    && Array.isArray(nextMonthPlan.actions)
    && nextMonthPlan.actions.every(item => typeof item === 'string')
    && Array.isArray(nextMonthPlan.goalIds)
    && nextMonthPlan.goalIds.every(item => typeof item === 'string')
  )
}

function toWebMap(map: StrategyMapWithRelations): WebMap {
  return {
    id: map.id,
    userId: map.userId,
    year: map.year,
    vision: map.vision,
    identityStatement: map.identityStatement,
    mainGoalId: map.mainGoalId,
    status: map.status,
    goals: map.goals.map(goal => ({
      id: goal.id,
      order: goal.order,
      isMain: goal.isMain,
      sphere: goal.sphere,
      title: goal.title,
      description: goal.description,
      actions: goal.actions,
      progress: goal.progress,
      status: goal.status,
      targetMonth: goal.targetMonth,
      priority: goal.priority,
    })),
    months: map.monthlyReviews.map(month => ({
      id: month.id,
      month: month.month,
      year: month.year,
      focus: month.focus,
      actions: month.actions,
      goalIds: month.goalIds,
      status: month.status,
      aiAnalysis: month.aiAnalysis,
      doneActions: month.doneActions,
      missedActions: month.missedActions,
      nextMonthRec: month.nextMonthRec,
      completedActions: month.completedActions,
      skippedActions: month.skippedActions,
    })),
  }
}

async function getMapRecord(userId: string): Promise<StrategyMapWithRelations> {
  return prisma.annualStrategyMap.findUniqueOrThrow({
    where: { userId },
    include: {
      goals: { orderBy: { order: 'asc' } },
      monthlyReviews: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
    },
  })
}

async function sendTelegramNotification(
  userId: string,
  payload: { text: string; buttons?: TelegramButton[] },
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramEnabled: true,
    },
  })

  if (!user?.telegramChatId || user.telegramEnabled === false) {
    return
  }

  const options = payload.buttons && payload.buttons.length > 0
    ? {
        reply_markup: {
          inline_keyboard: [
            payload.buttons.map(button => ({
              text: button.label,
              url: button.url,
            })),
          ],
        },
      }
    : undefined

  await sendDedupedTelegramMessage(user.telegramChatId, payload.text, options).catch(error => {
    console.error('[web-map] telegram notification failed', {
      userId,
      error: error instanceof Error ? error.message : 'unknown_error',
    })
  })
}

function resolveSphere(index: number, weakAreas: string[]): string {
  return weakAreas[index] ?? weakAreas[weakAreas.length - 1] ?? 'Фокус'
}

function getMonthLabel(month: number): string {
  return [
    '',
    'Січень',
    'Лютий',
    'Березень',
    'Квітень',
    'Травень',
    'Червень',
    'Липень',
    'Серпень',
    'Вересень',
    'Жовтень',
    'Листопад',
    'Грудень',
  ][month] ?? `${month}`
}

export async function getWebMap(userId: string): Promise<WebMap | null> {
  const map = await prisma.annualStrategyMap.findUnique({
    where: { userId },
    include: {
      goals: { orderBy: { order: 'asc' } },
      monthlyReviews: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
    },
  })

  return map ? toWebMap(map) : null
}

export async function createWebMapFromAI(userId: string, wheelScores: WheelScores): Promise<WebMap> {
  const existingMap = await prisma.annualStrategyMap.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (existingMap) {
    throw new Error('WEB_MAP_EXISTS')
  }

  const currentYear = new Date().getFullYear()
  const weakAreas = Object.entries(wheelScores)
    .filter(([, value]) => value < 7)
    .sort(([, left], [, right]) => left - right)
    .slice(0, 3)
    .map(([key]) => key)

  const rawContent = await runGuardedAiTask(
    {
      userId,
      source: 'web-map-generate',
      label: 'web-map-generate',
      payloadHash: stableHash({ currentYear, wheelScores, weakAreas }),
      throttleMs: 1000,
      duplicateWindowMs: 3000,
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              'Ти — AI-коуч платформи Starway. Допомагаєш користувачу сформувати WEB-Карту року за методом Nadya Starway. ' +
              'Тон: прямий, по-дорослому, без мотиваційних фраз. Мова: українська. ' +
              'Відповідай ТІЛЬКИ валідним JSON без markdown і без коментарів.',
          },
          {
            role: 'user',
            content:
              `Колесо балансу: ${JSON.stringify(wheelScores)}\n` +
              `Найслабші сфери: ${weakAreas.join(', ')}\n` +
              `Рік: ${currentYear}\n\n` +
              'Сформуй WEB-Карту року:\n' +
              `1. identityStatement — хто людина в кінці ${currentYear}, сформульовано як факт (без "хочу")\n` +
              '2. 5 вимірювальних цілей, перша — головна (тягне за собою інші)\n' +
              '3. Для кожної цілі: 3-5 напрямів дій (не кроків, не дедлайнів)\n' +
              '4. targetMonth для кожної цілі (1-12)\n' +
              '5. Місячні орієнтири на місяці 1-3: focus (один рядок) + 2-3 дії + goalIndexes\n\n' +
              'Поверни JSON:\n' +
              "{\n" +
              "  \"identityStatement\": \"string\",\n" +
              "  \"mainGoalIndex\": 0,\n" +
              "  \"goals\": [{ \"title\": \"string\", \"description\": \"string\", \"actions\": [\"string\"], \"targetMonth\": 1 }],\n" +
              "  \"months\": [{ \"month\": 1, \"focus\": \"string\", \"actions\": [\"string\"], \"goalIndexes\": [0] }]\n" +
              '}',
          },
        ],
      })

      return completion.choices[0]?.message?.content?.trim() ?? ''
    },
    () => {
      throw new Error('AI_GENERATION_SKIPPED')
    },
  )
  const parsed = parseJsonObject<unknown>(rawContent)

  if (!validateGeneratedWebMap(parsed) || parsed.mainGoalIndex < 0 || parsed.mainGoalIndex > 4) {
    throw new Error('AI_PARSE_ERROR')
  }

  await prisma.$transaction(async tx => {
    const map = await tx.annualStrategyMap.create({
      data: {
        userId,
        year: currentYear,
        identityStatement: parsed.identityStatement,
        status: 'active',
      },
    })

    const createdGoals = await Promise.all(
      parsed.goals.map((goal, index) =>
        tx.strategyGoal.create({
          data: {
            mapId: map.id,
            sphere: resolveSphere(index, weakAreas),
            order: index + 1,
            isMain: index === parsed.mainGoalIndex,
            title: goal.title,
            description: goal.description,
            actions: goal.actions,
            monthlyActions: [],
            progress: 0,
            status: 'active',
            targetMonth: goal.targetMonth,
          },
        }),
      ),
    )

    await Promise.all(
      parsed.months.map(month =>
        tx.monthlyStrategyReview.create({
          data: {
            mapId: map.id,
            month: month.month,
            year: currentYear,
            focus: month.focus,
            actions: month.actions,
            goalIds: month.goalIndexes
              .map(index => createdGoals[index]?.id)
              .filter((goalId): goalId is string => Boolean(goalId)),
            status: month.month === new Date().getMonth() + 1 ? 'active' : 'planned',
          },
        }),
      ),
    )

    const mainGoal = createdGoals.find(goal => goal.isMain)
    if (mainGoal) {
      await tx.annualStrategyMap.update({
        where: { id: map.id },
        data: { mainGoalId: mainGoal.id },
      })
    }
  })

  return getMap(userId)
}

async function getMap(userId: string): Promise<WebMap> {
  const map = await getMapRecord(userId)
  return toWebMap(map)
}

export async function updateGoalProgress(goalId: string, progress: number, status?: string): Promise<WebMapGoal> {
  const goal = await prisma.strategyGoal.update({
    where: { id: goalId },
    data: {
      progress,
      ...(status ? { status } : {}),
    },
  })

  return {
    id: goal.id,
    order: goal.order,
    isMain: goal.isMain,
    sphere: goal.sphere,
    title: goal.title,
    description: goal.description,
    actions: goal.actions,
    progress: goal.progress,
    status: goal.status,
    targetMonth: goal.targetMonth,
    priority: goal.priority,
  }
}

export async function runMonthlyAnalysis(userId: string): Promise<WebMapMonth | null> {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const map = await prisma.annualStrategyMap.findUnique({
    where: { userId },
    include: {
      goals: { orderBy: { order: 'asc' } },
      monthlyReviews: {
        where: { month, year },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!map || map.status === 'draft') {
    return null
  }

  const currentMonthPlan = map.monthlyReviews[0]
  if (!currentMonthPlan) {
    return null
  }

  if (currentMonthPlan.aiAnalysis) {
    return {
      id: currentMonthPlan.id,
      month: currentMonthPlan.month,
      year: currentMonthPlan.year,
      focus: currentMonthPlan.focus,
      actions: currentMonthPlan.actions,
      goalIds: currentMonthPlan.goalIds,
      status: currentMonthPlan.status,
      aiAnalysis: currentMonthPlan.aiAnalysis,
      doneActions: currentMonthPlan.doneActions,
      missedActions: currentMonthPlan.missedActions,
      nextMonthRec: currentMonthPlan.nextMonthRec,
      completedActions: currentMonthPlan.completedActions,
      skippedActions: currentMonthPlan.skippedActions,
    }
  }

  const monthStart = new Date(year, month - 1, 1)
  const [cycleStat, microTasks] = await Promise.all([
    prisma.dailyEntry.findMany({
      where: {
        userId,
        createdAt: { gte: monthStart },
      },
      select: {
        id: true,
        status: true,
      },
    }),
    prisma.microTask.findMany({
      where: {
        userId,
        createdAt: { gte: monthStart },
      },
      select: {
        id: true,
        title: true,
        status: true,
        isCompleted: true,
      },
    }),
  ])

  const rawContent = await runGuardedAiTask(
    {
      userId,
      source: 'web-map-monthly-analysis',
      label: 'web-map-monthly-analysis',
      payloadHash: stableHash({
        mapId: map.id,
        month,
        year,
        goals: map.goals.map(goal => ({ id: goal.id, progress: goal.progress, status: goal.status })),
        monthPlanId: currentMonthPlan.id,
        microTasks: microTasks.map(task => ({ id: task.id, status: task.status, done: task.isCompleted })),
        cycleStatuses: cycleStat.map(entry => entry.status),
      }),
      throttleMs: 1000,
      duplicateWindowMs: 5000,
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1000,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content:
              'Ти — AI-коуч Starway. Роби щомісячний аналіз прогресу по WEB-Карті. ' +
              'Тон: прямий, без жаління. Якщо людина філонить — скажи чесно. ' +
              'Назви конкретні цілі і дії, не абстракції. Мова: українська. ' +
              'Відповідай ТІЛЬКИ валідним JSON без markdown.',
          },
          {
            role: 'user',
            content:
              `Цілі: ${JSON.stringify(map.goals.map(goal => ({ id: goal.id, title: goal.title, progress: goal.progress, status: goal.status })))}\n` +
              `План місяця ${month}: ${JSON.stringify(currentMonthPlan)}\n` +
              `Щоденних циклів завершено: ${cycleStat.filter(entry => entry.status === 'COMPLETED' || entry.status === 'COMPLETED_LATE').length}\n` +
              `Мікрозавдання: ${JSON.stringify(microTasks.map(task => ({ id: task.id, title: task.title, status: task.status, done: task.isCompleted })))}\n` +
              `Поточний місяць: ${month}/${year}\n\n` +
              'Поверни JSON:\n' +
              "{\n" +
              "  \"onTrackGoals\": [\"goalId\"],\n" +
              "  \"behindGoals\": [\"goalId\"],\n" +
              "  \"avoidancePattern\": \"string\",\n" +
              "  \"keyInsight\": \"string — 1 речення\",\n" +
              "  \"mainRecommendation\": \"string\",\n" +
              "  \"nextMonthPlan\": { \"focus\": \"string\", \"actions\": [\"string\"], \"goalIds\": [\"id\"] }\n" +
              '}',
          },
        ],
      })

      return completion.choices[0]?.message?.content?.trim() ?? ''
    },
    () => {
      throw new Error('AI_ANALYSIS_SKIPPED')
    },
  )
  const parsed = parseJsonObject<unknown>(rawContent)

  if (!validateMonthlyAnalysis(parsed)) {
    throw new Error('AI_PARSE_ERROR')
  }

  await prisma.monthlyStrategyReview.update({
    where: { id: currentMonthPlan.id },
    data: {
      aiAnalysis: parsed.mainRecommendation,
      doneActions: parsed.onTrackGoals,
      missedActions: parsed.behindGoals,
      nextMonthRec: parsed.keyInsight,
      completedActions: parsed.onTrackGoals,
      skippedActions: parsed.behindGoals,
      status: 'done',
    },
  })

  if (parsed.onTrackGoals.length > 0) {
    await prisma.strategyGoal.updateMany({
      where: { id: { in: parsed.onTrackGoals } },
      data: { status: 'on_track' },
    })
  }

  if (parsed.behindGoals.length > 0) {
    await prisma.strategyGoal.updateMany({
      where: { id: { in: parsed.behindGoals } },
      data: { status: 'behind' },
    })
  }

  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  await prisma.monthlyStrategyReview.upsert({
    where: {
      mapId_month_year: {
        mapId: map.id,
        month: nextMonth,
        year: nextYear,
      },
    },
    create: {
      mapId: map.id,
      month: nextMonth,
      year: nextYear,
      focus: parsed.nextMonthPlan.focus,
      actions: parsed.nextMonthPlan.actions,
      goalIds: parsed.nextMonthPlan.goalIds,
      status: 'planned',
    },
    update: {},
  })

  await sendTelegramNotification(userId, {
    text: `Місяць ${getMonthLabel(month)} завершено. ${parsed.keyInsight}`,
    buttons: [
      {
        label: 'Повний аналіз',
        url: `${process.env.WEBAPP_URL}${WEB_MAP_DASHBOARD_PATH}?tab=analysis`,
      },
      {
        label: `План на ${getMonthLabel(nextMonth)}`,
        url: `${process.env.WEBAPP_URL}${WEB_MAP_DASHBOARD_PATH}?tab=coach`,
      },
    ],
  })

  const updatedMonth = await prisma.monthlyStrategyReview.findUniqueOrThrow({
    where: { id: currentMonthPlan.id },
  })

  return {
    id: updatedMonth.id,
    month: updatedMonth.month,
    year: updatedMonth.year,
    focus: updatedMonth.focus,
    actions: updatedMonth.actions,
    goalIds: updatedMonth.goalIds,
    status: updatedMonth.status,
    aiAnalysis: updatedMonth.aiAnalysis,
    doneActions: updatedMonth.doneActions,
    missedActions: updatedMonth.missedActions,
    nextMonthRec: updatedMonth.nextMonthRec,
    completedActions: updatedMonth.completedActions,
    skippedActions: updatedMonth.skippedActions,
  }
}

export async function getDailyAlignmentQuestion(userId: string): Promise<{ question: string; goalId: string } | null> {
  const map = await prisma.annualStrategyMap.findUnique({
    where: { userId },
    include: {
      goals: {
        where: { isMain: true },
        take: 1,
      },
    },
  })

  if (!map || map.status !== 'active') {
    return null
  }

  const mainGoal = map.goals[0]
  if (!mainGoal) {
    return null
  }

  return {
    question: `Сьогоднішня дія — наскільки вона пов'язана з твоєю головною ціллю 2026?\n${mainGoal.title}`,
    goalId: mainGoal.id,
  }
}
