import {
  type AbTestAnswerKey,
  type AbTestQuestionId,
} from '@/products/ab-system/content/abTest.questions.js'
import type { Prisma } from '@starway/db/prisma-client'

export const CANONICAL_TEST_STATE_IDS = [
  'S0_TRAFFIC',
  'S1_TEST_STARTED',
  'S2_TEST_QUESTIONS',
  'S3_TEST_RESULT',
] as const

export type CanonicalTestStateId = (typeof CANONICAL_TEST_STATE_IDS)[number]

export const CANONICAL_TEST_EVENTS = [
  'TEST_OPENED',
  'TEST_STARTED',
  'QUESTION_ANSWERED',
  'TEST_COMPLETED',
  'RESULT_OPENED',
  'CTA_FOCUS_CLICKED',
  'TEST_EXITED',
] as const

export type CanonicalTestEventType = (typeof CANONICAL_TEST_EVENTS)[number]

type CanonicalTestAiMode = 'lead_mode_only'
export type CanonicalTestResultType =
  | 'STATE'
  | 'GOAL'
  | 'CHOICE'
  | 'DECISION'
  | 'ACTION'

export type CanonicalTestResult = {
  type: CanonicalTestResultType
  dominantScore: number
  categoryBreakdown: Record<CanonicalTestResultType, number>
}

export type CanonicalTestStateDefinition = {
  id: CanonicalTestStateId
  allowed_cta: readonly string[]
  forbidden_cta: readonly string[]
  next_states: readonly CanonicalTestStateId[]
  ai_mode: CanonicalTestAiMode
  analytics_hooks: readonly string[]
}

export type CanonicalTestEventDefinition = {
  source: 'web' | 'telegram' | 'miniapp' | 'cross_channel'
  payload: readonly string[]
  trigger: string
  next_transition: readonly CanonicalTestStateId[]
}

export const CANONICAL_TEST_STATES: Record<
  CanonicalTestStateId,
  CanonicalTestStateDefinition
> = {
  S0_TRAFFIC: {
    id: 'S0_TRAFFIC',
    allowed_cta: ['start_test', 'open_test'],
    forbidden_cta: ['platform_upgrade', 'high_ticket_offer', 'mentor_sell'],
    next_states: ['S1_TEST_STARTED'],
    ai_mode: 'lead_mode_only',
    analytics_hooks: ['test_start_time'],
  },
  S1_TEST_STARTED: {
    id: 'S1_TEST_STARTED',
    allowed_cta: ['continue_test', 'answer_question'],
    forbidden_cta: ['platform_upgrade', 'high_ticket_offer', 'mentor_sell'],
    next_states: ['S2_TEST_QUESTIONS', 'S0_TRAFFIC'],
    ai_mode: 'lead_mode_only',
    analytics_hooks: ['test_start_time', 'question_dropoff'],
  },
  S2_TEST_QUESTIONS: {
    id: 'S2_TEST_QUESTIONS',
    allowed_cta: ['answer_question', 'continue_test', 'exit_test'],
    forbidden_cta: ['platform_upgrade', 'high_ticket_offer', 'mentor_sell'],
    next_states: ['S2_TEST_QUESTIONS', 'S3_TEST_RESULT', 'S0_TRAFFIC'],
    ai_mode: 'lead_mode_only',
    analytics_hooks: ['answer_latency', 'question_dropoff', 'completion_rate'],
  },
  S3_TEST_RESULT: {
    id: 'S3_TEST_RESULT',
    allowed_cta: ['focus_cta', 'view_result', 'reflect'],
    forbidden_cta: ['platform_upgrade', 'high_ticket_offer', 'mentor_sell'],
    next_states: ['S3_TEST_RESULT', 'S0_TRAFFIC'],
    ai_mode: 'lead_mode_only',
    analytics_hooks: ['result_type', 'CTA_click'],
  },
}

export const CANONICAL_TEST_EVENT_DICTIONARY: Record<
  CanonicalTestEventType,
  CanonicalTestEventDefinition
