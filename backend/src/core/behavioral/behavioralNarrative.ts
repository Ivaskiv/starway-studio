import { absystemContent } from '@/products/absystem/config/content.js'

import type { BehavioralSnapshot } from './behavioralSnapshot.js'
import { buildBehavioralNarrative as buildBehavioralNarrativeText } from './buildBehavioralNarrative.js'
import { interpretBehavioralSnapshot, isMeaningfulPriority } from './behavioralInterpreter.js'

export type BehavioralNarrativeSurface = 'start' | 'status' | 'recovery' | 'focus' | 'ai' | 'default'

export interface BehavioralNarrative {
  title: string
  body: string[]
  cta: { text: string; callback_data: string }
}

function chooseCta(snapshot: BehavioralSnapshot, surface: BehavioralNarrativeSurface, priority: string) {
  if (surface === 'status') {
    return { text: absystemContent.behavioral.cta.continue, callback_data: 'continue_ai_mentor' }
  }

  if (surface === 'focus') {
    return { text: absystemContent.behavioral.cta.focus, callback_data: 'open_focus_portal' }
  }

  if (surface === 'ai') {
    return { text: absystemContent.behavioral.cta.mentor, callback_data: 'continue_ai_mentor' }
  }

  if (priority === 'repeatedPostponedAction' || priority === 'unresolvedDecision' || priority === 'rollbackPattern') {
    return { text: absystemContent.behavioral.cta.mentor, callback_data: 'continue_ai_mentor' }
  }

  if (priority === 'wheelImbalance') {
    return { text: absystemContent.behavioral.cta.platform, callback_data: 'open_platform' }
  }

  if (priority === 'inactiveGap' || priority === 'dailyCycleInterrupted') {
    return { text: absystemContent.behavioral.cta.continue, callback_data: 'return_main_menu' }
  }

  if (snapshot.focusParticipation) {
    return { text: absystemContent.behavioral.cta.focus, callback_data: 'open_focus_portal' }
  }

  return { text: absystemContent.behavioral.cta.continue, callback_data: 'continue_ai_mentor' }
}

export function buildBehavioralNarrative(snapshot: BehavioralSnapshot, surface: BehavioralNarrativeSurface = 'default'): BehavioralNarrative {
  const interpretation = interpretBehavioralSnapshot(snapshot)
  const priority = interpretation.priority
  const cta = chooseCta(snapshot, surface, priority)

  const body: string[] = []

  if (surface === 'status') {
    body.push(absystemContent.behavioral.title)
  }

  if (isMeaningfulPriority(priority)) {
    body.push(interpretation.recognition)
    body.push(interpretation.interpretation)
    body.push(interpretation.nextMovement)
  } else {
    body.push(absystemContent.behavioral.narrative.genericFallback[0])
    body.push(absystemContent.behavioral.narrative.genericFallback[1])
  }

  return {
    title: absystemContent.behavioral.title,
    body: body.filter((line) => line.trim().length > 0).slice(0, 3),
    cta,
  }
}

export function buildBehavioralRecoveryBody(snapshot: BehavioralSnapshot): string {
  const narrative = buildBehavioralNarrative(snapshot, 'recovery')
  return narrative.body.join('\n')
}

export { buildBehavioralNarrativeText }
