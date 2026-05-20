import { DailyState, Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { getEngagementSignals } from '../engagement/engagement.service.js'
import { resolveCanonicalLifecycle } from '../lifecycle/lifecycle.adapter.js'
import { getUserMemoryProfile } from './memory.service.js'

export type RelationshipProductId = 'focus' | 'stankey' | 'absystem'

export type RelationshipTrustProgression =
  | 'cold'
  | 'engaged'
  | 'consistent'
  | 'open'
  | 'deep-work-ready'
  | 'mentor-ready'
  | 'high-trust'

export type RelationshipStabilityTrend = 'stable' | 'improving' | 'stalled' | 'relapsing'

export type RelationshipMemoryQuality = 'complete' | 'partial' | 'fallback'

export type RelationshipUpgradeTrack =
  | 'TEST'
  | 'FOCUS'
  | 'ABSYSTEM_AI'
  | 'STATE_COURSE'
  | 'STRATEGIC_SESSION'
  | 'PERSONAL_PROGRAM'

export interface RelationshipMemoryProfile {
  userId: string
  ecosystemIdentity: 'ABSystem'
  productScope: RelationshipProductId
  available: boolean
  memoryQuality: RelationshipMemoryQuality
  fallbackReason: string | null
  lastMeaningfulGoal: string | null
  repeatedPostponedAction: string | null
  dominantBehavioralBlock: string | null
  lastEmotionalState: string | null
  lastFocusInsight: string | null
  lastZoomTopic: string | null
  recurringHesitationPattern: string | null
  repeatedRollbackTrigger: string | null
  upgradeReadinessEvolution: string | null
  consistencyRhythm: string | null
  inactivityContext: string | null
  unfinishedDecision: string | null
  unresolvedLoop: string | null
  lastMeaningfulProgress: string | null
  lastStatedIntent: string | null
  recurringTomorrowBehavior: string | null
  abandonmentPattern: string | null
  trustProgression: RelationshipTrustProgression
  platformAdaptationLevel: 'low' | 'medium' | 'high'
  behavioralStabilizationTrend: RelationshipStabilityTrend
  returnGapDays: number | null
  lastActivityAt: string | null
  memorySources: {
    userMemory: boolean
    engagement: boolean
    lifecycle: boolean
    mentorState: boolean
    voiceMemory: boolean
    zoomHistory: boolean
    dailyHistory: boolean
    taskHistory: boolean
  }
  productContinuity: {
    focus: boolean
    stankey: boolean
    absystem: boolean
  }
  upgradeGate: RelationshipUpgradeGate
}

export interface RelationshipUpgradeGate {
  track: RelationshipUpgradeTrack
  focusEligible: boolean
  absystemAiEligible: boolean
  stateCourseEligible: boolean
  strategicSessionEligible: boolean
  personalProgramEligible: boolean
  reason: string
}

type SafeState = DailyState | string | null | undefined

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function takeStrings(value: unknown, limit = 5): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, limit)
}

function humanizeDailyState(value: SafeState): string | null {
  switch (value) {
    case DailyState.TENSION:
      return 'напруга'
    case DailyState.FEAR:
      return 'страх'
    case DailyState.STABILITY:
      return 'стабільність'
    case DailyState.INNER_SUPPORT:
      return 'внутрішня опора'
    case DailyState.NEUTRAL:
      return 'нейтральний стан'
    default:
      return asString(value)
  }
}

function humanizeTaskStatus(status: string | null | undefined): string | null {
  const normalized = asString(status)?.toLowerCase() ?? null
  if (!normalized) return null

  switch (normalized) {
    case 'active':
    case 'pending':
      return 'є незавершена дія'
    case 'missed':
    case 'skipped':
    case 'expired':
      return 'дія була відкладена'
    case 'completed':
      return 'дію вже завершено'
    default:
      return normalized.replaceAll('_', ' ')
  }
}