> = {
  TEST_OPENED: {
    source: 'cross_channel',
    payload: ['entry_point', 'referrer'],
    trigger: 'user opened test entry',
    next_transition: ['S0_TRAFFIC', 'S1_TEST_STARTED'],
  },
  TEST_STARTED: {
    source: 'cross_channel',
    payload: ['test_id', 'started_at'],
    trigger: 'user explicitly started test',
    next_transition: ['S1_TEST_STARTED'],
  },
  QUESTION_ANSWERED: {
    source: 'cross_channel',
    payload: [
      'question_id',
      'question_index',
      'answer_latency_ms',
      'answered_at',
    ],
    trigger: 'user submitted answer',
    next_transition: ['S2_TEST_QUESTIONS'],
  },
  TEST_COMPLETED: {
    source: 'cross_channel',
    payload: [
      'completed_at',
      'answers_count',
      'questions_total',
      'completion_rate',
    ],
    trigger: 'all required test questions completed',
    next_transition: ['S3_TEST_RESULT'],
  },
  RESULT_OPENED: {
    source: 'cross_channel',
    payload: ['result_type', 'opened_at'],
    trigger: 'user opened test result screen',
    next_transition: ['S3_TEST_RESULT'],
  },
  CTA_FOCUS_CLICKED: {
    source: 'cross_channel',
    payload: ['cta_id', 'clicked_at'],
    trigger: 'user clicked Focus CTA from test result',
    next_transition: ['S3_TEST_RESULT'],
  },
  TEST_EXITED: {
    source: 'cross_channel',
    payload: ['exit_stage', 'exit_reason', 'last_question_index'],
    trigger: 'user left test before completion',
    next_transition: ['S0_TRAFFIC'],
  },
}

export const CANONICAL_TEST_TRANSITIONS: Record<
  CanonicalTestStateId,
  Partial<Record<CanonicalTestEventType, CanonicalTestStateId>>
> = {
  S0_TRAFFIC: {
    TEST_OPENED: 'S0_TRAFFIC',
    TEST_STARTED: 'S1_TEST_STARTED',
  },
  S1_TEST_STARTED: {
    QUESTION_ANSWERED: 'S2_TEST_QUESTIONS',
    TEST_EXITED: 'S0_TRAFFIC',
  },
  S2_TEST_QUESTIONS: {
    QUESTION_ANSWERED: 'S2_TEST_QUESTIONS',
    TEST_COMPLETED: 'S3_TEST_RESULT',
    TEST_EXITED: 'S0_TRAFFIC',
  },
  S3_TEST_RESULT: {
    RESULT_OPENED: 'S3_TEST_RESULT',
    CTA_FOCUS_CLICKED: 'S3_TEST_RESULT',
    TEST_OPENED: 'S0_TRAFFIC',
  },
}

export function isCanonicalTestEventType(
  value: string
): value is CanonicalTestEventType {
  return (CANONICAL_TEST_EVENTS as readonly string[]).includes(value)
}

export function isCanonicalTestStateId(
  value: string
): value is CanonicalTestStateId {
  return (CANONICAL_TEST_STATE_IDS as readonly string[]).includes(value)
}

export function resolveCanonicalTestTransition(
  currentState: CanonicalTestStateId,
  event: CanonicalTestEventType
): CanonicalTestStateId | null {
  return CANONICAL_TEST_TRANSITIONS[currentState][event] ?? null
}

const DEFAULT_STATE_BY_EVENT: Record<
  CanonicalTestEventType,
  CanonicalTestStateId
> = {
  TEST_OPENED: 'S0_TRAFFIC',
  TEST_STARTED: 'S0_TRAFFIC',
  QUESTION_ANSWERED: 'S1_TEST_STARTED',
  TEST_COMPLETED: 'S2_TEST_QUESTIONS',
  RESULT_OPENED: 'S3_TEST_RESULT',
  CTA_FOCUS_CLICKED: 'S3_TEST_RESULT',
  TEST_EXITED: 'S2_TEST_QUESTIONS',
}

