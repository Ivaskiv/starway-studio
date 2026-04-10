import { prisma } from '../../db/client.js'

export type PausedMentorContext = {
  expiresAt: Date
  previousPlan: 'trial' | 'subscription'
} | null

export async function resolvePausedMentorContext(userId: string): Promise<PausedMentorContext> {
  const now = new Date()
  const [user, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        trialStartsAt: true,
        trialEndsAt: true,
      },
    }),
    prisma.subscription.findFirst({
      where: {
        userId,
        OR: [
          { status: { in: ['CANCELED', 'EXPIRED'] } },
          { currentPeriodEnd: { not: null } },
          { trialEndsAt: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
      },
    }),
  ])

  if (user?.email?.startsWith('telegram-guest-')) {
    return null
  }

  if (user?.trialStartsAt && user.trialEndsAt && user.trialEndsAt <= now) {
    return {
      expiresAt: user.trialEndsAt,
      previousPlan: 'trial',
    }
  }

  const subscriptionEndedAt = subscription?.currentPeriodEnd ?? subscription?.trialEndsAt
  if (subscriptionEndedAt && subscriptionEndedAt <= now) {
    return {
      expiresAt: subscriptionEndedAt,
      previousPlan: subscription?.status === 'TRIAL' ? 'trial' : 'subscription',
    }
  }

  return null
}
