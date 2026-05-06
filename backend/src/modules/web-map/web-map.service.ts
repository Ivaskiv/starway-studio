import { prisma } from '@starway/db'
import { openai } from '../../lib/openai.js'
import { runGuardedAiTask, stableHash } from '../../services/aiGuard.service.js'
import { sendTelegramNotification } from '@/modules/web-map/notifications/telegram.js'
import { parseVisionSystemContent } from '../vision/system.js'
import { generateWebMapAI } from './ai/generateWebMap.js'
import { buildWebMapDraft, getWeakAreas, type WheelScores } from './utils/webMapFactory.js'

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

function validateMonthlyAnalysis(value: unknown): value is MonthlyAnalysisPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as any

  return (
    Array.isArray(v.onTrackGoals) &&
    Array.isArray(v.behindGoals) &&
    typeof v.avoidancePattern === 'string' &&
    typeof v.keyInsight === 'string' &&
    typeof v.mainRecommendation === 'string' &&
    v.nextMonthPlan &&
    typeof v.nextMonthPlan.focus === 'string' &&
    Array.isArray(v.nextMonthPlan.actions) &&
    Array.isArray(v.nextMonthPlan.goalIds)
  )
}

function getMonthLabel(month: number): string {
  return [
    '',
    'Січень','Лютий','Березень','Квітень','Травень','Червень',
    'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'
  ][month] ?? `${month}`
}

function isMissingWebMapColumn(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; meta?: { column?: string } }
  return candidate.code === 'P2022' && String(candidate.meta?.column ?? '').startsWith('AnnualStrategyMap.')
}

function parseGoalDescriptionPayload(value: string | null | undefined) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : value,
      factors: Array.isArray(parsed.factors) ? parsed.factors.filter((item): item is string => typeof item === 'string') : [],
      resources: Array.isArray(parsed.resources) ? parsed.resources.filter((item): item is string => typeof item === 'string') : [],
      constraints: Array.isArray(parsed.constraints) ? parsed.constraints.filter((item): item is string => typeof item === 'string') : [],
      solutions: Array.isArray(parsed.solutions) ? parsed.solutions.filter((item): item is string => typeof item === 'string') : [],
      scoreFrom: typeof parsed.scoreFrom === 'number' ? parsed.scoreFrom : null,
      scoreTo: typeof parsed.scoreTo === 'number' ? parsed.scoreTo : null,
      timeframeMonths: typeof parsed.timeframeMonths === 'number' ? parsed.timeframeMonths : null,
    }
  } catch {
    return {
      summary: value,
      factors: [],
      resources: [],
      constraints: [],
      solutions: [],
      scoreFrom: null,
      scoreTo: null,
      timeframeMonths: null,
    }
  }
}

async function getVisionSystemForMap(userId: string) {
  const latestVision = await prisma.visionStatement.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { content: true },
  })

  return parseVisionSystemContent(latestVision?.content ?? null)
}

