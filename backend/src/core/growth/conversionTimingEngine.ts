import type { BehaviorScore, Pattern } from '../behavior/types.js'

export type ConversionOfferType = 'trial' | 'discount' | 'standard'

export type ConversionTimingInput = {
  userId: string
  patterns: Pattern[]
  scores: BehaviorScore
  lastActivityAt: number
  now?: number
}

export type ConversionDecision = {
  shouldOffer: boolean
  timingScore: number
  reason: string
  offerType: ConversionOfferType
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function hoursSince(lastActivityAt: number, now: number) {
  const delta = Math.max(0, now - lastActivityAt)
  return delta / (60 * 60 * 1000)
}

export function evaluateConversionTiming(input: ConversionTimingInput): ConversionDecision {
  const now = input.now ?? Date.now()
  const recencyHours = hoursSince(input.lastActivityAt, now)
  const recencyBoost = recencyHours <= 6 ? 10 : recencyHours <= 24 ? 5 : -10
  const { engagement, consistency, procrastination, avoidance } = input.scores

  if (avoidance > 70 || input.patterns.includes('avoidance')) {
    return {
      shouldOffer: false,
      timingScore: clamp(avoidance - 20),
      reason: 'User is in uncertainty/avoidance mode; delay monetization and increase clarity first.',
      offerType: 'discount',
    }
  }

  if (engagement < 20) {
    return {
      shouldOffer: false,
      timingScore: clamp(engagement),
      reason: 'User is showing low value perception and low engagement; do not sell yet.',
      offerType: 'trial',
    }
  }

  if (engagement > 70 && consistency > 60) {
    return {
      shouldOffer: true,
      timingScore: clamp(engagement * 0.55 + consistency * 0.35 + recencyBoost),
      reason: 'High engagement and stable consistency indicate strong readiness for a standard paid offer.',
      offerType: 'standard',
    }
  }

  if (input.patterns.includes('drop_off') || procrastination > 70) {
    return {
      shouldOffer: true,
      timingScore: clamp(procrastination * 0.45 + (100 - consistency) * 0.25 + 35 + recencyBoost),
      reason: 'Recovery moment detected; use a low-friction trial offer instead of a hard sell.',
      offerType: 'trial',
    }
  }

  const baseline = clamp(engagement * 0.45 + consistency * 0.3 - avoidance * 0.2 + recencyBoost)
  return {
    shouldOffer: baseline >= 65,
    timingScore: baseline,
    reason: baseline >= 65
      ? 'Behavior signals are warm enough for a standard offer window.'
      : 'Signals are not strong enough for a conversion offer yet.',
    offerType: baseline >= 65 ? 'standard' : 'discount',
  }
}

function printCase(label: string, decision: ConversionDecision) {
  console.log(`\n[ConversionTiming] ${label}`)
  console.log(decision)
}

export function simulateConversionTiming() {
  const now = Date.now()
  const cases = {
    highEngagement: evaluateConversionTiming({
      userId: 'sim-high-engagement',
      patterns: ['high_engagement'],
      scores: { procrastination: 10, avoidance: 15, engagement: 82, consistency: 74 },
      lastActivityAt: now - 30 * 60 * 1000,
      now,
    }),
    procrastination: evaluateConversionTiming({
      userId: 'sim-procrastination',
      patterns: ['procrastination'],
      scores: { procrastination: 84, avoidance: 30, engagement: 34, consistency: 29 },
      lastActivityAt: now - 2 * 60 * 60 * 1000,
      now,
    }),
    avoidance: evaluateConversionTiming({
      userId: 'sim-avoidance',
      patterns: ['avoidance'],
      scores: { procrastination: 22, avoidance: 79, engagement: 40, consistency: 48 },
      lastActivityAt: now - 90 * 60 * 1000,
      now,
    }),
    lowEngagement: evaluateConversionTiming({
      userId: 'sim-low-engagement',
      patterns: ['drop_off'],
      scores: { procrastination: 25, avoidance: 24, engagement: 14, consistency: 31 },
      lastActivityAt: now - 26 * 60 * 60 * 1000,
      now,
    }),
  }

  printCase('high engagement', cases.highEngagement)
  printCase('procrastination', cases.procrastination)
  printCase('avoidance', cases.avoidance)
  printCase('low engagement', cases.lowEngagement)

  return cases
}