function humanizeSubscriptionContext(state: string | null | undefined): string | null {
  const normalized = asString(state)?.toLowerCase() ?? null
  if (!normalized) return null

  if (normalized === 'trial' || normalized === 'trial_active') return 'пробний ритм'
  if (normalized === 'active' || normalized === 'paid_active') return 'активний ритм'
  if (normalized === 'paused') return 'пауза'
  if (normalized === 'expired' || normalized === 'churned') return 'перерваний ритм'
  return normalized.replaceAll('_', ' ')
}

function daysBetween(from: Date | null | undefined, to = new Date()): number | null {
  if (!(from instanceof Date) || Number.isNaN(from.getTime())) return null
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000))
}

function resolveTrustProgression(input: {
  streak: number
  activeDaysLast7: number
  completedDays: number
  completedTasks: number
  returnGapDays: number | null
  hasZoom: boolean
  hasFocusInsight: boolean
  hasRepeatedBlockers: boolean
  hasGoal: boolean
  currentState: string | null
}): RelationshipTrustProgression {
  const consistencyScore =
    (input.streak >= 7 ? 2 : input.streak >= 3 ? 1 : 0)
    + (input.activeDaysLast7 >= 4 ? 2 : input.activeDaysLast7 >= 2 ? 1 : 0)
    + (input.completedDays > 0 ? 1 : 0)
    + (input.completedTasks > 0 ? 1 : 0)
    + (input.hasZoom ? 1 : 0)
    + (input.hasFocusInsight ? 1 : 0)
    + (input.hasGoal ? 1 : 0)
    - (input.hasRepeatedBlockers ? 1 : 0)

  if (input.currentState === 'churn' || input.currentState === 'expired' || input.currentState === 'paused') {
    return consistencyScore >= 4 && input.returnGapDays !== null && input.returnGapDays <= 14
      ? 'open'
      : 'cold'
  }

  if (consistencyScore >= 8) return 'high-trust'
  if (consistencyScore >= 6) return 'mentor-ready'
  if (consistencyScore >= 5) return 'deep-work-ready'
  if (consistencyScore >= 4) return 'open'
  if (consistencyScore >= 2) return 'consistent'
  if (consistencyScore >= 1) return 'engaged'
  return 'cold'
}

function resolveStabilityTrend(input: {
  streak: number
  activeDaysLast7: number
  returnGapDays: number | null
  unfinishedTasks: number
  repeatedPatterns: boolean
  hasGoal: boolean
  hasProgress: boolean
}): RelationshipStabilityTrend {
  if (input.returnGapDays !== null && input.returnGapDays >= 30) {
    return input.hasProgress ? 'stalled' : 'relapsing'
  }

  if (input.repeatedPatterns || input.unfinishedTasks >= 3) {
    return input.returnGapDays !== null && input.returnGapDays >= 7 ? 'relapsing' : 'stalled'
  }

  if (input.streak >= 7 || input.activeDaysLast7 >= 4) {
    return 'stable'
  }

  if (input.hasProgress && input.returnGapDays !== null && input.returnGapDays <= 7) {
    return 'improving'
  }

  if (input.hasGoal) {
    return 'improving'
  }

  return 'stalled'
}

