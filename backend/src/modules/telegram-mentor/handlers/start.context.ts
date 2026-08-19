import { absystemContent } from '@/products/absystem/config/content.js'
import { resolveTelegramWebappBaseUrl } from '@/config/webapp.js'
import { prisma } from '../../../db/client.js'
import { resolveUserLifecycle as resolveRuntimeLifecycle } from '../../users/runtime/resolveUserLifecycle.js'
import { type ComebackScenario, type StartContextRecord, asRecord, asString, countCompletedGoals, countGoalsTotal, countWheelAnswered, deriveRepeatedPostponedActions, normalizeText, readJsonString, readJsonTimestamp, resolvePrimaryProductKey, toAgeDays, toInactivityDays } from './start.shared.js'

export async function resolveStartContext(
  userId: string
): Promise<StartContextRecord | null> {
  const user = await prisma.user
    .findUnique({
      where: { id: userId },
      select: {
        currentState: true,
        currentStep: true,
        funnelStage: true,
        testResultType: true,
        settings: true,
        updatedAt: true,
        productAccesses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            product: true,
          },
        },
        dailyCycleLogs: {
          orderBy: { date: 'desc' },
          take: 2,
          select: {
            date: true,
            aiSummary: true,
            state: true,
            choice: true,
          },
        },
        wheelAssessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            scores: true,
          },
        },
        goalsSets: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            goals: true,
          },
        },
        productSubscriptions: {
          where: {
            status: 'active',
            product: {
              code: { in: ['absystem_ai', 'absystem'] },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
          },
        },
        weeklyReports: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            summaryText: true,
            nextWeekTasks: true,
            analysis: true,
            growthAreas: true,
            struggleAreas: true,
          },
        },
        microTasks: {
          where: { isCompleted: false },
          orderBy: { updatedAt: 'desc' },
          take: 20,
          select: {
            title: true,
            description: true,
            aiContext: true,
            status: true,
          },
        },
      },
    })
    .catch(() => null)

  if (!user) {
    return null
  }

  const settings = asRecord(user.settings)
  const repeatedPostponedActions = deriveRepeatedPostponedActions({
    weeklyReport: user.weeklyReports[0] ?? null,
    microTasks: user.microTasks,
  })
  const latestDailyCycle = user.dailyCycleLogs[0] ?? null
  const latestWheelAssessment = user.wheelAssessments[0] ?? null
  const latestGoalsSet = user.goalsSets[0] ?? null
  const latestSubscription = user.productSubscriptions[0] ?? null
  const weeklyReportSummaries = user.weeklyReports
    .map((report) => asString(report.summaryText))
    .filter((summary): summary is string => Boolean(summary))

  return {
    lifecycle: resolveRuntimeLifecycle(user).value,
    testResultType: asString(user.testResultType),
    updatedAt: user.updatedAt,
    inactivityDays: toInactivityDays(
      user.updatedAt,
      latestDailyCycle?.date ?? null
    ),
    repeatedPostponedActions,
    lastGoal: readJsonString(settings, 'lastGoal'),
    lastAction: readJsonString(settings, 'lastAction'),
    referralSentAt: readJsonTimestamp(settings, 'referralSentAt'),
    primaryProductKey: resolvePrimaryProductKey(user.productAccesses),
    settings,
    latestDailyCycleDate: latestDailyCycle?.date ?? null,
    latestDailyCycleSummary: latestDailyCycle?.aiSummary ?? null,
    subscriptionCreatedAt: latestSubscription?.createdAt ?? null,
    weeklyReportSummaries,
    wheelAnsweredCount: countWheelAnswered(latestWheelAssessment?.scores),
    latestWheelAssessmentAt: latestWheelAssessment?.createdAt ?? null,
    latestGoalsSetAt: latestGoalsSet?.createdAt ?? null,
    latestGoalsCompleted: countCompletedGoals(latestGoalsSet?.goals),
    latestGoalsCount: countGoalsTotal(latestGoalsSet?.goals),
  }
}

async function loadStartContext(
  userId: string
): Promise<StartContextRecord | null> {
  return resolveStartContext(userId)
}

export function resolveComeback(input: {
  lastActivityDays: number
  lifecycle: string | null
  primaryProductKey?: 'STANKEY' | 'FOCUS' | 'ABsystem' | null
}): ComebackScenario | null {
  if (input.primaryProductKey === 'STANKEY') {
    return null
  }

  const lifecycle = asString(input.lifecycle)?.toLowerCase() ?? null
  const lastActivityDays = Math.max(
    0,
    Math.floor(Number(input.lastActivityDays ?? 0))
  )

  if (lifecycle === 'expired') {
    return lastActivityDays >= 30 ? 'GAP_30_NO_SUB' : null
  }

  if (lifecycle !== 'platform_active') {
    return null
  }

  if (lastActivityDays >= 30) {
    return 'GAP_30_PLUS'
  }

  if (lastActivityDays >= 7) {
    return 'GAP_7_14'
  }

  if (lastActivityDays >= 4) {
    return 'GAP_4_7'
  }

  if (lastActivityDays >= 1) {
    return 'GAP_1_3'
  }

  return null
}

export function resolveReferralButton(
  context: StartContextRecord,
  userId: string
): { text: string; url: string } | null {
  if (context.primaryProductKey === 'STANKEY') {
    return null
  }

  if (context.lifecycle !== 'platform_active') {
    return null
  }

  if (!context.subscriptionCreatedAt) {
    return null
  }

  const subscriptionAgeDays = toAgeDays(context.subscriptionCreatedAt)
  if (subscriptionAgeDays < 30) {
    return null
  }

  if (context.referralSentAt) {
    return null
  }

  if (context.weeklyReportSummaries.length < 3) {
    return null
  }

  const positiveSignals = context.weeklyReportSummaries
    .slice(0, 3)
    .every((summary) => {
      const normalized = normalizeText(summary)
      return [
        'рух',
        'просун',
        'зробил',
        'викон',
        'заверш',
        'успіх',
        'стабіль',
        'ясн',
        'добре',
        'план',
        'продовж',
      ].some((token) => normalized.includes(token))
    })

  if (!positiveSignals) {
    return null
  }

  const frontendUrl = resolvePublicFrontendBaseUrl()
  return {
    text: absystemContent.REFERRAL.cta,
    url: `${frontendUrl}/ab-test?ref=${encodeURIComponent(userId)}`,
  }
}

function resolvePublicFrontendBaseUrl() {
  return resolveTelegramWebappBaseUrl()
}
