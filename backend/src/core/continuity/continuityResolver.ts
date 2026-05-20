import type { BehavioralSnapshot } from '../behavioral/behavioralSnapshot.js'
import { buildBehavioralSnapshot } from '../behavioral/behavioralSnapshot.js'
import { resolveRelationshipMemory, type RelationshipMemoryProfile } from '../memory/relationshipMemory.js'
import { interpretMovement, type MovementInterpretation } from './movementInterpreter.js'
import { resolveContinuitySignals, type ContinuitySignals } from './continuitySignals.js'

export type ContinuityMode = 'return_after_gap' | 'after_focus' | 'after_test' | 'after_interruption' | 'after_unresolved_goal' | 'after_repeated_action' | 'generic'

export interface BehavioralContinuityResolution {
  snapshot: BehavioralSnapshot
  signals: ContinuitySignals
  interpretation: MovementInterpretation
  continuityMode: ContinuityMode
  recommendedNextAction: string
  primaryBlock: string | null
  unresolvedAction: string | null
  repeatedPattern: string | null
  inactiveDays: number | null
  lastMeaningfulFocus: string | null
  lastZoomTopic: string | null
  relationship: RelationshipMemoryProfile | null
}

function resolveContinuityMode(signals: ContinuitySignals): ContinuityMode {
  if (signals.repeatedPostponedAction) return 'after_repeated_action'
  if (signals.repeatedUnfinishedDecision) return 'after_unresolved_goal'
  if (signals.repeatedRollbackPatterns) return 'after_interruption'
  if (signals.interruptedDailyCycles) return 'after_interruption'
  if (signals.wheelImbalance) return 'after_focus'
  if (typeof signals.inactiveDuration === 'number' && signals.inactiveDuration > 0) return 'return_after_gap'
  if (signals.focusParticipation) return 'after_focus'
  return 'generic'
}

function pickPrimaryBlock(snapshot: BehavioralSnapshot): string | null {
  return snapshot.dominantBlock ?? null
}

export async function resolveBehavioralContinuity(userId: string): Promise<BehavioralContinuityResolution> {
  const [snapshot, relationship] = await Promise.all([
    buildBehavioralSnapshot(userId),
    resolveRelationshipMemory(userId, 'absystem').catch(() => null),
  ])
  const signals = resolveContinuitySignals(snapshot)
  const interpretation = interpretMovement(snapshot)

  return {
    snapshot,
    signals,
    interpretation,
    continuityMode: resolveContinuityMode(signals),
    recommendedNextAction: interpretation.nextMeaningfulAction,
    primaryBlock: pickPrimaryBlock(snapshot),
    unresolvedAction: signals.repeatedPostponedAction ?? signals.unresolvedGoal,
    repeatedPattern: signals.repeatedHesitationPattern ?? signals.repeatedPostponedAction,
    inactiveDays: signals.inactiveDuration,
    lastMeaningfulFocus: signals.unresolvedGoal,
    lastZoomTopic: signals.lastZoomTopic,
    relationship,
  }
}