export async function getWebMap(userId: string) {
  const system = await getVisionSystemForMap(userId)

  try {
    const map = await prisma.annualStrategyMap.findUnique({
      where: { userId },
      include: {
        goals: { orderBy: { priority: 'asc' } },
        monthlyReviews: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 12 },
      },
    })

    if (!map) return null

    const mainGoal = system?.goals.find((goal) => goal.sphere === system.mainGoalSphere) ?? system?.goals[0] ?? null

    return {
      ...map,
      identityStatement: system?.identityStatement ?? null,
      mainGoalId: map.goals.find((goal) => goal.sphere === mainGoal?.sphere)?.id ?? null,
      system: system ?? null,
      status: map.goals.length ? 'active' : 'draft',
      goals: map.goals.map((goal, index) => ({
        ...goal,
        monthlyActions: Array.isArray(goal.monthlyActions)
          ? goal.monthlyActions.filter((item): item is string => typeof item === 'string')
          : [],
        order: index,
        isMain: index === 0,
        actions: Array.isArray(goal.monthlyActions)
          ? goal.monthlyActions.filter((item): item is string => typeof item === 'string')
          : [],
        progress: 0,
        status: 'active',
        targetMonth: null,
        description: parseGoalDescriptionPayload(goal.description)?.summary ?? goal.description,
        factors: parseGoalDescriptionPayload(goal.description)?.factors ?? [],
        resources: parseGoalDescriptionPayload(goal.description)?.resources ?? [],
        constraints: parseGoalDescriptionPayload(goal.description)?.constraints ?? [],
        solutions: parseGoalDescriptionPayload(goal.description)?.solutions ?? [],
        scoreFrom: parseGoalDescriptionPayload(goal.description)?.scoreFrom ?? null,
        scoreTo: parseGoalDescriptionPayload(goal.description)?.scoreTo ?? null,
        timeframeMonths: parseGoalDescriptionPayload(goal.description)?.timeframeMonths ?? null,
      })),
      monthlyReviews: map.monthlyReviews.map((month) => ({
        ...month,
        focus: null,
        actions: [],
        goalIds: [],
        status: 'planned',
        doneActions: [],
        missedActions: [],
        nextMonthRec: null,
      })),
    }
  } catch (error) {
    if (!isMissingWebMapColumn(error)) throw error

    const maps = await prisma.$queryRawUnsafe<Array<{ id: string; userId: string; year: number; vision: string | null; createdAt: Date; updatedAt: Date }>>(
      'SELECT "id","userId","year","vision","createdAt","updatedAt" FROM "AnnualStrategyMap" WHERE "userId" = $1 LIMIT 1',
      userId,
    )
    const map = maps[0]
    if (!map) return null

    const [goals, monthlyReviews] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ id: string; sphere: string; title: string; description: string | null; monthlyActions: unknown; priority: number | null }>>(
        'SELECT "id","sphere","title","description","monthlyActions","priority" FROM "StrategyGoal" WHERE "mapId" = $1 ORDER BY "priority" ASC',
        map.id,
      ),
      prisma.$queryRawUnsafe<Array<{ id: string; month: number; year: number; aiAnalysis: string | null; completedActions: string[] | null; skippedActions: string[] | null; nextStepsByAi: unknown }>>(
        'SELECT "id","month","year","aiAnalysis","completedActions","skippedActions","nextStepsByAi" FROM "MonthlyStrategyReview" WHERE "mapId" = $1 ORDER BY "year" DESC, "month" DESC LIMIT 12',
        map.id,
      ),
    ])

    const mainGoal = system?.goals.find((goal) => goal.sphere === system.mainGoalSphere) ?? system?.goals[0] ?? null

    return {
      ...map,
      identityStatement: system?.identityStatement ?? null,
      mainGoalId: goals.find((goal) => goal.sphere === mainGoal?.sphere)?.id ?? null,
      system: system ?? null,
      status: goals.length ? 'active' : 'draft',
      goals: goals.map((goal, index) => ({
        ...goal,
        monthlyActions: Array.isArray(goal.monthlyActions)
          ? goal.monthlyActions.filter((item): item is string => typeof item === 'string')
          : [],
        order: index,
        isMain: index === 0,
        actions: Array.isArray(goal.monthlyActions)
          ? goal.monthlyActions.filter((item): item is string => typeof item === 'string')
          : [],
        progress: 0,
        status: 'active',
        targetMonth: null,
        description: parseGoalDescriptionPayload(goal.description)?.summary ?? goal.description,
        factors: parseGoalDescriptionPayload(goal.description)?.factors ?? [],
        resources: parseGoalDescriptionPayload(goal.description)?.resources ?? [],
        constraints: parseGoalDescriptionPayload(goal.description)?.constraints ?? [],
        solutions: parseGoalDescriptionPayload(goal.description)?.solutions ?? [],
        scoreFrom: parseGoalDescriptionPayload(goal.description)?.scoreFrom ?? null,
        scoreTo: parseGoalDescriptionPayload(goal.description)?.scoreTo ?? null,
        timeframeMonths: parseGoalDescriptionPayload(goal.description)?.timeframeMonths ?? null,
      })),
      monthlyReviews: monthlyReviews.map((month) => ({
        ...month,
        focus: null,
        actions: [],
        goalIds: [],
        status: 'planned',
        doneActions: [],
        missedActions: [],
        nextMonthRec: null,
      })),
    }
  }
}

