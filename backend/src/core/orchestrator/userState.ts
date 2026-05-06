export type UserStage = 'onboarding' | 'trial' | 'active' | 'risk' | 'churn'

export type UserState = {
  userId: string
  stage: UserStage
  activationScore: number
  churnRisk: number
  engagementScore: number
  lastActivityAt: number
  behaviorTags: string[]
}

export type UserStateInputSignals = {
  userId: string
  stage?: UserStage
  previousState?: Partial<UserState> | null
  lastActivityAt?: number | Date | string | null
  inactivityHours?: number | null
  isTrialActive?: boolean
  hasActiveSubscription?: boolean
  onboardingCompleted?: boolean
  engagementEvents?: number
  cycleCompletions?: number
  completedGoals?: number
  goalsTotal?: number
  streakDays?: number
  unfinishedTasks?: number
  churnSignals?: string[]
  behaviorTags?: string[]
  forceRiskStage?: boolean
  forceChurnStage?: boolean
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function toTimestamp(value: UserStateInputSignals['lastActivityAt']): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime()
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
  }
  return null
}

function hoursSinceActivity(lastActivityAt: number, fallbackHours?: number | null) {
  if (typeof fallbackHours === 'number' && Number.isFinite(fallbackHours) && fallbackHours >= 0) {
    return fallbackHours
  }

  return Math.max(0, (Date.now() - lastActivityAt) / 3_600_000)
}

function uniqueTags(tags: Array<string | null | undefined>) {
  return [...new Set(
    tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map(tag => tag.trim())
      .filter(Boolean),
  )]
}

function deriveEngagementScore(input: Required<Pick<UserStateInputSignals, 'engagementEvents' | 'cycleCompletions' | 'completedGoals' | 'streakDays' | 'unfinishedTasks'>>, inactivityHours: number) {
  const score =
    10
    + input.engagementEvents * 8
    + input.cycleCompletions * 12
    + input.completedGoals * 14
    + Math.min(input.streakDays, 14) * 2
    - Math.min(input.unfinishedTasks, 10) * 3
    - Math.min(inactivityHours, 168) * 0.2

  return clampScore(score)
}

function deriveActivationScore(input: Required<Pick<UserStateInputSignals, 'engagementEvents' | 'cycleCompletions' | 'completedGoals' | 'goalsTotal' | 'streakDays'>>, inactivityHours: number, stage: UserStage) {
  const goalCompletionRatio = input.goalsTotal > 0
    ? Math.min(1, input.completedGoals / input.goalsTotal)
    : 0

  const stageBoost = stage === 'trial'
    ? 12
    : stage === 'active'
      ? 8
      : 0

  const score =
    15
    + stageBoost
    + input.engagementEvents * 6
    + input.cycleCompletions * 10
    + goalCompletionRatio * 25
    + Math.min(input.streakDays, 10) * 2
    - Math.min(inactivityHours, 120) * 0.25

  return clampScore(score)
}

function deriveChurnRisk(input: Required<Pick<UserStateInputSignals, 'unfinishedTasks' | 'churnSignals' | 'completedGoals' | 'goalsTotal' | 'streakDays'>>, inactivityHours: number, engagementScore: number) {
  const unfinishedPressure = Math.min(input.unfinishedTasks, 10) * 3
  const signalPressure = Math.min(input.churnSignals.length, 5) * 12
  const goalPressure = input.goalsTotal > 0 && input.completedGoals === 0 ? 8 : 0
  const streakRelief = Math.min(input.streakDays, 10) * 2

  const risk =
    15
    + Math.min(inactivityHours, 240) * 0.28
    + unfinishedPressure
    + signalPressure
    + goalPressure
    - streakRelief
    - engagementScore * 0.18

  return clampScore(risk)
}

function resolveStage(input: UserStateInputSignals, churnRisk: number): UserStage {
  if (input.forceChurnStage) return 'churn'
  if (input.forceRiskStage) return 'risk'
  if (input.stage) return input.stage
  if (input.hasActiveSubscription) return 'active'
  if (input.isTrialActive) return 'trial'
  if (churnRisk >= 85) return 'churn'
  if (churnRisk >= 60) return 'risk'
  if (input.onboardingCompleted) return 'trial'
  return 'onboarding'
}

export function updateUserState(inputSignals: UserStateInputSignals): UserState {
  const previousState = inputSignals.previousState ?? null
  const lastActivityAt =
    toTimestamp(inputSignals.lastActivityAt)
    ?? (typeof previousState?.lastActivityAt === 'number' ? previousState.lastActivityAt : null)
    ?? Date.now()

  const normalized = {
    engagementEvents: Math.max(0, inputSignals.engagementEvents ?? 0),
    cycleCompletions: Math.max(0, inputSignals.cycleCompletions ?? 0),
    completedGoals: Math.max(0, inputSignals.completedGoals ?? 0),
    goalsTotal: Math.max(0, inputSignals.goalsTotal ?? 0),
    streakDays: Math.max(0, inputSignals.streakDays ?? 0),
    unfinishedTasks: Math.max(0, inputSignals.unfinishedTasks ?? 0),
    churnSignals: inputSignals.churnSignals ?? [],
  }

  const inactivity = hoursSinceActivity(lastActivityAt, inputSignals.inactivityHours)
  const provisionalStage = inputSignals.stage
    ?? (inputSignals.hasActiveSubscription ? 'active' : inputSignals.isTrialActive ? 'trial' : 'onboarding')
  const engagementScore = deriveEngagementScore(normalized, inactivity)
  const activationScore = deriveActivationScore(normalized, inactivity, provisionalStage)
  const churnRisk = deriveChurnRisk(normalized, inactivity, engagementScore)
  const stage = resolveStage(inputSignals, churnRisk)

  const behaviorTags = uniqueTags([
    ...(previousState?.behaviorTags ?? []),
    ...(inputSignals.behaviorTags ?? []),
    normalized.completedGoals > 0 ? 'goal_progress' : null,
    normalized.cycleCompletions > 0 ? 'cycle_completed' : null,
    normalized.streakDays >= 3 ? 'streak_positive' : null,
    normalized.unfinishedTasks >= 3 ? 'task_backlog' : null,
    inactivity >= 24 ? 'inactive_24h' : null,
    inactivity >= 72 ? 'inactive_72h' : null,
    churnRisk > 70 ? 'churn_risk_high' : null,
    engagementScore >= 70 ? 'engaged' : null,
  ])

  return {
    userId: inputSignals.userId,
    stage,
    activationScore,
    churnRisk,
    engagementScore,
    lastActivityAt,
    behaviorTags,
  }
}