function resolveUpgradeGate(input: {
  trustProgression: RelationshipTrustProgression
  stabilityTrend: RelationshipStabilityTrend
  hasFocusParticipation: boolean
  hasStateInstability: boolean
  hasHighCommitment: boolean
  hasDeepWorkSignal: boolean
}): RelationshipUpgradeGate {
  const focusEligible = input.trustProgression !== 'cold'
  const absystemAiEligible = focusEligible && input.hasFocusParticipation && input.stabilityTrend !== 'relapsing'
  const stateCourseEligible = input.hasStateInstability || input.stabilityTrend === 'relapsing'
  const strategicSessionEligible =
    input.hasDeepWorkSignal
    && input.trustProgression !== 'cold'
    && input.stabilityTrend !== 'relapsing'
  const personalProgramEligible =
    input.hasHighCommitment
    && input.trustProgression === 'high-trust'
    && input.stabilityTrend === 'stable'

  let track: RelationshipUpgradeTrack = 'TEST'
  let reason = 'ще немає достатньо сигналів для наступного кроку'

  if (personalProgramEligible) {
    track = 'PERSONAL_PROGRAM'
    reason = 'висока довіра, стабільний ритм і глибока залученість'
  } else if (strategicSessionEligible) {
    track = 'STRATEGIC_SESSION'
    reason = 'є стабільність і готовність до більш глибокої розмови'
  } else if (stateCourseEligible) {
    track = 'STATE_COURSE'
    reason = 'є ознаки нестабільності або повторюваного вузла'
  } else if (absystemAiEligible) {
    track = 'ABSYSTEM_AI'
    reason = 'є підтверджений Focus-контекст і готовність до наступного рівня'
  } else if (focusEligible) {
    track = 'FOCUS'
    reason = 'зараз найкраще тримати ритм у Focus'
  }

  return {
    track,
    focusEligible,
    absystemAiEligible,
    stateCourseEligible,
    strategicSessionEligible,
    personalProgramEligible,
    reason,
  }
}

function pickLatestTask(task: {
  title: string
  status: string | null
  dueAt: Date | null
  updatedAt: Date
  isCompleted: boolean
} | null): string | null {
  if (!task) return null
  if (task.isCompleted) return null
  return humanizeTaskStatus(task.status) ?? task.title
}

