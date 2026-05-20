import { resolveBehavioralPriority } from './behavioralPriority.js'
import { buildBehavioralNarrative, type BehavioralNarrativeSurface } from './behavioralNarrative.js'
import { summarizeBehavioralPriority } from './behavioralInterpreter.js'
import { buildBehavioralSnapshot, type BehavioralSnapshot } from './behavioralSnapshot.js'
import { interpretBehavioralSnapshot } from './behavioralInterpreter.js'

export interface BehavioralContinuity {
  snapshot: BehavioralSnapshot
  unresolvedFocus: string | null
  repeatedBlocker: string | null
  comebackContext: string[]
  continuitySummary: string
  emotionalDirection: string
  nextMeaningfulAction: string
  movementState: string
}

function pickFirstText(...values: Array<string | null | undefined>): string | null {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? null
}

function resolveEmotionalDirection(snapshot: BehavioralSnapshot): string {
  switch (snapshot.momentumLevel) {
    case 'high':
      return 'рух тримається'
    case 'medium':
      return 'рух відновлюється'
    case 'low':
    default:
      return 'рух потребує м’якого повернення'
  }
}

export async function resolveBehavioralContinuity(userId: string): Promise<BehavioralContinuity> {
  const snapshot = await buildBehavioralSnapshot(userId)
  const interpretation = interpretBehavioralSnapshot(snapshot)
  const priority = resolveBehavioralPriority(snapshot)
  const unresolvedFocus = pickFirstText(
    snapshot.unresolvedGoal,
    snapshot.currentFocus,
    snapshot.unfinishedStrategyNode,
  )
  const repeatedBlocker = pickFirstText(
    snapshot.repeatedPostponedAction,
    snapshot.unresolvedDecision,
    snapshot.repeatedAvoidancePattern,
  )
  const comebackContext = [
    snapshot.lastMeaningfulAction,
    snapshot.lastZoomTopic,
    snapshot.lastWeeklyReportInsight,
  ].filter((value): value is string => Boolean(value && value.trim().length > 0))

  return {
    snapshot,
    unresolvedFocus,
    repeatedBlocker,
    comebackContext,
    continuitySummary: [
      interpretation.recognition,
      interpretation.interpretation,
      interpretation.nextMovement,
    ].join(' '),
    emotionalDirection: resolveEmotionalDirection(snapshot),
    nextMeaningfulAction: interpretation.nextMovement,
    movementState: summarizeBehavioralPriority(priority),
  }
}

export function renderTelegramMessage(
  continuity: BehavioralContinuity,
  surface: BehavioralNarrativeSurface = 'default',
) {
  return buildBehavioralNarrative(continuity.snapshot, surface)
}
