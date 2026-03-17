import type { Prisma, UserBalanceEntry } from '../../db/generated/prisma/client.js'
import { prisma } from '../../db/client.js'
import { createWheelPDF } from './pdf.js'
import {
  wheelAnalysis,
  lifeDiagnosis,
  personalityProfile,
  trajectoryPrediction,
  actionPlan,
  adaptiveMissions,
} from './ai.js'
import { sendWheelNotification } from './telegram.js'
import { rewardEngine } from '../gamification/reward.engine.js'
import { getProfile, getStreakSummary, getLevelState } from '../gamification/service.js'
import { registerStreakActivity } from '../streak/service.js'
import type {
  WheelAnalytics,
  WheelGamificationSnapshot,
  WheelNotificationPayload,
  WheelPDFData,
  WheelScore,
  WheelScoreMap,
  WheelSphereId,
  WheelUserContext,
  WheelInsights,
  WheelCooldownStatus,
} from './types.js'
import { FIXED_SPHERES, SPHERE_LABELS, WHEEL_SPHERES } from './types.js'

export interface WheelWorkflowOptions {
  userId: string
  expertId: string
  balanceConfigId: string
  scores: WheelScore[]
  userContext: WheelUserContext
}

export interface WheelWorkflowResult {
  entry: UserBalanceEntry
  insights: WheelInsights
  analytics: WheelAnalytics
  pdf: Buffer
  pdfUrl: string
  gamification?: WheelGamificationSnapshot
  cooldown: WheelCooldownStatus
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000
const APP_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

const SCORE_ERROR = 'wheel_invalid_spheres_set'

export function validateScores(scores: WheelScore[]) {
  if (scores.length !== FIXED_SPHERES.length) {
    throw new Error(SCORE_ERROR)
  }

  const ids = new Set(scores.map(s => s.categoryId))
  for (const id of FIXED_SPHERES) {
    if (!ids.has(id)) throw new Error(SCORE_ERROR)
  }
}

export function scoresToMap(scores: WheelScore[]): WheelScoreMap {
  return scores.reduce((acc, score) => {
    acc[score.categoryId] = score.score
    return acc
  }, {} as WheelScoreMap)
}

export function scoresFromMap(value: unknown): WheelScore[] {
  if (!value || typeof value !== 'object') return []
  return WHEEL_SPHERES.map(id => ({
    categoryId: id,
    score: Number((value as Record<string, number>)[id]) || 0,
  }))
}

export function findWeakest(scores: WheelScore[]): WheelScore {
  return scores.reduce((min, current) => (current.score < min.score ? current : min))
}

export function findStrongest(scores: WheelScore[]): WheelScore {
  return scores.reduce((max, current) => (current.score > max.score ? current : max))
}

export function findFocus(scores: WheelScore[], weakest: WheelScore): WheelScore {
  const filtered = scores.filter(s => s.categoryId !== weakest.categoryId && s.score >= 7)
  return filtered.sort((a, b) => b.score - a.score)[0] ?? weakest
}

export async function canFillWheel(userId: string): Promise<WheelCooldownStatus> {
  const lastEntry = await prisma.userBalanceEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  if (!lastEntry) return { active: false, remainingMs: 0 }

  const elapsed = Date.now() - lastEntry.createdAt.getTime()
  if (elapsed >= COOLDOWN_MS) return { active: false, remainingMs: 0 }

  return { active: true, remainingMs: COOLDOWN_MS - elapsed }
}

export function getLatestWheel(userId: string) {
  return prisma.userBalanceEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export function getWheelHistory(userId: string, limit = 10) {
  return prisma.userBalanceEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getWheelAnalytics(userId: string): Promise<WheelAnalytics> {
  const entries = await getWheelHistory(userId, 30)
  if (!entries.length) {
    const zeroMap = WHEEL_SPHERES.reduce((acc, id) => ({ ...acc, [id]: 0 }), {} as Record<WheelSphereId, number>)
    return {
      totalAssessments: 0,
      averageScores: zeroMap,
      balanceIndex: 0,
      trend: 'stable',
      weakestHistory: [],
    }
  }

  const sum: Record<WheelSphereId, number> = WHEEL_SPHERES.reduce((acc, id) => ({ ...acc, [id]: 0 }), {} as Record<WheelSphereId, number>)
  const weakestHistory: WheelSphereId[] = []
  const focusHistory: WheelSphereId[] = []

  for (const entry of entries) {
    const scores = scoresFromMap(entry.scores)
    scores.forEach(score => {
      sum[score.categoryId] += score.score
    })
    const weakest = findWeakest(scores)
    const focus = findFocus(scores, weakest)
    weakestHistory.push(weakest.categoryId)
    focusHistory.push(focus.categoryId)
  }

  const averageScores: Record<WheelSphereId, number> = WHEEL_SPHERES.reduce((acc, id) => {
    acc[id] = Number((sum[id] / entries.length).toFixed(1))
    return acc
  }, {} as Record<WheelSphereId, number>)

  const balanceIndex = Math.round((Object.values(averageScores).reduce((total, score) => total + score, 0) / (WHEEL_SPHERES.length * 10)) * 100)

  let trend: WheelAnalytics['trend'] = 'stable'
  if (entries.length >= 2) {
    const [latest, previous] = entries
    const avg = (scores: WheelScore[]) => scores.reduce((total, s) => total + s.score, 0) / scores.length
    const diff = avg(scoresFromMap(latest.scores)) - avg(scoresFromMap(previous.scores))
    if (diff > 0.4) trend = 'improving'
    if (diff < -0.4) trend = 'declining'
  }

  const countById = (items: WheelSphereId[]) =>
    items.reduce((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1
      return acc
    }, {} as Record<WheelSphereId, number>)

  const weakestCounts = countById(weakestHistory)
  const focusCounts = countById(focusHistory)
  const pickTop = (counts: Record<WheelSphereId, number>) =>
    (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as WheelSphereId | undefined)

  return {
    totalAssessments: entries.length,
    averageScores,
    balanceIndex,
    trend,
    weakestHistory,
    mostCommonWeakest: pickTop(weakestCounts),
    mostCommonFocus: pickTop(focusCounts),
  }
}

async function gatherGamificationSnapshot(userId: string): Promise<WheelGamificationSnapshot | undefined> {
  try {
    const [profile, streakSummary] = await Promise.all([getProfile(userId), getStreakSummary(userId)])
    return {
      bitMind: profile.bitMind,
      mindXP: profile.mindXP,
      neuroGems: profile.neuroGems,
      level: profile.level,
      levelTitle: profile.levelTitle,
      xpToNextLevel: profile.xpToNextLevel,
      currentStreakDays: profile.currentStreakDays,
      streak: streakSummary,
    }
  } catch (error) {
    console.error('Failed to gather gamification snapshot:', error)
    return undefined
  }
}

function buildNotificationPayload(params: {
  insights: WheelInsights
  scores: WheelScore[]
  weakest: WheelScore
  focus: WheelScore
  pdfUrl: string
  gamification?: WheelGamificationSnapshot
}): WheelNotificationPayload {
  return {
    insights: params.insights,
    weakestSphere: params.weakest.categoryId,
    focusSphere: params.focus.categoryId,
    scores: params.scores,
    pdfUrl: params.pdfUrl,
    gamification: params.gamification,
  }
}

const MICROTASK_TEMPLATES: Record<WheelSphereId, string[]> = {
  money: ['Записати всі витрати сьогодні', 'Перевірити підписки'],
  realization: ['Зробити крок у проєкті', 'Написати план наступного тижня'],
  relationships: ['Написати вдячність близькому', 'Запланувати короткий дзвінок'],
  energy: ['Прогулянка 20 хвилин', 'Приділити увагу сну'],
  freedom: ['Виділити час для улюбленого хобі', 'Запланувати день без нагадувань'],
  innerSupport: ['Записати 3 цінності', 'Скласти список підтримки'],
  health: ['Пити воду кожну годину', 'Розтяжка 10 хвилин'],
  growth: ['Прочитати короткий матеріал', 'Зареєструватися на майстерню'],
}

export async function addWheelMicroTasks(userId: string, weakest: WheelScore) {
  if (!weakest) return
  const templates = MICROTASK_TEMPLATES[weakest.categoryId] ?? []
  if (!templates.length) return

  const levelState = await getLevelState(userId)
  const bonusCount = Math.floor(Math.max(0, levelState.multiplier - 1) * templates.length)
  const bonusTasks = templates.slice(0, bonusCount).map(title => `${title} · Bonus ${levelState.levelTitle}`)

  const microTasks = [...templates, ...bonusTasks].map(title => ({
    userId,
    title,
    description: `Мікрозавдання для сфери ${SPHERE_LABELS[weakest.categoryId]}`,
    status: 'ACTIVE' as const,
    createdAt: new Date(),
  }))

  await prisma.microTask.createMany({ data: microTasks })
}

export async function executeWheelWorkflow(options: WheelWorkflowOptions): Promise<WheelWorkflowResult> {
  const { userId, expertId, balanceConfigId, scores, userContext } = options
  validateScores(scores)
  // cooldown перевіряється в controller перед викликом цієї функції
  const cooldown: WheelCooldownStatus = { active: false, remainingMs: 0 }
  
  const weakest = findWeakest(scores)
  const focus = findFocus(scores, weakest)

  const [analysis, diagnosis, profile, trajectory, plan, missions] = await Promise.all([
    wheelAnalysis(scores, weakest, focus),
    lifeDiagnosis(weakest.categoryId, scores),
    personalityProfile(scores),
    trajectoryPrediction(scores),
    actionPlan(weakest.categoryId),
    adaptiveMissions(weakest.categoryId),
  ])

  const insights: WheelInsights = {
    analysis,
    diagnosis,
    personalityProfile: profile,
    trajectoryPrediction: trajectory,
    actionPlan: plan,
    adaptiveMissions: missions,
  }

  const entry = await prisma.userBalanceEntry.create({
    data: {
      userId,
      expertId,
      balanceConfigId,
      scores: scoresToMap(scores) as Prisma.InputJsonValue,
      note: analysis,
    },
  })

  const analytics = await getWheelAnalytics(userId)
  const gamification = await gatherGamificationSnapshot(userId)

  const pdfData: WheelPDFData = {
    userName: userContext.name,
    createdAt: entry.createdAt.toISOString(),
    scores,
    weakestSphere: weakest.categoryId,
    focusSphere: focus.categoryId,
    insights,
    gamification,
  }

  const pdf = await createWheelPDF(pdfData)
  const pdfUrl = `${APP_URL}/api/wheel/${entry.id}/pdf`
  const payload = buildNotificationPayload({
    insights,
    scores,
    weakest,
    focus,
    pdfUrl,
    gamification,
  })

  const sideEffects = await Promise.allSettled([
    addWheelMicroTasks(userId, weakest),
    registerStreakActivity(userId, expertId, 'wheel_activity'),
    rewardEngine.onWheelCompleted(userId),
  ])
  for (const sideEffect of sideEffects) {
    if (sideEffect.status === 'rejected') {
      console.error('Wheel side effect error', sideEffect.reason)
    }
  }

  const telegramResult = await sendWheelNotification(userId, entry.id, payload)
  if (!telegramResult.ok) {
    console.error('Telegram notification failed at wheel creation', telegramResult)
  }

  return {
    entry,
    insights,
    analytics,
    pdf,
    pdfUrl,
    gamification,
    cooldown,
  }
}
