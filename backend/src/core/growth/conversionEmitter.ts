import { prisma } from '../../db/client.js'
import { trackEvent } from '../../modules/events/service.js'
import type { ConversionDecision, ConversionOfferType } from './conversionTimingEngine.js'

export type ConversionOpportunityEvent = {
  type: 'conversion_opportunity'
  userId: string
  triggered: true
  timingScore: number
  offerType: ConversionOfferType
  reason: string
  timestamp: number
}

const OFFER_COOLDOWN_MS = 24 * 60 * 60 * 1000
const lastOfferAt = new Map<string, number>()

function inCooldown(userId: string, now: number) {
  const last = lastOfferAt.get(userId) ?? 0
  return now - last < OFFER_COOLDOWN_MS
}

async function hasActiveSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
  })

  if (!subscription) return false
  const now = Date.now()

  if (subscription.status === 'ACTIVE') return true
  if (subscription.status === 'TRIAL' && subscription.trialEndsAt) {
    return subscription.trialEndsAt.getTime() > now
  }
  if (subscription.currentPeriodEnd) {
    return subscription.currentPeriodEnd.getTime() > now
  }

  return false
}

export async function emitConversionOpportunity(params: {
  userId: string
  decision: ConversionDecision
  source?: 'web' | 'telegram' | 'miniapp'
}): Promise<ConversionOpportunityEvent | null> {
  const now = Date.now()

  if (!params.decision.shouldOffer) {
    console.log('[CONVERSION]', { userId: params.userId, status: 'skipped', reason: 'decision_false' })
    return null
  }

  if (inCooldown(params.userId, now)) {
    console.log('[CONVERSION]', { userId: params.userId, status: 'skipped', reason: 'cooldown' })
    return null
  }

  if (await hasActiveSubscription(params.userId)) {
    console.log('[CONVERSION]', { userId: params.userId, status: 'skipped', reason: 'already_subscribed' })
    return null
  }

  const event: ConversionOpportunityEvent = {
    type: 'conversion_opportunity',
    userId: params.userId,
    triggered: true,
    timingScore: params.decision.timingScore,
    offerType: params.decision.offerType,
    reason: params.decision.reason,
    timestamp: now,
  }

  lastOfferAt.set(params.userId, now)
  console.log('[CONVERSION]', { status: 'emitted', ...event })

  void trackEvent({
    userId: params.userId,
    type: 'conversion_opportunity',
    source: params.source ?? 'web',
    state: event.offerType,
    payload: {
      timingScore: event.timingScore,
      offerType: event.offerType,
      reason: event.reason,
      timestamp: event.timestamp,
    },
  })

  return event
}
