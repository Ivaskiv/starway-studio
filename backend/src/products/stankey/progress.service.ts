import { prisma } from '../../db/client.js'

export type StankeyProgressSnapshot = {
  currentLesson: string | null
  completedLessons: number
  streak: number
  lastActivityAt: Date | null
  paymentStatus: 'paid' | 'trial' | 'paused' | 'unpaid'
}

function deriveCompletedLessons(progress: unknown): number {
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    return 0
  }

  const raw = progress as { completedLessons?: unknown; steps?: unknown }
  if (typeof raw.completedLessons === 'number' && Number.isFinite(raw.completedLessons)) {
    return raw.completedLessons
  }

  if (!Array.isArray(raw.steps)) {
    return 0
  }

  return raw.steps.filter((step) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      return false
    }

    return (step as { completed?: unknown }).completed === true
  }).length
}

function derivePaymentStatus(subscription: { status: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null } | null): StankeyProgressSnapshot['paymentStatus'] {
  const now = new Date()

  if (subscription?.status === 'ACTIVE' && (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now)) {
    return 'paid'
  }

  if (subscription?.status === 'TRIAL' && !!subscription.trialEndsAt && subscription.trialEndsAt > now) {
    return 'trial'
  }

  if (subscription?.status === 'PAUSED' || subscription?.status === 'CANCELLED') {
    return 'paused'
  }

  return 'unpaid'
}

export async function resolveStankeyProgressSnapshot(userId: string): Promise<StankeyProgressSnapshot> {
  const [user, enrollment, streak, lastEntry, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStep: true,
        lastLoginAt: true,
      },
    }),
    prisma.fivePointsEnrollment.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        progress: true,
      },
    }),
    prisma.streak.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        current: true,
        lastAt: true,
      },
    }),
    prisma.dailyEntry.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        updatedAt: true,
      },
    }),
    prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
      },
    }),
  ])

  const lastActivityCandidates = [
    lastEntry?.updatedAt ?? null,
    streak?.lastAt ?? null,
    user?.lastLoginAt ?? null,
  ].filter(Boolean) as Date[]

  lastActivityCandidates.sort((a, b) => b.getTime() - a.getTime())

  return {
    currentLesson: user?.currentStep ?? null,
    completedLessons: deriveCompletedLessons(enrollment?.progress),
    streak: streak?.current ?? 0,
    lastActivityAt: lastActivityCandidates[0] ?? null,
    paymentStatus: derivePaymentStatus(subscription),
  }
}
