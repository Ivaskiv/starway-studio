import type { BehavioralSnapshot } from '../behavioral/behavioralSnapshot.js'
import { interpretBehavioralSnapshot, summarizeBehavioralPriority, type BehavioralInterpretation } from '../behavioral/behavioralInterpreter.js'
import type { BehavioralPriority } from '../behavioral/behavioralPriority.js'

export interface MovementState {
  stalledAfterClarity: boolean
  repeatedAvoidance: boolean
  unstableRhythm: boolean
  unresolvedDecisionLoop: boolean
  overloadedActionState: boolean
  interruptedMomentum: boolean
}

export interface MovementInterpretation {
  priority: BehavioralPriority
  interpretation: BehavioralInterpretation
  movementState: MovementState
  nextMeaningfulAction: string
  summary: string
}

export function resolveMovementState(snapshot: BehavioralSnapshot): MovementState {
  return {
    stalledAfterClarity: Boolean(snapshot.unresolvedGoal || snapshot.lastMeaningfulAction),
    repeatedAvoidance: Boolean(snapshot.repeatedPostponedAction || snapshot.repeatedAvoidancePattern),
    unstableRhythm: Boolean(snapshot.dailyCycleInterrupted || snapshot.repeatedRollback),
    unresolvedDecisionLoop: Boolean(snapshot.unresolvedDecision),
    overloadedActionState: Boolean(snapshot.wheelImbalance || snapshot.emotionalPattern),
    interruptedMomentum: typeof snapshot.inactivityDays === 'number' ? snapshot.inactivityDays > 0 : false,
  }
}

export function interpretMovement(snapshot: BehavioralSnapshot): MovementInterpretation {
  const interpretation = interpretBehavioralSnapshot(snapshot)
  return {
    priority: interpretation.priority,
    interpretation,
    movementState: resolveMovementState(snapshot),
    nextMeaningfulAction: interpretation.nextMovement,
    summary: summarizeBehavioralPriority(interpretation.priority),
  }
}
