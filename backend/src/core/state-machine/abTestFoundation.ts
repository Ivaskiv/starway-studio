import type { Prisma } from '@starway/db/prisma-client'

import {
  CANONICAL_CTA_REGISTRY,
  type CanonicalCtaId,
  type CanonicalMessageKey,
  resolveCanonicalMessageKeyByTestEvent,
  validateCanonicalCtaMessageFoundation,
} from './ctaFoundation.js'
import {
  CANONICAL_FLOW_TIMER_REGISTRY,
  resolveCanonicalFlowTimerIds,
  validateCanonicalFlowTimingFoundation,
  type CanonicalFlowTimerId,
} from './flowTimingFoundation.js'
import {
  AB_TEST_QUESTION_ORDER,
  AB_TEST_QUESTIONS,
  getAbTestQuestion,
  type AbTestAnswerKey,
  type AbTestQuestion,
  type AbTestQuestionId,
} from '@/products/ab-system/content/abTest.questions.js'
import {
  AB_TEST_RESULTS,
  getAbTestResultDefinition,
  type AbTestResultDefinition,
  type AbTestResultKey,
} from '@/products/ab-system/content/abTest.results.js'
import { resolveCanonicalTestResult } from './testFoundation.js'

export const AB_TEST_STAGE_IDS = [
  'S1_TEST_STARTED',
  'S2_TEST_QUESTIONS',
  'S3_TEST_RESULT',
  'S4_FOCUS_INVITE',
  'S5_PAYMENT',
  'S6_ZOOM',
  'S7_PLATFORM_INVITE',
  'S8_PLATFORM_READY',
] as const

export type AbTestStageId = typeof AB_TEST_STAGE_IDS[number]

export type AbTestAnswer = {
  question_id: AbTestQuestionId
  answer_id: AbTestAnswerKey
  score: number
  category: AbTestAnswerKey
  behavioral_type: AbTestQuestion['behavioral_type']
  analytics_hooks: readonly string[]
  answered_at: string
  latency_ms: number | null
}

export type AbTestProgress = {
  version: 1
  flow_state: 'IDLE' | 'STARTED' | 'QUESTIONING' | 'RESULT_READY' | 'PAYMENT_PENDING' | 'SUBSCRIBED' | 'COMPLETED'
  stage: AbTestStageId
  status: 'idle' | 'active' | 'completed' | 'abandoned'
  started_at: string | null
  updated_at: string | null
  revision: number
  current_question_id: AbTestQuestionId | null
  questions_shown: AbTestQuestionId[]
  answers: AbTestAnswer[]
  result_key: AbTestResultKey | null
  result_opened_at: string | null
  focus_opened_at: string | null
  payment_started_at: string | null
  payment_success_at: string | null
  zoom_registered_at: string | null
  zoom_attended_at: string | null
  platform_invited_at: string | null
  platform_ready_at: string | null
  last_callback_key: string | null
  last_message_key: CanonicalMessageKey | null
  last_event_at: string | null
  email_stage: 'pending' | 'captured' | 'skipped' | null
  email_captured_at: string | null
  timers: {
    result: CanonicalFlowTimerId[]
    dojim: CanonicalFlowTimerId[]
    payment: CanonicalFlowTimerId[]
    zoom: CanonicalFlowTimerId[]
    platform: CanonicalFlowTimerId[]
    retention: CanonicalFlowTimerId[]
  }
}

export type AbTestProgressPatch = Partial<Omit<AbTestProgress, 'version' | 'timers'>> & {
  timers?: Partial<AbTestProgress['timers']>
}

export const AB_TEST_UI_SETTINGS_KEY = 'abTest'
export const AB_TEST_CURRENT_VERSION = 1

const AB_TEST_ANSWER_ORDER: AbTestAnswerKey[] = ['state', 'goal', 'choice', 'decision', 'action']
const AB_TEST_ACTIVE_QUESTION_ORDER = AB_TEST_QUESTION_ORDER
type AbTestActiveQuestionId = typeof AB_TEST_ACTIVE_QUESTION_ORDER[number]
const AB_TEST_RELEVANT_MESSAGE_KEYS: CanonicalMessageKey[] = [
  'TEST_RESULT_STATE',
  'TEST_RESULT_GOAL',
  'TEST_RESULT_CHOICE',
  'TEST_RESULT_DECISION',
  'TEST_RESULT_ACTION',
  'FOCUS_INVITE_24H',
  'FOCUS_INVITE_48H',
  'FOCUS_INVITE_72H',
  'PAYMENT_REMINDER_24H',
  'PAYMENT_REMINDER_48H',
  'PAYMENT_REMINDER_72H',
  'ZOOM_REMINDER_24H',
  'ZOOM_REMINDER_2H',
  'PLATFORM_INVITE_AFTER_ZOOM',
]

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function isActiveAbTestQuestionId(questionId: AbTestQuestionId | null): questionId is AbTestActiveQuestionId {
  return Boolean(questionId && AB_TEST_ACTIVE_QUESTION_ORDER.includes(questionId as AbTestActiveQuestionId))
}

