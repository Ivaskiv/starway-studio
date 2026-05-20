import type { BehavioralSnapshot } from './behavioralSnapshot.js'

export interface BehavioralMovementState {
  stalledAfterClarity: boolean
  repeatedAvoidance: boolean
  unstableRhythm: boolean
  unresolvedDecisionLoop: boolean
  overloadedActionState: boolean
  interruptedMomentum: boolean
}

export function resolveBehavioralMovementState(snapshot: BehavioralSnapshot): BehavioralMovementState {
  return {
    stalledAfterClarity: Boolean(snapshot.unresolvedGoal || snapshot.lastMeaningfulAction),
    repeatedAvoidance: Boolean(snapshot.repeatedPostponedAction || snapshot.repeatedAvoidancePattern),
    unstableRhythm: Boolean(snapshot.dailyCycleInterrupted || snapshot.repeatedRollback),
    unresolvedDecisionLoop: Boolean(snapshot.unresolvedDecision),
    overloadedActionState: Boolean(snapshot.wheelImbalance || snapshot.emotionalPattern),
    interruptedMomentum: typeof snapshot.inactivityDays === 'number' ? snapshot.inactivityDays > 0 : false,
  }
}
