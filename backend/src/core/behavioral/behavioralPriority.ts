import type { BehavioralSnapshot } from './behavioralSnapshot.js'

export type BehavioralPriority =
  | 'repeatedPostponedAction'
  | 'unresolvedDecision'
  | 'rollbackPattern'
  | 'dailyCycleInterrupted'
  | 'wheelImbalance'
  | 'emotionalOverload'
  | 'unstableState'
  | 'inactiveGap'
  | 'focusContinuation'
  | 'genericFallback'

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function resolveBehavioralPriority(snapshot: BehavioralSnapshot): BehavioralPriority {
  if (hasText(snapshot.repeatedPostponedAction)) return 'repeatedPostponedAction'
  if (hasText(snapshot.unresolvedDecision)) return 'unresolvedDecision'
  if (snapshot.repeatedRollback) return 'rollbackPattern'
  if (snapshot.dailyCycleInterrupted) return 'dailyCycleInterrupted'
  if (snapshot.wheelImbalance) return 'wheelImbalance'
  if (typeof snapshot.emotionalPattern === 'string' && snapshot.emotionalPattern.trim().length > 0) return 'emotionalOverload'
  if (snapshot.momentumLevel === 'low' && (snapshot.inactivityDays ?? 0) > 0) return 'unstableState'
  if (typeof snapshot.inactivityDays === 'number' && snapshot.inactivityDays > 0) return 'inactiveGap'
  if (snapshot.focusParticipation || hasText(snapshot.currentFocus) || hasText(snapshot.lastZoomTopic)) return 'focusContinuation'
  return 'genericFallback'
}