function cloneTimers(input: Partial<AbTestProgress['timers']> | undefined): AbTestProgress['timers'] {
  return {
    result: [...(input?.result ?? [])],
    dojim: [...(input?.dojim ?? [])],
    payment: [...(input?.payment ?? [])],
    zoom: [...(input?.zoom ?? [])],
    platform: [...(input?.platform ?? [])],
    retention: [...(input?.retention ?? [])],
  }
}

function getDefaultProgress(now = new Date()): AbTestProgress {
  return {
    version: AB_TEST_CURRENT_VERSION,
    flow_state: 'IDLE',
    stage: 'S1_TEST_STARTED',
    status: 'idle',
    started_at: null,
    updated_at: now.toISOString(),
    revision: 0,
    current_question_id: null,
    questions_shown: [],
    answers: [],
    result_key: null,
    email_stage: null,
    email_captured_at: null,
    result_opened_at: null,
    focus_opened_at: null,
    payment_started_at: null,
    payment_success_at: null,
    zoom_registered_at: null,
    zoom_attended_at: null,
    platform_invited_at: null,
    platform_ready_at: null,
    last_callback_key: null,
    last_message_key: null,
    last_event_at: now.toISOString(),
    timers: {
      result: [],
      dojim: [],
      payment: [],
      zoom: [],
      platform: [],
      retention: [],
    },
  }
}

export function normalizeAbTestProgress(value: unknown, now = new Date()): AbTestProgress {
  if (!isJsonObject(value)) {
    return getDefaultProgress(now)
  }

  const timers = isJsonObject(value.timers) ? value.timers as Partial<AbTestProgress['timers']> : undefined
  const currentQuestionId = asString(value.current_question_id)
  const stage = asString(value.stage)
  const resultKey = asString(value.result_key)

  const normalized: AbTestProgress = {
    version: AB_TEST_CURRENT_VERSION,
    flow_state: 'IDLE',
    stage: (AB_TEST_STAGE_IDS as readonly string[]).includes(stage ?? '')
      ? stage as AbTestStageId
      : 'S1_TEST_STARTED',
    status: ['idle', 'active', 'completed', 'abandoned'].includes(asString(value.status) ?? '')
      ? asString(value.status) as AbTestProgress['status']
      : 'idle',
    started_at: asString(value.started_at),
    updated_at: asString(value.updated_at) ?? now.toISOString(),
    revision: asNumber(value.revision) ?? 0,
    current_question_id: (AB_TEST_QUESTION_ORDER as readonly string[]).includes(currentQuestionId ?? '')
      ? currentQuestionId as AbTestQuestionId
      : null,
    questions_shown: Array.isArray(value.questions_shown)
      ? value.questions_shown.filter((questionId): questionId is AbTestQuestionId => (AB_TEST_QUESTION_ORDER as readonly string[]).includes(String(questionId)))
      : [],
    answers: Array.isArray(value.answers)
      ? value.answers.flatMap((item) => {
          if (!isJsonObject(item)) return []
          const questionId = asString(item.question_id)
          const answerId = asString(item.answer_id)
          if (!(AB_TEST_QUESTION_ORDER as readonly string[]).includes(questionId ?? '') || !AB_TEST_ANSWER_ORDER.includes(answerId as AbTestAnswerKey)) {
            return []
          }

          return [{
            question_id: questionId as AbTestQuestionId,
            answer_id: answerId as AbTestAnswerKey,
            score: asNumber(item.score) ?? 0,
            category: (AB_TEST_ANSWER_ORDER as readonly string[]).includes(asString(item.category) ?? '')
              ? asString(item.category) as AbTestAnswerKey
              : (answerId as AbTestAnswerKey),
            behavioral_type: ['energy', 'discipline', 'choice', 'decision', 'action'].includes(asString(item.behavioral_type) ?? '')
              ? asString(item.behavioral_type) as AbTestQuestion['behavioral_type']
              : 'decision',
            analytics_hooks: Array.isArray(item.analytics_hooks)
              ? item.analytics_hooks.map(hook => String(hook)).filter(Boolean)
              : [],
            answered_at: asString(item.answered_at) ?? now.toISOString(),
            latency_ms: asNumber(item.latency_ms),
          }]
        })
      : [],
    result_key: (resultKey && (Object.keys(AB_TEST_RESULTS) as AbTestResultKey[]).includes(resultKey as AbTestResultKey))
      ? resultKey as AbTestResultKey
      : null,
    email_stage: ['pending', 'captured', 'skipped'].includes(asString(value.email_stage) ?? '')
      ? asString(value.email_stage) as AbTestProgress['email_stage']
      : null,
    email_captured_at: asString(value.email_captured_at),
    result_opened_at: asString(value.result_opened_at),
    focus_opened_at: asString(value.focus_opened_at),
    payment_started_at: asString(value.payment_started_at),
    payment_success_at: asString(value.payment_success_at),
    zoom_registered_at: asString(value.zoom_registered_at),
    zoom_attended_at: asString(value.zoom_attended_at),
    platform_invited_at: asString(value.platform_invited_at),
    platform_ready_at: asString(value.platform_ready_at),
    last_callback_key: asString(value.last_callback_key),
    last_message_key: asString(value.last_message_key) as CanonicalMessageKey | null,
    last_event_at: asString(value.last_event_at),
    timers: cloneTimers(timers),
  }
  normalized.flow_state = deriveCanonicalFlowState(normalized)
  return normalized
}

