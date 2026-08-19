import { prisma } from '../../db/client.js'
import { buildBehavioralAnalyticsSnapshot, validateBehavioralAnalyticsLayer, type BehavioralAnalyticsSnapshot, type BehavioralEventRecord } from './behavioral.js'
import type { AIInsights, FounderAnalytics, FounderFunnelStep, Period } from './types.js'
import { incrementCount, round, safeRate, toRankedCounts, getPeriodRange } from './shared.js'
import { getStringField } from './tracking.utils.js'
import { FOUNDER_FUNNEL, getFounderHeuristic, getTrackingIntegrity } from './tracking.service.js'
import { getRetentionStats } from './overview.service.js'

export async function getAIInsights(period: Period = '30d', limit = 8): Promise<AIInsights> {
  const { start } = getPeriodRange(period)
  const questionEvents = await prisma.event.findMany({
    where: {
      type: 'user_question',
      createdAt: { gte: start },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      payload: true,
    },
  })

  const intents = new Map<string, number>()
  const problems = new Map<string, number>()
  const categories = new Map<string, number>()

  for (const event of questionEvents) {
    const intent = getStringField(event.payload, 'detectedIntent')
    const category = getStringField(event.payload, 'category')
    incrementCount(intents, intent)
    incrementCount(categories, category)

    if (intent === 'support' || intent === 'resistance' || category === 'objection') {
      incrementCount(problems, getStringField(event.payload, 'text'))
    }
  }

  return {
    topIntents: toRankedCounts(intents, limit),
    topProblems: toRankedCounts(problems, limit),
    topCategories: toRankedCounts(categories, limit),
    trackingIntegrity: await getTrackingIntegrity(period),
  }
}

