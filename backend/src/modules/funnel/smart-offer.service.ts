import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'

export interface SmartOffer {
  headline: string
  ctaText: string
  callbackData: string
  expiresAt: Date
}

type StoredBannerOffer = {
  expiresAt: string
  headline: string
  ctaText: string
  callbackData: string
}

function toJsonObject(value: Prisma.JsonValue | null | undefined): Prisma.JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Prisma.JsonObject
}

function getStoredOffer(settings: Prisma.JsonObject): StoredBannerOffer | null {
  const raw = settings.bannerOffer
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }

  const bannerOffer = raw as Record<string, unknown>
  if (
    typeof bannerOffer.expiresAt !== 'string' ||
    typeof bannerOffer.headline !== 'string' ||
    typeof bannerOffer.ctaText !== 'string' ||
    typeof bannerOffer.callbackData !== 'string'
  ) {
    return null
  }

  return {
    expiresAt: bannerOffer.expiresAt,
    headline: bannerOffer.headline,
    ctaText: bannerOffer.ctaText,
    callbackData: bannerOffer.callbackData,
  }
}

export async function getPersonalizedOffer(userId: string): Promise<SmartOffer | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      settings: true,
      trialStartsAt: true,
      trialEndsAt: true,
    },
  })

  if (!user) {
    return null
  }

  const settings = toJsonObject(user.settings)
  const existing = getStoredOffer(settings)

  if (existing && new Date(existing.expiresAt) > new Date()) {
    return {
      headline: existing.headline,
      ctaText: existing.ctaText,
      callbackData: existing.callbackData,
      expiresAt: new Date(existing.expiresAt),
    }
  }

  const [leads, subscription, mentor] = await Promise.all([
    prisma.funnelLead.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { status: true, notes: true, updatedAt: true },
    }),
    prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { status: true, trialEndsAt: true },
    }),
    prisma.userAIMentor.findFirst({
      where: { userId },
      select: {
        stage: true,
        behaviorPattern: true,
        clarityLevel: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const isChurned = !subscription && leads.length === 0 && !user.trialStartsAt
  const trialExpired = subscription?.status === 'TRIAL'
    && Boolean(subscription.trialEndsAt)
    && (subscription.trialEndsAt?.getTime() ?? 0) < Date.now()
  const hasCompletedTasks = leads.some(lead => lead.notes?.includes('finished'))

  let offer: SmartOffer

  if (isChurned) {
    offer = {
      headline: 'Повернись. Система пам\'ятає де ти зупинилась.',
      ctaText: '🎁 Спеціальна пропозиція',
      callbackData: 'special_offer',
      expiresAt: new Date(Date.now() + 24 * 3600000),
    }
  } else if (trialExpired) {
    offer = {
      headline: '7 днів позаду. Що далі — твій вибір.',
      ctaText: '🚀 Отримати повний доступ',
      callbackData: 'buy_subscription',
      expiresAt: new Date(Date.now() + 24 * 3600000),
    }
  } else if (hasCompletedTasks && mentor?.clarityLevel === 'HIGH') {
    offer = {
      headline: 'Ти вже бачиш результат. Наступний рівень:',
      ctaText: '🚀 Отримати повний доступ',
      callbackData: 'buy_subscription',
      expiresAt: new Date(Date.now() + 24 * 3600000),
    }
  } else if (mentor?.stage === 'CONFLICT' || mentor?.behaviorPattern?.includes('avoidance')) {
    offer = {
      headline: 'Є розрив між хочу і роблю. Ось що допоможе:',
      ctaText: '🧭 Знайти свої точки опори',
      callbackData: 'view_5points',
      expiresAt: new Date(Date.now() + 24 * 3600000),
    }
  } else {
    offer = {
      headline: 'Один крок відділяє розуміння від результату.',
      ctaText: '✨ Спробувати 7 днів',
      callbackData: 'start_trial',
      expiresAt: new Date(Date.now() + 24 * 3600000),
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      settings: {
        ...settings,
        bannerOffer: {
          headline: offer.headline,
          ctaText: offer.ctaText,
          callbackData: offer.callbackData,
          expiresAt: offer.expiresAt.toISOString(),
        },
      },
    },
  })

  return offer
}