export async function createWebMapFromAI(userId: string, wheelScores: WheelScores) {
  const existing = await prisma.annualStrategyMap.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (existing) {
    throw new Error('WEB_MAP_EXISTS')
  }

  const year = new Date().getFullYear()
  const weakAreas = getWeakAreas(wheelScores)
  const raw = await generateWebMapAI({ wheelScores, weakAreas, year }).catch(() => '')
  const draft = buildWebMapDraft(raw, weakAreas)

  return prisma.annualStrategyMap.create({
    data: {
      userId,
      year,
      status: 'active',
      vision: draft.vision,
      identityStatement: draft.identityStatement,
      goals: {
        create: draft.goals.map((goal, index) => ({
          sphere: goal.sphere,
          order: index,
          priority: index,
          isMain: goal.isMain,
          title: goal.title,
          description: goal.description,
          actions: goal.actions,
          monthlyActions: goal.actions,
          status: 'active',
        })),
      },
    },
    include: {
      goals: { orderBy: { order: 'asc' } },
      monthlyReviews: true,
    },
  })
}

export async function updateGoalProgress(goalId: string, progress: number, status?: string) {
  return prisma.strategyGoal.update({
    where: { id: goalId },
    data: {
      progress: Math.max(0, Math.min(100, Math.round(progress))),
      ...(status ? { status } : {}),
    },
  })
}

export async function getDailyAlignmentQuestion(userId: string) {
  const map = await getWebMap(userId)
  const primaryGoal = map?.goals[0]
  if (!primaryGoal) {
    return {
      prompt: 'Яка одна дія сьогодні найкраще підтримає твій головний напрям?',
      goalId: null,
      sphere: null,
    }
  }

  return {
    prompt: map?.system?.dailyCycle.prompt ?? `Яка одна дія сьогодні реально зрушить ціль "${primaryGoal.title}"?`,
    goalId: primaryGoal.id,
    sphere: primaryGoal.sphere,
    trackedNodeIds: map?.system?.dailyCycle.trackedNodeIds ?? [],
    primaryNodeId: map?.system?.dailyCycle.primaryNodeId ?? null,
  }
}

export async function runMonthlyAnalysis(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const map = await prisma.annualStrategyMap.findUnique({
    where: { userId },
    include: {
      goals: { orderBy: { order: 'asc' } },
      monthlyReviews: {
        where: { month, year },
        take: 1,
      },
    },
  })

  if (!map || map.status === 'draft') return null

  const current = map.monthlyReviews[0]
  if (!current) return null

  if (current.aiAnalysis) return current

  const raw = await runGuardedAiTask(
    {
      userId,
      source: 'monthly-analysis',
      label: 'monthly-analysis',
      payloadHash: stableHash({
        mapId: map.id,
        month,
        year,
      }),
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.4,
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content:
              'Ти — AI-коуч. Жорсткий аналіз без води. Тільки JSON.',
          },
          {
            role: 'user',
            content: `Місяць ${month}/${year}`,
          },
        ],
      })

      return completion.choices[0]?.message?.content ?? ''
    },
    () => {
      throw new Error('AI_FALLBACK_REQUIRED')
    }
  )

  const parsed = JSON.parse(raw)

  if (!validateMonthlyAnalysis(parsed)) {
    throw new Error('INVALID_AI_RESPONSE')
  }

  await prisma.monthlyStrategyReview.update({
    where: { id: current.id },
    data: {
      aiAnalysis: parsed.mainRecommendation,
      doneActions: parsed.onTrackGoals,
      missedActions: parsed.behindGoals,
      nextMonthRec: parsed.keyInsight,
      status: 'done',
    },
  })

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

  await sendTelegramNotification(
    userId,
    `Місяць ${getMonthLabel(month)} завершено. ${parsed.keyInsight}`,
    [
      {
        label: 'Повний аналіз',
        url: `${process.env.WEBAPP_URL}/dashboard/vision?tab=analysis`,
      },
      {
        label: `План на ${getMonthLabel(nextMonth)}`,
        url: `${process.env.WEBAPP_URL}/dashboard/vision?tab=coach`,
      },
    ]
  )

  return prisma.monthlyStrategyReview.findUnique({
    where: { id: current.id },
  })
}