export async function getFounderAnalytics(period: Period = '30d'): Promise<FounderAnalytics> {
  const { start } = getPeriodRange(period)
  const founderTypes = FOUNDER_FUNNEL.map((item) => item.key)
  const [events, allEvents, retention, streakRows] = await Promise.all([
    prisma.event.findMany({
      where: {
        createdAt: { gte: start },
        type: { in: founderTypes },
        userId: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        userId: true,
        type: true,
        source: true,
        createdAt: true,
      },
    }),
    prisma.event.findMany({
      where: {
        createdAt: { gte: start },
        userId: { not: null },
      },
      select: {
        userId: true,
        source: true,
        type: true,
      },
    }),
    getRetentionStats(period),
    prisma.streak.findMany({
      where: { ruleKey: 'daily_checkin' },
      select: { current: true },
    }),
  ])

  const eventsByUser = new Map<string, typeof events>()
  const sourceUsers = {
    web: new Set<string>(),
    miniapp: new Set<string>(),
    telegram: new Set<string>(),
  }

  for (const event of events) {
    if (!event.userId) continue
    const bucket = eventsByUser.get(event.userId) ?? []
    bucket.push(event)
    eventsByUser.set(event.userId, bucket)
  }

  for (const event of allEvents) {
    if (!event.userId) continue
    if (event.source === 'web') sourceUsers.web.add(event.userId)
    if (event.source === 'miniapp') sourceUsers.miniapp.add(event.userId)
    if (event.source === 'telegram') sourceUsers.telegram.add(event.userId)
  }

  const funnel: FounderFunnelStep[] = FOUNDER_FUNNEL.map((step, index) => {
    const stepUsers = new Set(
      events.filter((event) => event.type === step.key).map((event) => String(event.userId))
    )
    const prevUsers = index === 0
      ? stepUsers
      : new Set(
          events.filter((event) => event.type === FOUNDER_FUNNEL[index - 1]?.key).map((event) => String(event.userId))
        )
    const nextKey = FOUNDER_FUNNEL[index + 1]?.key
    const users = stepUsers.size
    const conversionRate = index === 0 ? 100 : safeRate(users, prevUsers.size)
    const nextUsers = nextKey
      ? new Set(events.filter((event) => event.type === nextKey).map((event) => String(event.userId)))
      : new Set<string>()
    const droppedUsers = [...stepUsers].filter((userId) => !nextUsers.has(userId))
    const dropOffRate = nextKey ? safeRate(droppedUsers.length, stepUsers.size) : 0
    const dropDurations = droppedUsers
      .map((userId) => {
        const userEvents = eventsByUser.get(userId) ?? []
        const currentEvent = userEvents.find((event) => event.type === step.key)
        const latestEvent = userEvents[userEvents.length - 1]
        if (!currentEvent || !latestEvent) return null
        return Math.max(0, (latestEvent.createdAt.getTime() - currentEvent.createdAt.getTime()) / 3_600_000)
      })
      .filter((value): value is number => value !== null)
    const avgHoursToNext = dropDurations.length
      ? round(dropDurations.reduce((sum, value) => sum + value, 0) / dropDurations.length)
      : 0
    const lastActionCounts = new Map<string, number>()
    for (const userId of droppedUsers) {
      const userEvents = eventsByUser.get(userId) ?? []
      const latestType = userEvents[userEvents.length - 1]?.type ?? step.key
      incrementCount(lastActionCounts, latestType)
    }
    const lastActionBeforeExit = [...lastActionCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? step.key

    return {
      key: step.key,
      label: step.label,
      users,
      conversionRate,
      dropOffRate,
      avgHoursToNext,
      lastActionBeforeExit,
    }
  })

  const webMapOpenedUsers = new Set(events.filter((event) => event.type === 'founder_web_map_opened').map((event) => String(event.userId)))
  const firstActionUsers = new Set(events.filter((event) => event.type === 'founder_web_map_first_step_completed').map((event) => String(event.userId)))
  const day2Users = new Set(events.filter((event) => event.type === 'founder_day_2_return').map((event) => String(event.userId)))
  const webUsers = sourceUsers.web.size
  const miniAppUsers = sourceUsers.miniapp.size
  const telegramUsers = sourceUsers.telegram.size
  const webOnlyUsers = [...sourceUsers.web].filter((userId) => !sourceUsers.miniapp.has(userId) && !sourceUsers.telegram.has(userId)).length
  const avgStreak = streakRows.length
    ? round(streakRows.reduce((sum, row) => sum + row.current, 0) / streakRows.length)
    : 0
  const actionsPerUser = sourceUsers.web.size || sourceUsers.miniapp.size || sourceUsers.telegram.size
    ? round(allEvents.length / new Set([...sourceUsers.web, ...sourceUsers.miniapp, ...sourceUsers.telegram]).size)
    : 0
  const behaviorHeuristic = getFounderHeuristic(funnel)

  return {
    funnel,
    retention: {
      day1: retention.day1,
      day3: retention.day3,
      avgStreak,
      actionsPerUser,
    },
    behavior: {
      firstActionCompletionRate: safeRate(firstActionUsers.size, webMapOpenedUsers.size),
      stuckUsersRate: safeRate(
        [...webMapOpenedUsers].filter((userId) => !firstActionUsers.has(userId)).length,
        webMapOpenedUsers.size,
      ),
      weakestPoint: behaviorHeuristic.weakestPoint,
      heuristic: behaviorHeuristic.heuristic,
      suggestion: behaviorHeuristic.suggestion,
    },
    channels: {
      webUsers,
      miniAppUsers,
      telegramUsers,
      webOnlyUsers,
      telegramReturnRate: safeRate(
        [...day2Users].filter((userId) => sourceUsers.telegram.has(userId)).length,
        telegramUsers,
      ),
      miniAppEngagementRate: safeRate(
        [...firstActionUsers].filter((userId) => sourceUsers.miniapp.has(userId)).length,
        miniAppUsers,
      ),
    },
  }
}

export async function getBehavioralAnalytics(period: Period = '30d'): Promise<BehavioralAnalyticsSnapshot> {
  const { start } = getPeriodRange(period)
  const events = await prisma.event.findMany({
    where: { createdAt: { gte: start } },
    select: {
      userId: true,
      type: true,
      state: true,
      payload: true,
      createdAt: true,
    },
  })

  const records: BehavioralEventRecord[] = events.map((event) => ({
    userId: event.userId,
    type: event.type,
    state: event.state,
    payload: event.payload,
    createdAt: event.createdAt,
  }))

  const snapshot = buildBehavioralAnalyticsSnapshot(records)
  const validation = validateBehavioralAnalyticsLayer()

  if (!validation.ok) {
    console.warn('[analytics] behavioral layer validation failed', validation.errors)
  }

  return snapshot
}
