import {
  ZERO_BREAKDOWN,
} from './config'
import {
  buildBehavioralNarrative,
  buildNextAction,
  resolveNextActionCtaLabel,
} from './narrative'
import {
  buildInactivityDays,
  resolveCanonicalTestResultLocal,
} from './scoring'
import type {
  AbTestQuestion,
  AbTestResult,
  AbTestResultType,
} from './types'

function resolveDominantBlock(
  type: AbTestResultType
): AbTestResult['dominantBlock'] {
  return type.toLowerCase() as AbTestResult['dominantBlock']
}

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

export function isAbTestResultType(value: unknown): value is AbTestResultType {
  return (
    typeof value === 'string' &&
    ['STATE', 'GOAL', 'CHOICE', 'DECISION', 'ACTION'].includes(value)
  )
}

export function buildAnonymousResult(
  questions: AbTestQuestion[],
  answers: Record<string, string>
): AbTestResult {
  const canonical = resolveCanonicalTestResultLocal(questions, answers)
  const dominantBlock = resolveDominantBlock(canonical.type)
  const scoredAnswers = canonical.scoredAnswers
  const goalAnswer = scoredAnswers.find((item) => item.category === 'goal')
  const actionAnswer = [...scoredAnswers].sort(
    (left, right) => left.score - right.score
  )[0]
  const dominantAnswer = scoredAnswers.find(
    (item) => item.category === dominantBlock
  )
  const inactivityDays = buildInactivityDays(scoredAnswers)

  const snapshot: Parameters<typeof buildBehavioralNarrative>[0] = {
    currentFocus:
      normalizeText(goalAnswer?.answerText ?? dominantAnswer?.answerText) ??
      undefined,
    unresolvedGoal:
      normalizeText(
        goalAnswer?.answerText ??
          dominantAnswer?.answerText ??
          'одну конкретну точку, яку потрібно зафіксувати'
      ) ?? 'одну конкретну точку, яку потрібно зафіксувати',
    repeatedPostponedAction:
      normalizeText(
        actionAnswer?.answerText ??
          'перший конкретний крок, який давно проситься в рух'
      ) ?? 'перший конкретний крок, який давно проситься в рух',
    dominantBlock,
    inactivityDays,
    repeatedRollback:
      dominantBlock === 'decision' &&
      Boolean(actionAnswer) &&
      actionAnswer.score <= 3,
    wheelImbalance: undefined as
      | { weakestArea: string; score: number }
      | undefined,
    lastMeaningfulAction:
      normalizeText(actionAnswer?.answerText ?? dominantAnswer?.answerText) ??
      undefined,
    unfinishedStrategyNode:
      normalizeText(goalAnswer?.answerText ?? dominantAnswer?.answerText) ??
      undefined,
    lastZoomTopic: undefined as string | undefined,
    dailyCycleInterrupted: inactivityDays >= 3,
    emotionalPattern:
      dominantBlock === 'state'
        ? 'напруга на старті'
        : dominantBlock === 'decision'
          ? 'напруга у виборі'
          : dominantBlock === 'action'
            ? 'напруга у першому кроці'
            : undefined,
    momentumLevel:
      dominantBlock === 'state'
        ? 'low'
        : dominantBlock === 'decision'
          ? inactivityDays >= 7
            ? 'low'
            : 'medium'
          : dominantBlock === 'action'
            ? 'medium'
            : 'high',
  }

  const categoryBreakdown = {
    ...ZERO_BREAKDOWN,
    ...canonical.categoryBreakdown,
  }

  return {
    type: canonical.type,
    dominantScore: canonical.dominantScore,
    categoryBreakdown,
    dominantBlock,
    unresolvedGoal:
      snapshot.unresolvedGoal ??
      'одну конкретну точку, яку потрібно зафіксувати',
    repeatedPostponedAction:
      snapshot.repeatedPostponedAction ??
      'перший конкретний крок, який давно проситься в рух',
    inactivityDays,
    narrative: buildBehavioralNarrative(snapshot),
    nextAction: buildNextAction(dominantBlock),
    nextActionCta: resolveNextActionCtaLabel(dominantBlock),
  }
}

export function buildStoredResultFromType(type: AbTestResultType): AbTestResult {
  const dominantBlock = resolveDominantBlock(type)
  const snapshot: Parameters<typeof buildBehavioralNarrative>[0] = {
    dominantBlock,
  }

  return {
    type,
    dominantScore: 0,
    categoryBreakdown: { ...ZERO_BREAKDOWN },
    dominantBlock,
    unresolvedGoal: 'Результат збережено в акаунті.',
    repeatedPostponedAction:
      'Повернись до першого кроку, який ти визначила в тесті.',
    inactivityDays: 0,
    narrative: buildBehavioralNarrative(snapshot),
    nextAction: buildNextAction(dominantBlock),
    nextActionCta: resolveNextActionCtaLabel(dominantBlock),
  }
}