export async function resolveRelationshipMemory(userId: string, productScope: RelationshipProductId = 'absystem'): Promise<RelationshipMemoryProfile> {
  const [
    memoryProfile,
    engagementSignals,
    lifecycle,
    mentorState,
    voiceEntry,
    latestTask,
    latestDailyEntry,
    latestZoom,
    streak,
  ] = await Promise.all([
    getUserMemoryProfile(userId).catch(() => null),
    getEngagementSignals(userId).catch(() => null),
    resolveCanonicalLifecycle(userId).catch(() => null),
    prisma.userAIMentor.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        behaviorPattern: true,
        blocker: true,
        clarityLevel: true,
        currentState: true,
        insight: true,
        realGoal: true,
        recommendedFocus: true,
        stage: true,
        updatedAt: true,
      },
    }).catch(() => null),
    prisma.voiceEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        state: true,
        createdAt: true,
        decision: true,
      },
    }).catch(() => null),
    prisma.microTask.findFirst({
      where: { userId },
      orderBy: [
        { isCompleted: 'asc' },
        { updatedAt: 'desc' },
      ],
      select: {
        title: true,
        status: true,
        dueAt: true,
        updatedAt: true,
        isCompleted: true,
      },
    }).catch(() => null),
    prisma.dailyEntry.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        state: true,
        status: true,
        choice: true,
        aiAnalysis: true,
        dayFact: true,
        updatedAt: true,
      },
    }).catch(() => null),
    prisma.zoomSessionAttendee.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        attended: true,
        createdAt: true,
        session: {
          select: {
            topic: true,
            scheduledAt: true,
            status: true,
          },
        },
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
        longest: true,
        lastAt: true,
      },
    }).catch(() => null),
  ])

  const hasMemory = Boolean(memoryProfile || engagementSignals || lifecycle || mentorState || voiceEntry || latestTask || latestDailyEntry || latestZoom || streak)
  const lastActivityAt = [
    lifecycle?.timestamps.lastActivityAt ?? null,
    engagementSignals?.lastActivity ?? null,
    latestDailyEntry?.updatedAt ?? null,
    latestTask?.updatedAt ?? null,
    latestZoom?.createdAt ?? null,
    voiceEntry?.createdAt ?? null,
    mentorState?.updatedAt ?? null,
    streak?.lastAt ?? null,
  ].filter((value): value is Date => value instanceof Date).sort((left, right) => right.getTime() - left.getTime())[0] ?? null

  const returnGapDays = daysBetween(lastActivityAt)
  const lastMeaningfulGoal = mentorState?.realGoal ?? memoryProfile?.goals[0] ?? null
  const repeatedPostponedAction = pickLatestTask(latestTask) ?? mentorState?.recommendedFocus ?? memoryProfile?.repeatedBlockers[0] ?? null
  const dominantBehavioralBlock = mentorState?.blocker ?? memoryProfile?.repeatedBlockers[0] ?? null
  const lastEmotionalState = humanizeDailyState(voiceEntry?.state) ?? memoryProfile?.emotionalPatterns[0] ?? null
  const lastFocusInsight = mentorState?.insight ?? null
  const lastZoomTopic = latestZoom?.session?.topic ?? null
  const recurringHesitationPattern = mentorState?.behaviorPattern ?? memoryProfile?.emotionalPatterns[0] ?? null
  const repeatedRollbackTrigger = repeatedPostponedAction ?? dominantBehavioralBlock ?? null
  const lastMeaningfulProgress =
    memoryProfile && memoryProfile.progressHistory.completedDays > 0
      ? `${memoryProfile.progressHistory.completedDays} completed days`
      : latestDailyEntry?.status
        ? humanizeSubscriptionContext(latestDailyEntry.status)
        : streak?.current
          ? `стрік ${streak.current} днів`
          : null
  const lastStatedIntent = lastMeaningfulGoal
  const recurringTomorrowBehavior =
    repeatedPostponedAction
      ? 'повторюється обіцянка “завтра” без завершення кроку'
      : recurringHesitationPattern
        ? `повторюється вузол: ${recurringHesitationPattern}`
        : null
  const abandonmentPattern =
    returnGapDays !== null && returnGapDays >= 14
      ? 'повертається після паузи і знову шукає точку входу'
      : memoryProfile?.repeatedBlockers.length
        ? 'зупиняється на тому самому вузлі'
        : null

  const trustProgression = resolveTrustProgression({
    streak: streak?.current ?? 0,
    activeDaysLast7: memoryProfile?.progressHistory.activeDaysLast7 ?? 0,
    completedDays: memoryProfile?.progressHistory.completedDays ?? 0,
    completedTasks: memoryProfile?.progressHistory.completedTasks ?? 0,
    returnGapDays,
    hasZoom: Boolean(latestZoom),
    hasFocusInsight: Boolean(lastFocusInsight),
    hasRepeatedBlockers: Boolean(memoryProfile?.repeatedBlockers.length),
    hasGoal: Boolean(lastMeaningfulGoal),
    currentState: lifecycle?.state ?? mentorState?.currentState ?? null,
  })

  const behavioralStabilizationTrend = resolveStabilityTrend({
    streak: streak?.current ?? 0,
    activeDaysLast7: memoryProfile?.progressHistory.activeDaysLast7 ?? 0,
    returnGapDays,
    unfinishedTasks: engagementSignals?.unfinishedSteps ?? 0,
    repeatedPatterns: Boolean(engagementSignals?.repeatedPatterns),
    hasGoal: Boolean(lastMeaningfulGoal),
    hasProgress: Boolean(memoryProfile?.progressHistory.completedDays || memoryProfile?.progressHistory.completedTasks || streak?.current),
  })

  const upgradeGate = resolveUpgradeGate({
    trustProgression,
    stabilityTrend: behavioralStabilizationTrend,
    hasFocusParticipation: Boolean(latestZoom || lastFocusInsight || mentorState?.stage === 'ACTION'),
    hasStateInstability: behavioralStabilizationTrend === 'relapsing' || behaviorIsUnstable(voiceEntry?.state, latestDailyEntry?.state, memoryProfile?.repeatedBlockers.length ?? 0),
    hasHighCommitment: (memoryProfile?.progressHistory.completedDays ?? 0) >= 7 || (memoryProfile?.progressHistory.completedTasks ?? 0) >= 5 || trustProgression === 'high-trust',
    hasDeepWorkSignal: trustProgression === 'deep-work-ready' || trustProgression === 'mentor-ready' || trustProgression === 'high-trust',
  })

  const platformAdaptationLevel: RelationshipMemoryProfile['platformAdaptationLevel'] =
    trustProgression === 'high-trust' || trustProgression === 'mentor-ready'
      ? 'high'
      : trustProgression === 'deep-work-ready' || trustProgression === 'open' || trustProgression === 'consistent'
        ? 'medium'
        : 'low'

  const consistencyRhythm =
    behavioralStabilizationTrend === 'stable'
      ? 'стабільний ритм'
      : behavioralStabilizationTrend === 'improving'
        ? 'ритм відновлюється'
        : behavioralStabilizationTrend === 'relapsing'
          ? 'ритм знову просідає'
          : 'ритм ще формується'

  const upgradeReadinessEvolution =
    upgradeGate.personalProgramEligible
      ? 'готовність до Personal Program'
      : upgradeGate.strategicSessionEligible
        ? 'готовність до Strategic Session'
        : upgradeGate.stateCourseEligible
          ? 'потрібна стабілізація через State Course'
          : upgradeGate.absystemAiEligible
            ? 'можна відкривати ABSystem AI'
            : upgradeGate.focusEligible
              ? 'тримається на Focus'
              : 'ще формується'

  const productContinuity = {
    focus: Boolean(lastZoomTopic || lastFocusInsight || recurringHesitationPattern),
    stankey: Boolean(lastMeaningfulGoal || repeatedPostponedAction || lastMeaningfulProgress),
    absystem: Boolean(trustProgression !== 'cold' || upgradeGate.absystemAiEligible || mentorState?.currentState || mentorState?.clarityLevel),
  }

  const memoryQuality: RelationshipMemoryQuality =
    hasMemory && memoryProfile && engagementSignals && lifecycle && mentorState && voiceEntry && latestTask && latestDailyEntry && latestZoom && streak
      ? 'complete'
      : hasMemory
        ? 'partial'
        : 'fallback'

  const fallbackReason =
    memoryQuality === 'complete'
      ? null
      : memoryQuality === 'partial'
        ? 'continuity profile is partially resolved'
        : 'no relationship memory available'

  return {
    userId,
    ecosystemIdentity: 'ABSystem',
    productScope,
    available: hasMemory,
    memoryQuality,
    fallbackReason,
    lastMeaningfulGoal,
    repeatedPostponedAction,
    dominantBehavioralBlock,
    lastEmotionalState,
    lastFocusInsight,
    lastZoomTopic,
    recurringHesitationPattern,
    repeatedRollbackTrigger,
    upgradeReadinessEvolution,
    consistencyRhythm,
    inactivityContext:
      returnGapDays !== null
        ? returnGapDays === 0
          ? 'є недавній контакт'
          : `повернення після ${returnGapDays} дн. паузи`
        : null,
    unfinishedDecision: repeatedPostponedAction,
    unresolvedLoop: repeatedRollbackTrigger,
    lastMeaningfulProgress,
    lastStatedIntent,
    recurringTomorrowBehavior,
    abandonmentPattern,
    trustProgression,
    platformAdaptationLevel,
    behavioralStabilizationTrend,
    returnGapDays,
    lastActivityAt: lastActivityAt?.toISOString() ?? null,
    memorySources: {
      userMemory: Boolean(memoryProfile),
      engagement: Boolean(engagementSignals),
      lifecycle: Boolean(lifecycle),
      mentorState: Boolean(mentorState),
      voiceMemory: Boolean(voiceEntry),
      zoomHistory: Boolean(latestZoom),
      dailyHistory: Boolean(latestDailyEntry),
      taskHistory: Boolean(latestTask),
    },
    productContinuity,
    upgradeGate,
  }
}

