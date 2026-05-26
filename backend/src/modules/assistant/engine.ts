import { prisma } from '../../db/client.js'

export interface StateHistoryItem {
  analyzedAt?: string
  behaviorPattern?: string | null
  currentState?: string | null
  stage?: string | null
}

export interface AssistantUserProfile {
  currentState: string | null
  behaviorPattern: string | null
  stage: string | null
  clarityLevel: string | null
  blocker: string | null
  stateHistory: StateHistoryItem[]
  wheelHistory: Array<{
    createdAt: Date
    scores: unknown
    note: string | null
  }>
  dailyEntries: Array<{
    date: Date
    state: string
    choice: string
    drain: string | null
    dayFact: string | null
  }>
  lifecycleEvents: Array<{
    source: string | null
    status: string
    notes: string | null
    createdAt: Date
  }>
  subscription: {
    status: string
    trialEndsAt: Date | null
    currentPeriodEnd: Date | null
    createdAt: Date
  } | null
  highEngagement: boolean
}

function parseStateHistory(value: unknown): StateHistoryItem[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  const record = value as Record<string, unknown>
  const stateHistory = record.stateHistory
  if (!Array.isArray(stateHistory)) {
    return []
  }

  return stateHistory
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map(item => ({
      analyzedAt: typeof item.analyzedAt === 'string' ? item.analyzedAt : undefined,
      behaviorPattern: typeof item.behaviorPattern === 'string' ? item.behaviorPattern : null,
      currentState: typeof item.currentState === 'string' ? item.currentState : null,
      stage: typeof item.stage === 'string' ? item.stage : null,
    }))
}

export async function buildUserProfile(userId: string): Promise<AssistantUserProfile> {
  const [mentorState, wheelHistory, dailyEntries, lifecycleEvents, subscription] = await Promise.all([
    prisma.userAiMentor.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        currentState: true,
        behaviorPattern: true,
        stage: true,
        clarityLevel: true,
        blocker: true,
        context: true,
      },
    }),
    prisma.userBalanceEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        createdAt: true,
        scores: true,
        note: true,
      },
    }),
    prisma.dailyEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
      select: {
        date: true,
        state: true,
        choice: true,
        drain: true,
        dayFact: true,
      },
    }),
    prisma.funnelLead.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        source: true,
        status: true,
        notes: true,
        createdAt: true,
      },
    }),
    prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        createdAt: true,
      },
    }),
  ])

  const stateHistory = parseStateHistory(mentorState?.context)

  return {
    currentState: mentorState?.currentState ?? null,
    behaviorPattern: mentorState?.behaviorPattern ?? null,
    stage: mentorState?.stage ?? null,
    clarityLevel: mentorState?.clarityLevel ?? null,
    blocker: mentorState?.blocker ?? null,
    stateHistory,
    wheelHistory,
    dailyEntries,
    lifecycleEvents,
    subscription,
    highEngagement: dailyEntries.length >= 10 || wheelHistory.length >= 2,
  }
}

export async function computeAssistantState(userId: string) {
  const profile = await buildUserProfile(userId)

  return {
    wheelCompleted: profile.wheelHistory.length > 0,
    morningCompleted: profile.dailyEntries.length > 0,
    eveningCompleted: profile.dailyEntries.length > 0,
    hasProduct: profile.lifecycleEvents.length > 0,
  }
}