function deriveCanonicalFlowState(progress: AbTestProgress): AbTestProgress['flow_state'] {
  if (progress.platform_ready_at) return 'COMPLETED'
  if (progress.payment_success_at) return 'SUBSCRIBED'
  if (progress.payment_started_at || progress.stage === 'S5_PAYMENT') return 'PAYMENT_PENDING'
  if (progress.status === 'completed' && progress.result_key) return 'RESULT_READY'
  if (progress.status === 'active' && progress.answers.length > 0) return 'QUESTIONING'
  if (progress.status === 'active') return 'STARTED'
  return 'IDLE'
}

export type AbTestProgressValidation = {
  valid: boolean
  resumable: boolean
  reasons: string[]
}

export function validateAbTestProgress(progress: AbTestProgress): AbTestProgressValidation {
  const reasons: string[] = []
  const totalQuestions = AB_TEST_QUESTION_ORDER.length
  const answersCount = progress.answers.length
  const hasOpenedQuestion =
    progress.stage === 'S2_TEST_QUESTIONS' &&
    Boolean(progress.current_question_id) &&
    answersCount === 0

  if (progress.status === 'active' && answersCount === 0 && !hasOpenedQuestion) {
    reasons.push('active_without_answers')
  }
  if (progress.stage === 'S2_TEST_QUESTIONS' && answersCount === 0 && !hasOpenedQuestion) {
    reasons.push('question_stage_without_answers')
  }
  if (progress.status === 'completed' && !progress.result_key) {
    reasons.push('completed_without_result')
  }
  if (answersCount > totalQuestions) {
    reasons.push('answers_overflow')
  }

  const valid = reasons.length === 0
  const resumable =
    valid &&
    progress.status === 'active' &&
    (answersCount > 0 || hasOpenedQuestion) &&
    progress.stage === 'S2_TEST_QUESTIONS'

  return { valid, resumable, reasons }
}

export function repairAbTestProgress(
  progress: AbTestProgress,
  now = new Date()
): { progress: AbTestProgress; repaired: boolean; reasons: string[] } {
  const validation = validateAbTestProgress(progress)
  if (validation.valid) {
    const next = cloneAbTestProgress(progress, now)
    next.flow_state = deriveCanonicalFlowState(next)
    return { progress: next, repaired: false, reasons: [] }
  }

  const recovered = getDefaultProgress(now)
  recovered.revision = Math.max(progress.revision + 1, 1)
  recovered.last_callback_key = progress.last_callback_key
  recovered.last_message_key = progress.last_message_key
  recovered.last_event_at = now.toISOString()
  recovered.flow_state = 'IDLE'
  return { progress: recovered, repaired: true, reasons: validation.reasons }
}

export function createAbTestProgress(now = new Date()): AbTestProgress {
  return getDefaultProgress(now)
}

export function cloneAbTestProgress(progress: AbTestProgress, now = new Date()): AbTestProgress {
  return normalizeAbTestProgress(progress, now)
}

export function resolveAbTestQuestion(questionId: AbTestQuestionId): AbTestQuestion {
  return getAbTestQuestion(questionId)
}

export function resolveAbTestQuestionOrder(): readonly AbTestQuestionId[] {
  return AB_TEST_QUESTION_ORDER
}

export function resolveAbTestCurrentQuestion(progress: AbTestProgress): AbTestQuestion | null {
  return isActiveAbTestQuestionId(progress.current_question_id) ? getAbTestQuestion(progress.current_question_id) : null
}

