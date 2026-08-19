import type { BehavioralSnapshot } from './behavioralSnapshot.js'
import { resolveBehavioralPriority, type BehavioralPriority } from './behavioralPriority.js'
import { absystemContent } from '@/products/absystem/config/content.js'
import { detectBehavioralPattern, type BehavioralPattern } from './behavioralPatterns.js'
import { resolveBehavioralMovementState, type BehavioralMovementState } from './behavioralMovement.js'

export interface BehavioralInterpretation {
  mainPattern: BehavioralPattern
  priority: BehavioralPriority
  riskLevel: 'low' | 'medium' | 'high'
  movementState: BehavioralMovementState
  recognition: string
  interpretation: string
  nextMovement: string
  recommendedNarrative: string
}

function resolveNarrativeKey(pattern: BehavioralPattern): string {
  switch (pattern) {
    case 'repeated_action_avoidance':
    case 'unresolved_decision_loop':
      return 'decision_pressure'
    case 'rollback_pattern':
    case 'unstable_state':
      return 'stability_reset'
    case 'daily_interruption':
    case 'inactivity_gap':
      return 'return_after_gap'
    case 'wheel_imbalance':
      return 'wheel_repair'
    case 'focus_continuation':
      return 'focus_continuation'
    case 'emotional_overload':
      return 'emotional_grounding'
    case 'generic':
    default:
      return 'generic_return'
  }
}

function resolveRecognition(snapshot: BehavioralSnapshot, priority: BehavioralPriority): string {
  switch (priority) {
    case 'repeatedPostponedAction':
      return snapshot.repeatedPostponedAction
        ? absystemContent.behavioral.narrative.repeatedPostponedAction(snapshot.repeatedPostponedAction)[0]
        : absystemContent.behavioral.narrative.genericFallback[0]
    case 'unresolvedDecision':
      return snapshot.unresolvedDecision
        ? absystemContent.behavioral.narrative.unresolvedDecision(snapshot.unresolvedDecision)[0]
        : absystemContent.behavioral.narrative.genericFallback[0]
    case 'rollbackPattern':
      return snapshot.repeatedAvoidancePattern
        ? absystemContent.behavioral.narrative.rollbackPattern(snapshot.repeatedAvoidancePattern)[0]
        : absystemContent.behavioral.narrative.genericFallback[0]
    case 'dailyCycleInterrupted':
      return absystemContent.behavioral.narrative.dailyCycleInterrupted[0]
    case 'wheelImbalance':
      return snapshot.wheelImbalance
        ? absystemContent.behavioral.narrative.wheelImbalance(snapshot.wheelImbalance.weakestArea)[0]
        : absystemContent.behavioral.narrative.genericFallback[0]
    case 'emotionalOverload':
      return absystemContent.behavioral.narrative.emotionalOverload[0]
    case 'unstableState':
      return absystemContent.behavioral.narrative.unstableState[0]
    case 'inactiveGap':
      return typeof snapshot.inactivityDays === 'number'
        ? absystemContent.behavioral.narrative.inactiveGap(snapshot.inactivityDays)[0]
        : absystemContent.behavioral.narrative.genericFallback[0]
    case 'focusContinuation':
      return snapshot.currentFocus || snapshot.lastZoomTopic
        ? absystemContent.behavioral.start.afterFocus[0]
        : absystemContent.behavioral.start.afterActive[0]
    case 'genericFallback':
    default:
      return absystemContent.behavioral.narrative.genericFallback[0]
  }
}

function resolveInterpretation(snapshot: BehavioralSnapshot, priority: BehavioralPriority): string {
  switch (priority) {
    case 'repeatedPostponedAction':
      return snapshot.repeatedPostponedAction
        ? absystemContent.behavioral.narrative.repeatedPostponedAction(snapshot.repeatedPostponedAction)[1]
        : absystemContent.behavioral.narrative.genericFallback[1]
    case 'unresolvedDecision':
      return snapshot.unresolvedDecision
        ? absystemContent.behavioral.narrative.unresolvedDecision(snapshot.unresolvedDecision)[1]
        : absystemContent.behavioral.narrative.genericFallback[1]
    case 'rollbackPattern':
      return snapshot.repeatedAvoidancePattern
        ? absystemContent.behavioral.narrative.rollbackPattern(snapshot.repeatedAvoidancePattern)[1]
        : absystemContent.behavioral.narrative.genericFallback[1]
    case 'dailyCycleInterrupted':
      return absystemContent.behavioral.narrative.dailyCycleInterrupted[1]
    case 'wheelImbalance':
      return absystemContent.behavioral.narrative.wheelImbalance(snapshot.wheelImbalance?.weakestArea ?? '')[1]
    case 'emotionalOverload':
      return absystemContent.behavioral.narrative.emotionalOverload[1]
    case 'unstableState':
      return absystemContent.behavioral.narrative.unstableState[1]
    case 'inactiveGap':
      return absystemContent.behavioral.narrative.inactiveGap(snapshot.inactivityDays ?? 0)[1]
    case 'focusContinuation':
      return absystemContent.behavioral.start.afterFocus[1]
    case 'genericFallback':
    default:
      return absystemContent.behavioral.narrative.genericFallback[1]
  }
}

