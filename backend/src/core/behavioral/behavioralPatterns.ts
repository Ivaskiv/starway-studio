import type { BehavioralSignals } from './behavioralSignals.js'

export type BehavioralPattern =
  | 'repeated_action_avoidance'
  | 'unresolved_decision_loop'
  | 'rollback_pattern'
  | 'daily_interruption'
  | 'wheel_imbalance'
  | 'inactivity_gap'
  | 'focus_continuation'
  | 'emotional_overload'
  | 'unstable_state'
  | 'generic'

export interface BehavioralPatternAnalysis {
  mainPattern: BehavioralPattern
  riskLevel: 'low' | 'medium' | 'high'
  movementState: 'stalled' | 'stabilizing' | 'active'
  recommendedNarrative:
    | 'decision_pressure'
    | 'return_after_gap'
    | 'focus_continuation'
    | 'wheel_repair'
    | 'emotional_grounding'
    | 'stability_reset'
    | 'generic_return'
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0)
}

export function detectBehavioralPattern(signals: BehavioralSignals): BehavioralPatternAnalysis {
  if (hasText(signals.repeatedPostponedAction)) {
    return {
      mainPattern: 'repeated_action_avoidance',
      riskLevel: 'high',
      movementState: 'stalled',
      recommendedNarrative: 'decision_pressure',
    }
  }

  if (hasText(signals.unresolvedDecision)) {
    return {
      mainPattern: 'unresolved_decision_loop',
      riskLevel: 'high',
      movementState: 'stalled',
      recommendedNarrative: 'decision_pressure',
    }
  }

  if (signals.repeatedRollback) {
    return {
      mainPattern: 'rollback_pattern',
      riskLevel: 'high',
      movementState: 'stalled',
      recommendedNarrative: 'stability_reset',
    }
  }

  if (signals.dailyCycleInterrupted) {
    return {
      mainPattern: 'daily_interruption',
      riskLevel: signals.inactivityDays && signals.inactivityDays > 7 ? 'high' : 'medium',
      movementState: 'stalled',
      recommendedNarrative: 'return_after_gap',
    }
  }

  if (signals.wheelImbalance) {
    return {
      mainPattern: 'wheel_imbalance',
      riskLevel: signals.wheelImbalance.score <= 2 ? 'high' : 'medium',
      movementState: 'stalled',
      recommendedNarrative: 'wheel_repair',
    }
  }

  if (typeof signals.inactivityDays === 'number' && signals.inactivityDays > 0) {
    return {
      mainPattern: 'inactivity_gap',
      riskLevel: signals.inactivityDays >= 14 ? 'high' : 'medium',
      movementState: 'stalled',
      recommendedNarrative: 'return_after_gap',
    }
  }

  if (signals.emotionalPattern && signals.emotionalPattern.length > 0) {
    return {
      mainPattern: 'emotional_overload',
      riskLevel: 'medium',
      movementState: 'stabilizing',
      recommendedNarrative: 'emotional_grounding',
    }
  }

  if (signals.focusParticipation || hasText(signals.lastZoomTopic) || hasText(signals.currentFocus)) {
    return {
      mainPattern: 'focus_continuation',
      riskLevel: 'low',
      movementState: 'active',
      recommendedNarrative: 'focus_continuation',
    }
  }

  return {
    mainPattern: 'generic',
    riskLevel: 'low',
    movementState: 'stabilizing',
    recommendedNarrative: 'generic_return',
  }
}