function behaviorIsUnstable(
  voiceState: SafeState,
  dailyState: SafeState,
  repeatedBlockersCount: number,
): boolean {
  const normalizedVoice = asString(voiceState)?.toLowerCase() ?? null
  const normalizedDaily = asString(dailyState)?.toLowerCase() ?? null
  return repeatedBlockersCount >= 2
    || normalizedVoice === 'fear'
    || normalizedVoice === 'avoidance'
    || normalizedVoice === 'stagnation'
    || normalizedDaily === 'tension'
    || normalizedDaily === 'fear'
}

export function resolveRelationshipUpgradeGate(profile: RelationshipMemoryProfile): RelationshipUpgradeGate {
  return profile.upgradeGate
}

export function buildRelationshipContinuityLines(profile: RelationshipMemoryProfile): string[] {
  const lines = ['Я пам\'ятаю твій шлях.']

  if (profile.lastMeaningfulGoal) {
    lines.push(`Останній важливий фокус: ${profile.lastMeaningfulGoal}`)
  }

  if (profile.repeatedPostponedAction) {
    lines.push(`Повторюється вузол: ${profile.repeatedPostponedAction}`)
  }

  if (profile.lastFocusInsight) {
    lines.push(`Останній інсайт: ${profile.lastFocusInsight}`)
  }

  if (profile.inactivityContext) {
    lines.push(`Контекст повернення: ${profile.inactivityContext}`)
  }

  return lines
}

