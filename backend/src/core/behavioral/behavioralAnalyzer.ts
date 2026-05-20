import { prisma } from '../../db/client.js'
import { resolveCanonicalLifecycle } from '../lifecycle/lifecycle.adapter.js'
import { resolveRelationshipMemory } from '../memory/relationshipMemory.js'
import type { BehavioralSnapshot } from './behavioralSnapshot.js'

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function firstText(value: unknown): string | null {
  if (typeof value === 'string') return asString(value)
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = firstText(item)
      if (text) return text
    }
    return null
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['title', 'name', 'label', 'text', 'value', 'goal', 'focus', 'insight', 'summary', 'message', 'description']) {
      const text = asString(record[key])
      if (text) return text
    }
    for (const nested of Object.values(record)) {
      const text = firstText(nested)
      if (text) return text
    }
  }
  return null
}

function latestText(...candidates: Array<string | null | undefined>): string | null {
  return candidates.map(asString).find((value): value is string => Boolean(value)) ?? null
}

function parseScoreMap(value: unknown): Array<{ key: string; score: number }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>)
    .map(([key, raw]) => ({
      key,
      score: typeof raw === 'number' ? raw : Number(raw),
    }))
    .filter((item) => Number.isFinite(item.score))
}

function readWheelImbalance(assessment: { weakestSphere: string | null; scores: unknown } | null): BehavioralSnapshot['wheelImbalance'] {
  if (!assessment) return undefined
  const scoreMap = parseScoreMap(assessment.scores)
  const weakest = scoreMap.sort((left, right) => left.score - right.score)[0]
  const weakestArea = asString(assessment.weakestSphere) ?? weakest?.key ?? ''
  if (!weakestArea) return undefined
  return {
    weakestArea,
    score: weakest?.score ?? 0,
  }
}

function deriveMomentumLevel(input: {
  inactivityDays: number | undefined
  focusParticipation: boolean
  focusSessionsCount: number
  repeatedRollback: boolean
  dailyCycleInterrupted: boolean
}): BehavioralSnapshot['momentumLevel'] {
  if (input.repeatedRollback || input.dailyCycleInterrupted) return 'low'
  if (typeof input.inactivityDays === 'number' && input.inactivityDays >= 14) return 'low'
  if (typeof input.inactivityDays === 'number' && input.inactivityDays >= 7) return input.focusParticipation ? 'medium' : 'low'
  if (input.focusSessionsCount >= 2 || input.focusParticipation) return 'high'
  if (input.focusSessionsCount > 0) return 'medium'
  return 'low'
}

function mapDominantBlock(input: {
  repeatedPostponedAction: string | null
  unresolvedDecision: string | null
  unresolvedGoal: string | null
  emotionalPattern: string | null
  wheelImbalance: BehavioralSnapshot['wheelImbalance']
}): BehavioralSnapshot['dominantBlock'] {
  const combined = [
    input.repeatedPostponedAction,
    input.unresolvedDecision,
    input.unresolvedGoal,
    input.emotionalPattern,
    input.wheelImbalance?.weakestArea,
  ]
    .filter((value): value is string => Boolean(asString(value)))
    .join(' ')
    .toLowerCase()

  if (combined.includes('decision') || combined.includes('рішення') || combined.includes('choose') || combined.includes('вибір')) {
    return 'decision'
  }
  if (combined.includes('choice') || combined.includes('варіант')) {
    return 'choice'
  }
  if (combined.includes('goal') || combined.includes('ціл') || combined.includes('напрям')) {
    return 'goal'
  }
  if (combined.includes('action') || combined.includes('ді') || combined.includes('крок') || combined.includes('task')) {
    return 'action'
  }
  return combined.includes('state') || combined.includes('стан') || combined.includes('tension')
    ? 'state'
    : 'action'
}

function unpackChoice(value: unknown): string | null {
  return firstText(asRecord(value) as JsonValue)
}

