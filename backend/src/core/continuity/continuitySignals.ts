import type { BehavioralSnapshot } from '../behavioral/behavioralSnapshot.js'

export interface ContinuitySignals {
  unresolvedGoal: string | null
  repeatedPostponedAction: string | null
  wheelImbalance: { weakestArea: string; score: number } | null
  interruptedDailyCycles: boolean
  repeatedRollbackPatterns: boolean
  focusParticipation: boolean
  lastZoomTopic: string | null
  inactiveDuration: number | null
  unfinishedStrategyNode: string | null
  repeatedHesitationPattern: string | null
  repeatedUnfinishedDecision: string | null
  lastMeaningfulMovement: string | null
  emotionalOverload: string | null
  movementInstability: 'low' | 'medium' | 'high'
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? null
}

export function resolveContinuitySignals(snapshot: BehavioralSnapshot): ContinuitySignals {
  return {
    unresolvedGoal: firstNonEmpty(snapshot.unresolvedGoal, snapshot.currentFocus, snapshot.unfinishedStrategyNode),
    repeatedPostponedAction: firstNonEmpty(snapshot.repeatedPostponedAction),
    wheelImbalance: snapshot.wheelImbalance ?? null,
    interruptedDailyCycles: Boolean(snapshot.dailyCycleInterrupted),
    repeatedRollbackPatterns: Boolean(snapshot.repeatedRollback),
    focusParticipation: Boolean(snapshot.focusParticipation),
    lastZoomTopic: firstNonEmpty(snapshot.lastZoomTopic),
    inactiveDuration: typeof snapshot.inactivityDays === 'number' ? snapshot.inactivityDays : null,
    unfinishedStrategyNode: firstNonEmpty(snapshot.unfinishedStrategyNode),
    repeatedHesitationPattern: firstNonEmpty(snapshot.repeatedAvoidancePattern),
    repeatedUnfinishedDecision: firstNonEmpty(snapshot.unresolvedDecision),
    lastMeaningfulMovement: firstNonEmpty(snapshot.lastMeaningfulAction),
    emotionalOverload: firstNonEmpty(snapshot.emotionalPattern),
    movementInstability: snapshot.momentumLevel === 'high' ? 'high' : snapshot.momentumLevel === 'medium' ? 'medium' : 'low',
  }
}