export function resolveCanonicalTestCurrentState(
  event: CanonicalTestEventType,
  providedState?: string | null
): CanonicalTestStateId {
  if (providedState && isCanonicalTestStateId(providedState)) {
    return providedState
  }

  return DEFAULT_STATE_BY_EVENT[event]
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

export function buildCanonicalTestAnalyticsHooks(input: {
  event: CanonicalTestEventType
  payload?: Prisma.JsonObject
  startedAtMs?: number | null
  now?: Date
}): Prisma.JsonObject {
  const payload = input.payload ?? {}
  const now = input.now ?? new Date()
  const nowMs = now.getTime()
  const startedAtMs =
    input.startedAtMs ??
    asNumber(payload.test_start_time) ??
    asNumber(payload.started_at_ms)
  const questionIndex = asNumber(payload.question_index)
  const answersCount = asNumber(payload.answers_count)
  const questionsTotal = asNumber(payload.questions_total)

  switch (input.event) {
    case 'TEST_STARTED':
      return {
        test_start_time: now.toISOString(),
        started_at_ms: nowMs,
      }

    case 'QUESTION_ANSWERED': {
      const explicitLatency = asNumber(payload.answer_latency_ms)
      const derivedLatency =
        explicitLatency ??
        (startedAtMs ? Math.max(0, nowMs - startedAtMs) : null)
      return {
        answer_latency: derivedLatency,
        answer_latency_ms: derivedLatency,
        question_index: questionIndex,
      }
    }

    case 'TEST_COMPLETED': {
      const completionRate =
        questionsTotal && questionsTotal > 0
          ? Math.max(
              0,
              Math.min(1, (answersCount ?? questionsTotal) / questionsTotal)
            )
          : null
      return {
        completion_rate: completionRate,
        answers_count: answersCount,
        questions_total: questionsTotal,
      }
    }

    case 'RESULT_OPENED':
      return {
        result_type: asString(payload.result_type) ?? 'default',
      }

    case 'CTA_FOCUS_CLICKED':
      return {
        CTA_click: true,
        cta_id: asString(payload.cta_id) ?? 'focus_primary',
      }

    case 'TEST_EXITED': {
      const dropoff =
        questionIndex !== null ? `q_${Math.max(0, questionIndex)}` : 'unknown'
      return {
        question_dropoff: dropoff,
      }
    }

    case 'TEST_OPENED':
    default:
      return {}
  }
}

export function validateCanonicalTestFoundation(): {
  ok: boolean
  errors: string[]
} {
  const errors: string[] = []

  const stateKeys = Object.keys(CANONICAL_TEST_STATES)
  if (new Set(stateKeys).size !== stateKeys.length) {
    errors.push('duplicate_state_names_detected')
  }

  const eventKeys = Object.keys(CANONICAL_TEST_EVENT_DICTIONARY)
  if (new Set(eventKeys).size !== eventKeys.length) {
    errors.push('duplicate_event_names_detected')
  }

  for (const [state, transitions] of Object.entries(
    CANONICAL_TEST_TRANSITIONS
  ) as Array<
    [
      CanonicalTestStateId,
      Partial<Record<CanonicalTestEventType, CanonicalTestStateId>>,
    ]
  >) {
    for (const [event, nextState] of Object.entries(transitions) as Array<
      [CanonicalTestEventType, CanonicalTestStateId]
    >) {
      if (!CANONICAL_TEST_STATES[state]) {
        errors.push(`unknown_state:${state}`)
      }
      if (!CANONICAL_TEST_EVENT_DICTIONARY[event]) {
        errors.push(`unknown_event:${event}`)
      }
      if (!CANONICAL_TEST_STATES[nextState]) {
        errors.push(`unknown_next_state:${nextState}`)
      }
      if (nextState.includes('PLATFORM') || nextState.includes('HIGH_TICKET')) {
        errors.push(`forbidden_direct_jump:${state}:${event}:${nextState}`)
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

const CANONICAL_TEST_RESULT_ORDER: CanonicalTestResultType[] = [
  'STATE',
  'GOAL',
  'CHOICE',
  'DECISION',
  'ACTION',
]
const CANONICAL_TEST_RESULT_BY_ANSWER: Record<
  AbTestAnswerKey,
  CanonicalTestResultType
> = {
  state: 'STATE',
  goal: 'GOAL',
  choice: 'CHOICE',
  decision: 'DECISION',
  action: 'ACTION',
}
const CANONICAL_TEST_TIEBREAK_QUESTION_ORDER: readonly AbTestQuestionId[] = [
  'q6',
  'q7',
  'q8',
]

type CanonicalTestScoredAnswer = {
  questionId: AbTestQuestionId
  answerId: AbTestAnswerKey
  resultType: CanonicalTestResultType
}

function scoreCanonicalTestAnswers(
  answers: CanonicalTestScoredAnswer[]
): Record<CanonicalTestResultType, number> {
  const categoryBreakdown: Record<CanonicalTestResultType, number> = {
    STATE: 0,
    GOAL: 0,
    CHOICE: 0,
    DECISION: 0,
    ACTION: 0,
  }

  for (const answer of answers) {
    categoryBreakdown[answer.resultType] += 1
  }

  return categoryBreakdown
}

function chooseCanonicalTestWinner(
  categoryBreakdown: Record<CanonicalTestResultType, number>,
  tieBreakBreakdown: Record<CanonicalTestResultType, number>,
  tiebreakerAnswersReversed: Array<{ type: CanonicalTestResultType }>
): CanonicalTestResultType {
  // Методологічний ланцюжок ABSystem:
  // СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ
  // Нижчий рівень пріоритетніший при нічиї
  const CHAIN: CanonicalTestResultType[] = [
    'STATE',
    'GOAL',
    'CHOICE',
    'DECISION',
    'ACTION',
  ]

  // Рівень 1: чіткий переможець
  const highestScore = Math.max(...Object.values(categoryBreakdown))
  const topCandidates = CHAIN.filter(
    (t) => categoryBreakdown[t] === highestScore
  )
  if (topCandidates.length === 1) return topCandidates[0]

  // Рівень 2: нічия → нижчий у ланцюжку перемагає
  // topCandidates вже відсортовані за CHAIN → [0] = найнижчий
  // Перевіряємо чи q6-q8 дають однозначного переможця
  // СЕРЕД кандидатів нічиї
  const tbScores = topCandidates.map((t) => ({
    t,
    s: tieBreakBreakdown[t] ?? 0,
  }))
  const maxTb = Math.max(...tbScores.map((x) => x.s))
  const tbWinners = tbScores.filter((x) => x.s === maxTb).map((x) => x.t)

  // tbWinners відсортовані за CHAIN через filter на CHAIN масиві
  const tbWinnersSorted = CHAIN.filter((t) => tbWinners.includes(t))

  if (tbWinnersSorted.length === 1) {
    // Chain priority overrides tiebreaker score:
    // topCandidates[0] is always first in CHAIN (most fundamental)
    return topCandidates[0]
  }

  // Рівень 3: q8 → q7 → q6 серед кандидатів
  for (const answer of tiebreakerAnswersReversed) {
    if (tbWinnersSorted.includes(answer.type)) {
      return answer.type
    }
  }

  // Фінал: перший у CHAIN серед кандидатів
  return topCandidates[0]
}

export function resolveCanonicalTestResult(
  answers: Array<{ questionId: AbTestQuestionId; answerId: AbTestAnswerKey }>
): CanonicalTestResult {
  const scoredAnswers: CanonicalTestScoredAnswer[] = answers.map((answer) => ({
    ...answer,
    resultType: CANONICAL_TEST_RESULT_BY_ANSWER[answer.answerId],
  }))

  const categoryBreakdown = scoreCanonicalTestAnswers(scoredAnswers)
  const tieBreakAnswers = scoredAnswers.filter((answer) =>
    CANONICAL_TEST_TIEBREAK_QUESTION_ORDER.includes(answer.questionId)
  )
  const tieBreakBreakdown = scoreCanonicalTestAnswers(tieBreakAnswers)

  const tiebreakerAnswersReversed = [...tieBreakAnswers]
    .sort(
      (a, b) =>
        CANONICAL_TEST_TIEBREAK_QUESTION_ORDER.indexOf(b.questionId) -
        CANONICAL_TEST_TIEBREAK_QUESTION_ORDER.indexOf(a.questionId)
    )
    .map((a) => ({ type: a.resultType as CanonicalTestResultType }))

  const type = chooseCanonicalTestWinner(
    categoryBreakdown,
    tieBreakBreakdown,
    tiebreakerAnswersReversed
  )

  return {
    type,
    dominantScore: categoryBreakdown[type],
    categoryBreakdown,
  }
}