export async function buildBehavioralSnapshotFromUserId(userId: string): Promise<BehavioralSnapshot> {
  const [
    relationship,
    lifecycle,
    memory,
    goals,
    mentor,
    wheel,
    dailyEntry,
    microTask,
    streak,
    zooms,
    weeklyReport,
    voiceEntry,
  ] = await Promise.all([
    resolveRelationshipMemory(userId, 'absystem').catch(() => null),
    resolveCanonicalLifecycle(userId).catch(() => null),
    prisma.userMemory.findUnique({
      where: { userId },
      select: { summary: true },
    }).catch(() => null),
    prisma.goalsSet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { goals: true },
    }).catch(() => null),
    prisma.userAIMentor.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        behaviorPattern: true,
        blocker: true,
        insight: true,
        realGoal: true,
        recommendedFocus: true,
        stage: true,
        currentState: true,
      },
    }).catch(() => null),
    prisma.wheelAssessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        weakestSphere: true,
        scores: true,
      },
    }).catch(() => null),
    prisma.dailyEntry.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        state: true,
        status: true,
        choice: true,
        dayFact: true,
        aiAnalysis: true,
        updatedAt: true,
      },
    }).catch(() => null),
    prisma.microTask.findFirst({
      where: { userId, isCompleted: false },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        title: true,
        status: true,
        updatedAt: true,
        sphere: true,
        aiContext: true,
      },
    }).catch(() => null),
    prisma.streak.findUnique({
      where: {
        userId_ruleKey: {
          userId,
          ruleKey: 'daily_checkin',
        },
      },
      select: {
        current: true,
        lastAt: true,
      },
    }).catch(() => null),
    prisma.zoomSessionAttendee.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        attended: true,
        createdAt: true,
        session: {
          select: {
            topic: true,
          },
        },
      },
    }).catch(() => [] as Array<{ attended: boolean; createdAt: Date; session: { topic: string | null } | null }>),
    prisma.weeklyReport.findFirst({
      where: { userId },
      orderBy: { weekStart: 'desc' },
      select: {
        summaryText: true,
        nextWeekFocus: true,
        topInsights: true,
        struggleAreas: true,
        wheelDelta: true,
      },
    }).catch(() => null),
    prisma.voiceEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        state: true,
        text: true,
      },
    }).catch(() => null),
  ])

  const wheelImbalance = readWheelImbalance(wheel)
  const focusSessionsCount = zooms.filter((entry) => entry.attended).length
  const focusParticipation = Boolean(
    focusSessionsCount > 0
      || relationship?.lastFocusInsight
      || relationship?.lastZoomTopic
      || weeklyReport?.summaryText
      || weeklyReport?.nextWeekFocus
  )

  const currentFocus = latestText(
    relationship?.lastMeaningfulGoal,
    mentor?.realGoal,
    mentor?.recommendedFocus,
    firstText(goals?.goals),
    weeklyReport?.nextWeekFocus,
    firstText(memory?.summary),
  )

  const unresolvedGoal = latestText(
    mentor?.realGoal,
    relationship?.lastMeaningfulGoal,
    firstText(goals?.goals),
    weeklyReport?.nextWeekFocus,
  )

  const repeatedPostponedAction = latestText(
    relationship?.repeatedPostponedAction,
    mentor?.recommendedFocus,
    firstText(microTask?.title),
    firstText(microTask?.aiContext),
  )

  const unresolvedDecision = latestText(
    relationship?.unfinishedDecision ?? null,
    relationship?.dominantBehavioralBlock ?? null,
    mentor?.blocker,
    unpackChoice(dailyEntry?.choice),
    firstText(voiceEntry?.text),
  )

  const lastMeaningfulAction = latestText(
    relationship?.lastMeaningfulProgress,
    firstText(dailyEntry?.dayFact),
    firstText(dailyEntry?.aiAnalysis),
    firstText(weeklyReport?.summaryText),
    firstText(microTask?.title),
  )

  const unfinishedStrategyNode = latestText(
    weeklyReport?.nextWeekFocus,
    firstText(weeklyReport?.topInsights),
    firstText(goals?.goals),
  )

  const lastZoomTopic = latestText(
    relationship?.lastZoomTopic,
    zooms.find((entry) => entry.attended)?.session?.topic,
  )

  const dailyCycleInterrupted = Boolean(
    dailyEntry && String(dailyEntry.status).toUpperCase() !== 'COMPLETED' && String(dailyEntry.status).toUpperCase() !== 'DONE',
  )

  const emotionalPattern = latestText(
    relationship?.lastEmotionalState,
    mentor?.behaviorPattern,
    firstText(voiceEntry?.text),
    firstText(dailyEntry?.aiAnalysis),
  )

  const repeatedRollback = Boolean(
    relationship?.behavioralStabilizationTrend === 'relapsing'
      || relationship?.repeatedRollbackTrigger
      || relationship?.unresolvedLoop
      || repeatedPostponedAction
      || unresolvedDecision,
  )

  const inactivityDays = relationship?.returnGapDays ?? lifecycle?.timestamps.lastActivityAt
    ? relationship?.returnGapDays ?? Math.max(0, Math.floor((Date.now() - (lifecycle?.timestamps.lastActivityAt?.getTime() ?? Date.now())) / 86_400_000))
    : undefined

  const momentumLevel = deriveMomentumLevel({
    inactivityDays,
    focusParticipation,
    focusSessionsCount,
    repeatedRollback,
    dailyCycleInterrupted,
  })

  return {
    currentFocus: currentFocus ?? undefined,
    unresolvedGoal: unresolvedGoal ?? undefined,
    repeatedPostponedAction: repeatedPostponedAction ?? undefined,
    dominantBlock: mapDominantBlock({
      repeatedPostponedAction,
      unresolvedDecision,
      unresolvedGoal,
      emotionalPattern,
      wheelImbalance,
    }),
    inactivityDays,
    repeatedRollback,
    wheelImbalance,
    lastMeaningfulAction: lastMeaningfulAction ?? undefined,
    unfinishedStrategyNode: unfinishedStrategyNode ?? undefined,
    lastZoomTopic: lastZoomTopic ?? undefined,
    dailyCycleInterrupted,
    emotionalPattern: emotionalPattern ?? undefined,
    momentumLevel,
    focusParticipation,
    focusSessionsCount,
    lastWeeklyReportInsight: latestText(
      firstText(weeklyReport?.summaryText),
      firstText(weeklyReport?.topInsights),
    ) ?? undefined,
    unresolvedDecision: unresolvedDecision ?? undefined,
    repeatedAvoidancePattern: latestText(
      relationship?.recurringTomorrowBehavior,
      relationship?.abandonmentPattern,
      firstText(weeklyReport?.struggleAreas),
      firstText(weeklyReport?.wheelDelta),
    ) ?? undefined,
  }
}
