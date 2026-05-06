import { evaluatePaywall, type PaywallDecision } from '../growth/paywallEngine.js'
import type { Pattern } from '../behavior/types.js'
import type { BehaviorScores } from '../mentor/types.js'
import type { ConversionOpportunityEvent } from '../growth/conversionEmitter.js'

type BuildPaywallInput = {
  userId: string
  patterns: Pattern[]
  scores: Partial<BehaviorScores>
}

export function buildPaywall(
  conversion: ConversionOpportunityEvent,
  userState: BuildPaywallInput,
): PaywallDecision {
  return evaluatePaywall({
    conversion: {
      triggered: conversion.triggered,
      offerType: conversion.offerType,
      timingScore: conversion.timingScore,
    },
    userState: {
      patterns: userState.patterns,
      scores: {
        procrastination: userState.scores.procrastination ?? 0,
        avoidance: userState.scores.avoidance ?? 0,
        engagement: userState.scores.engagement ?? 0,
        consistency: userState.scores.consistency ?? 0,
      },
    },
  })
}
