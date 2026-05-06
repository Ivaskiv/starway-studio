import type { BehaviorScore, Pattern } from '../behavior/types.js'
import type { ConversionOfferType } from './conversionTimingEngine.js'

export type PaywallConversionInput = {
  triggered: boolean
  offerType: ConversionOfferType
  timingScore: number
}

export type PaywallUserStateInput = {
  patterns: Pattern[]
  scores: Pick<BehaviorScore, 'procrastination' | 'avoidance' | 'engagement' | 'consistency'>
}

export type PaywallPlan = 'entry' | 'growth' | 'architect'
export type PaywallPeriod = 'monthly' | 'one_time'

export type PaywallDecision = {
  show: boolean
  plan: PaywallPlan
  price: number
  period: PaywallPeriod
  cta: string
  reason: string
}

type PaywallEngineInput = {
  conversion: PaywallConversionInput
  userState: PaywallUserStateInput
}

const HIDDEN_DECISION: PaywallDecision = {
  show: false,
  plan: 'entry',
  price: 33,
  period: 'monthly',
  cta: 'Почати безкоштовно',
  reason: 'Paywall suppressed because conversion conditions are not strong enough.',
}

export function evaluatePaywall(input: PaywallEngineInput): PaywallDecision {
  const { conversion, userState } = input
  const { engagement, avoidance } = userState.scores
  const hasAvoidance = avoidance > 70 || userState.patterns.includes('avoidance')

  if (!conversion.triggered) {
    return {
      ...HIDDEN_DECISION,
      reason: 'Paywall suppressed because conversion was not triggered.',
    }
  }

  if (hasAvoidance) {
    return {
      ...HIDDEN_DECISION,
      reason: 'Paywall suppressed because avoidance is high and clarity should come first.',
    }
  }

  if (conversion.timingScore > 85) {
    return {
      show: true,
      plan: 'architect',
      price: 1999,
      period: 'one_time',
      cta: 'Почати трансформацію',
      reason: 'High timing score indicates readiness for the architect-tier transformation offer.',
    }
  }

  if (conversion.offerType === 'trial') {
    return {
      show: true,
      plan: 'entry',
      price: 33,
      period: 'monthly',
      cta: 'Почати безкоштовно',
      reason: 'Trial conversion signal maps to the low-friction entry plan.',
    }
  }

  if (conversion.offerType === 'standard' && engagement > 70) {
    return {
      show: true,
      plan: 'growth',
      price: 99,
      period: 'monthly',
      cta: 'Розблокувати ріст',
      reason: 'High engagement with a standard conversion signal maps to the growth plan.',
    }
  }

  return {
    ...HIDDEN_DECISION,
    reason: 'Paywall suppressed because no pricing rule matched strongly enough.',
  }
}

export function formatPaywallDecisionLog(decision: PaywallDecision) {
  return `[PAYWALL] show=${decision.show} plan=${decision.plan} price=${decision.price} period=${decision.period} cta="${decision.cta}" reason="${decision.reason}"`
}