export function resolveAbTestNextQuestion(progress: AbTestProgress): AbTestQuestion | null {
  if (!progress.current_question_id) {
    return getAbTestQuestion(AB_TEST_QUESTION_ORDER[0])
  }

  if (!isActiveAbTestQuestionId(progress.current_question_id)) {
    return null
  }

  const currentIndex = AB_TEST_QUESTION_ORDER.indexOf(progress.current_question_id)
  const nextId = AB_TEST_QUESTION_ORDER[currentIndex + 1] ?? null
  return nextId ? getAbTestQuestion(nextId) : null
}

export function resolveAbTestAnswerLatency(progress: AbTestProgress, questionId: AbTestQuestionId, answeredAt = new Date()): number | null {
  const existing = [...progress.answers].reverse().find(answer => answer.question_id === questionId)
  if (!existing) {
    return null
  }

  const startedAt = new Date(existing.answered_at).getTime()
  const currentAt = answeredAt.getTime()
  if (!Number.isFinite(startedAt) || !Number.isFinite(currentAt)) {
    return null
  }

  return Math.max(0, currentAt - startedAt)
}

export function buildAbTestQuestionAnalyticsHook(question: AbTestQuestion, answerId?: AbTestAnswerKey, latencyMs?: number | null): Prisma.JsonObject {
  return {
    question_id: question.question_id,
    message_key: question.message_key,
    behavioral_type: question.behavioral_type,
    analytics_hooks: [...question.analytics_hooks],
    ...(answerId ? { answer_id: answerId } : {}),
    ...(typeof latencyMs === 'number' ? { answer_latency_ms: latencyMs } : {}),
  }
}

export function resolveAbTestResultKey(answers: AbTestAnswer[]): AbTestResultKey {
  // Делегуємо до єдиного canonical resolver з тай-брекером q6-q8.
  // Це усуває дублювання логіки між resolveAbTestResultKey і resolveCanonicalTestResult.
  const result = resolveCanonicalTestResult(
    answers.map((a) => ({ questionId: a.question_id, answerId: a.answer_id }))
  )
  return result.type.toLowerCase() as AbTestResultKey
}

export function resolveAbTestResultDefinition(resultKey: AbTestResultKey): AbTestResultDefinition {
  return getAbTestResultDefinition(resultKey)
}

export function resolveAbTestMessageKeyForStage(stage: AbTestStageId): CanonicalMessageKey {
  switch (stage) {
    case 'S4_FOCUS_INVITE':
      return 'FOCUS_INVITE_24H'
    case 'S5_PAYMENT':
      return 'PAYMENT_REMINDER_24H'
    case 'S6_ZOOM':
      return 'ZOOM_REMINDER_24H'
    case 'S7_PLATFORM_INVITE':
    case 'S8_PLATFORM_READY':
      return 'PLATFORM_INVITE_AFTER_ZOOM'
    case 'S3_TEST_RESULT':
    case 'S1_TEST_STARTED':
    case 'S2_TEST_QUESTIONS':
    default:
      return 'TEST_RESULT_STATE'
  }
}

export function resolveAbTestFlowTimerIdsForStage(stage: AbTestStageId): readonly CanonicalFlowTimerId[] {
  switch (stage) {
    case 'S3_TEST_RESULT':
      return ['RESULT_FOLLOWUP_24H', 'RESULT_FOLLOWUP_48H', 'RESULT_FOLLOWUP_72H']
    case 'S4_FOCUS_INVITE':
      return ['RESULT_DOJIM_24H', 'RESULT_DOJIM_48H', 'RESULT_DOJIM_72H', 'RESULT_DOJIM_5D', 'RESULT_DOJIM_7D']
    case 'S5_PAYMENT':
      return ['PAYMENT_REMINDER_24H', 'PAYMENT_REMINDER_48H', 'PAYMENT_REMINDER_72H']
    case 'S6_ZOOM':
      return ['ZOOM_REMINDER_24H', 'ZOOM_REMINDER_2H']
    case 'S7_PLATFORM_INVITE':
    case 'S8_PLATFORM_READY':
      return ['PLATFORM_INVITE_AFTER_ZOOM_1', 'PLATFORM_INVITE_AFTER_ZOOM_2']
    case 'S1_TEST_STARTED':
    case 'S2_TEST_QUESTIONS':
    default:
      return []
  }
}