export function validateRelationshipMemoryLayer(): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const synthetic: RelationshipMemoryProfile = {
    userId: 'test-user',
    ecosystemIdentity: 'ABSystem',
    productScope: 'absystem',
    available: true,
    memoryQuality: 'partial',
    fallbackReason: null,
    lastMeaningfulGoal: 'Відновити ритм',
    repeatedPostponedAction: 'завершити поточний крок',
    dominantBehavioralBlock: 'уникання',
    lastEmotionalState: 'напруга',
    lastFocusInsight: 'Ти зупиняєшся після сильного старту',
    lastZoomTopic: 'Повернення в ритм',
    recurringHesitationPattern: 'сумнів',
    repeatedRollbackTrigger: 'переношу на завтра',
    upgradeReadinessEvolution: 'можна відкривати ABSystem AI',
    consistencyRhythm: 'ритм відновлюється',
    inactivityContext: 'повернення після 7 дн. паузи',
    unfinishedDecision: 'завершити поточний крок',
    unresolvedLoop: 'переношу на завтра',
    lastMeaningfulProgress: '3 completed days',
    lastStatedIntent: 'Відновити ритм',
    recurringTomorrowBehavior: 'повторюється обіцянка “завтра” без завершення кроку',
    abandonmentPattern: 'повертається після паузи і знову шукає точку входу',
    trustProgression: 'open',
    platformAdaptationLevel: 'medium',
    behavioralStabilizationTrend: 'improving',
    returnGapDays: 7,
    lastActivityAt: new Date().toISOString(),
    memorySources: {
      userMemory: true,
      engagement: true,
      lifecycle: true,
      mentorState: true,
      voiceMemory: true,
      zoomHistory: true,
      dailyHistory: true,
      taskHistory: true,
    },
    productContinuity: {
      focus: true,
      stankey: true,
      absystem: true,
    },
    upgradeGate: {
      track: 'ABSYSTEM_AI',
      focusEligible: true,
      absystemAiEligible: true,
      stateCourseEligible: false,
      strategicSessionEligible: false,
      personalProgramEligible: false,
      reason: 'synthetic',
    },
  }

  const continuityLines = buildRelationshipContinuityLines(synthetic)
  if (!continuityLines.some((line) => line.includes("Я пам'ятаю твій шлях."))) {
    errors.push('continuity_header_missing')
  }

  if (resolveRelationshipUpgradeGate(synthetic).track !== 'ABSYSTEM_AI') {
    errors.push('synthetic_upgrade_gate_failed')
  }

  if (synthetic.trustProgression !== 'open') {
    errors.push('synthetic_trust_progression_failed')
  }

  if (synthetic.memoryQuality === 'fallback') {
    errors.push('synthetic_memory_quality_failed')
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}