function resolveNextMovement(snapshot: BehavioralSnapshot, priority: BehavioralPriority): string {
  switch (priority) {
    case 'repeatedPostponedAction':
    case 'unresolvedDecision':
      return snapshot.repeatedPostponedAction
        ? absystemContent.behavioral.narrative.repeatedPostponedAction(snapshot.repeatedPostponedAction)[2]
        : absystemContent.behavioral.narrative.genericFallback[1]
    case 'rollbackPattern':
      return snapshot.repeatedAvoidancePattern
        ? absystemContent.behavioral.narrative.rollbackPattern(snapshot.repeatedAvoidancePattern)[2]
        : absystemContent.behavioral.narrative.genericFallback[1]
    case 'dailyCycleInterrupted':
      return absystemContent.behavioral.narrative.dailyCycleInterrupted[2]
    case 'wheelImbalance':
      return absystemContent.behavioral.narrative.wheelImbalance(snapshot.wheelImbalance?.weakestArea ?? '')[2]
    case 'emotionalOverload':
      return absystemContent.behavioral.narrative.emotionalOverload[2]
    case 'unstableState':
      return absystemContent.behavioral.narrative.unstableState[2]
    case 'inactiveGap':
      return absystemContent.behavioral.narrative.inactiveGap(snapshot.inactivityDays ?? 0)[2]
    case 'focusContinuation':
      return absystemContent.behavioral.start.afterFocus[1]
    case 'genericFallback':
    default:
      return absystemContent.behavioral.narrative.genericFallback[1]
  }
}

function resolveRiskLevel(priority: BehavioralPriority): 'low' | 'medium' | 'high' {
  switch (priority) {
    case 'repeatedPostponedAction':
    case 'unresolvedDecision':
    case 'rollbackPattern':
    case 'dailyCycleInterrupted':
    case 'wheelImbalance':
      return 'high'
    case 'emotionalOverload':
    case 'unstableState':
    case 'inactiveGap':
      return 'medium'
    case 'focusContinuation':
    case 'genericFallback':
    default:
      return 'low'
  }
}

export function interpretBehavioralSnapshot(snapshot: BehavioralSnapshot): BehavioralInterpretation {
  const priority = resolveBehavioralPriority(snapshot)
  const pattern = detectBehavioralPattern({
    unresolvedGoal: snapshot.unresolvedGoal ?? null,
    repeatedPostponedAction: snapshot.repeatedPostponedAction ?? null,
    unresolvedDecision: snapshot.unresolvedDecision ?? null,
    repeatedRollback: Boolean(snapshot.repeatedRollback),
    inactivityDays: typeof snapshot.inactivityDays === 'number' ? snapshot.inactivityDays : null,
    wheelImbalance: snapshot.wheelImbalance ?? undefined,
    lastMeaningfulAction: snapshot.lastMeaningfulAction ?? null,
    unfinishedStrategyNode: snapshot.unfinishedStrategyNode ?? null,
    lastZoomTopic: snapshot.lastZoomTopic ?? null,
    dailyCycleInterrupted: Boolean(snapshot.dailyCycleInterrupted),
    emotionalPattern: snapshot.emotionalPattern ?? null,
    momentumLevel: snapshot.momentumLevel ?? 'low',
    focusParticipation: Boolean(snapshot.focusParticipation),
    focusSessionsCount: snapshot.focusSessionsCount ?? 0,
    lastWeeklyReportInsight: snapshot.lastWeeklyReportInsight ?? null,
    repeatedAvoidancePattern: snapshot.repeatedAvoidancePattern ?? null,
    currentFocus: snapshot.currentFocus ?? null,
  })
  const movementState = resolveBehavioralMovementState(snapshot)

  return {
    mainPattern: pattern.mainPattern,
    priority,
    riskLevel: resolveRiskLevel(priority),
    movementState,
    recognition: resolveRecognition(snapshot, priority),
    interpretation: resolveInterpretation(snapshot, priority),
    nextMovement: resolveNextMovement(snapshot, priority),
    recommendedNarrative: resolveNarrativeKey(pattern.mainPattern),
  }
}

export function summarizeBehavioralPriority(priority: BehavioralPriority): string {
  switch (priority) {
    case 'repeatedPostponedAction':
      return 'повторюваний вузол'
    case 'unresolvedDecision':
      return 'незавершене рішення'
    case 'rollbackPattern':
      return 'повторюваний відкат'
    case 'dailyCycleInterrupted':
      return 'перерваний щоденний рух'
    case 'wheelImbalance':
      return 'нерівний рух у колесі'
    case 'emotionalOverload':
      return 'емоційне перевантаження'
    case 'unstableState':
      return 'нестабільний стан'
    case 'inactiveGap':
      return 'пауза в русі'
    case 'focusContinuation':
      return 'продовження знайомої дії'
    case 'genericFallback':
    default:
      return 'найближча дія'
  }
}

export function isMeaningfulPriority(priority: BehavioralPriority): boolean {
  return priority !== 'genericFallback'
}