export function resolveAbTestStageForAction(action: CanonicalCtaId): AbTestStageId {
  switch (action) {
    case 'OPEN_FOCUS':
      return 'S4_FOCUS_INVITE'
    case 'PAY_FOCUS_1M':
    case 'PAY_FOCUS_3M':
      return 'S5_PAYMENT'
    case 'JOIN_CHANNEL':
      return 'S6_ZOOM'
    case 'OPEN_ZOOM':
      return 'S6_ZOOM'
    case 'OPEN_PLATFORM':
      return 'S7_PLATFORM_INVITE'
    case 'RESTORE_PROGRESS':
      return 'S1_TEST_STARTED'
    case 'CONTINUE_FLOW':
      return 'S8_PLATFORM_READY'
    case 'START_TEST':
    default:
      return 'S1_TEST_STARTED'
  }
}

export function resolveAbTestProgressToMessageKey(progress: AbTestProgress): CanonicalMessageKey {
  if (progress.stage === 'S3_TEST_RESULT' && progress.result_key) {
    return resolveAbTestResultDefinition(progress.result_key).message_key
  }

  return resolveAbTestMessageKeyForStage(progress.stage)
}

export function validateAbTestFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []

  if (new Set(AB_TEST_QUESTION_ORDER).size !== AB_TEST_QUESTION_ORDER.length) {
    errors.push('duplicate_question_ids_detected')
  }

  if (new Set(Object.keys(AB_TEST_RESULTS)).size !== Object.keys(AB_TEST_RESULTS).length) {
    errors.push('duplicate_result_keys_detected')
  }

  for (const questionId of AB_TEST_QUESTION_ORDER) {
    const question = AB_TEST_QUESTIONS[questionId]
    if (!question) {
      errors.push(`missing_question:${questionId}`)
      continue
    }

    if (question.answers.length !== AB_TEST_ANSWER_ORDER.length) {
      errors.push(`invalid_answer_count:${questionId}`)
    }

    const answerIds = new Set(question.answers.map(answer => answer.id))
    if (answerIds.size !== AB_TEST_ANSWER_ORDER.length) {
      errors.push(`invalid_answer_mapping:${questionId}`)
    }

    for (const answer of question.answers) {
      if (!AB_TEST_ANSWER_ORDER.includes(answer.id)) {
        errors.push(`unknown_answer_key:${questionId}:${answer.id}`)
      }
      if (!Number.isFinite(answer.score) || answer.score < 1) {
        errors.push(`invalid_answer_score:${questionId}:${answer.id}`)
      }
    }
  }

  for (const resultKey of Object.keys(AB_TEST_RESULTS) as AbTestResultKey[]) {
    const result = AB_TEST_RESULTS[resultKey]
    if (!result) {
      errors.push(`missing_result:${resultKey}`)
      continue
    }

    if (!result.focus_cta.trim()) {
      errors.push(`missing_focus_cta:${resultKey}`)
    }
    if (!result.payment_cta.trim()) {
      errors.push(`missing_payment_cta:${resultKey}`)
    }
    if (!result.zoom_cta.trim()) {
      errors.push(`missing_zoom_cta:${resultKey}`)
    }
    if (!result.platform_cta.trim()) {
      errors.push(`missing_platform_cta:${resultKey}`)
    }
  }

  for (const timerId of Object.keys(CANONICAL_FLOW_TIMER_REGISTRY) as CanonicalFlowTimerId[]) {
    const timer = CANONICAL_FLOW_TIMER_REGISTRY[timerId]
    if (!timer) {
      errors.push(`missing_timer:${timerId}`)
      continue
    }

    if (!(AB_TEST_RELEVANT_MESSAGE_KEYS as readonly string[]).includes(timer.message_key)) {
      errors.push(`timer_message_key_out_of_range:${timerId}`)
    }
  }

  const flowTimerIds = resolveCanonicalFlowTimerIds('RESULT_OPENED')
  if (!flowTimerIds.includes('RESULT_FOLLOWUP_24H')) {
    errors.push('result_followup_timer_missing')
  }

  if (!validateCanonicalCtaMessageFoundation().ok) {
    errors.push('canonical_cta_message_invalid')
  }

  if (!validateCanonicalFlowTimingFoundation().ok) {
    errors.push('canonical_flow_timing_invalid')
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

export function buildAbTestProgressPatch(progress: AbTestProgress, patch: AbTestProgressPatch, now = new Date()): AbTestProgress {
  const next = {
    ...progress,
    ...patch,
    timers: cloneTimers({
      ...progress.timers,
      ...(patch.timers ?? {}),
    }),
    updated_at: now.toISOString(),
    last_event_at: patch.last_event_at ?? progress.last_event_at ?? now.toISOString(),
  }
  next.flow_state = deriveCanonicalFlowState(next)
  return next
}
