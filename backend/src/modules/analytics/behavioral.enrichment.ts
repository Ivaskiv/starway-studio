import type { Prisma } from '@starway/db/prisma-client'
import { BEHAVIORAL_METRICS, BEHAVIORAL_METRIC_KEYS, resolveCanonicalEvent, type BehavioralDropOffPattern, type BehavioralEnrichmentResult, type BehavioralEventType, type BehavioralReadinessLevel, type BehavioralReadinessSignals } from './behavioral.catalog.js'
import { getBooleanField, getField, getNumberField, getStringField, isJsonObject } from './behavioral.utils.js'

function extractReadinessSignals(payload: Prisma.JsonObject): BehavioralReadinessSignals {
  return {
    attended_zoom: Boolean(getBooleanField(payload, ['attended_zoom', 'attended_live'])),
    replied_after_zoom: Boolean(getBooleanField(payload, ['replied_after_zoom', 'repliedAfterZoom'])),
    opened_platform_offer: Boolean(getBooleanField(payload, ['opened_platform_offer', 'platform_offer_opened'])),
    returned_after_24h: Boolean(getBooleanField(payload, ['returned_after_24h', 'returnedAfter24h'])),
    completed_focus_task: Boolean(getBooleanField(payload, ['completed_focus_task', 'completedFocusTask'])),
  }
}

function scoreReadiness(signals: BehavioralReadinessSignals): {
  level: BehavioralReadinessLevel
  score: number
  signals: BehavioralReadinessSignals
} {
  const score = [
    signals.attended_zoom,
    signals.replied_after_zoom,
    signals.opened_platform_offer,
    signals.returned_after_24h,
    signals.completed_focus_task,
  ].filter(Boolean).length

  const level: BehavioralReadinessLevel =
    score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low'

  return { level, score, signals }
}

function buildRetentionMarkers(payload: Prisma.JsonObject): Prisma.JsonObject {
  const inactivityDays = getNumberField(payload, ['inactivity_days', 'inactivityDays'])
  const missedZoomCount = getNumberField(payload, ['missed_zoom_count', 'missedZoomCount'])
  const noReplyStreak = getNumberField(payload, ['no_reply_streak', 'noReplyStreak'])
  const unpaidAfterOffer = Boolean(getBooleanField(payload, ['unpaid_after_offer', 'unpaidAfterOffer']))
  const abandonedPayment = Boolean(getBooleanField(payload, ['abandoned_payment', 'abandonedPayment']))

  return {
    inactivity_days: inactivityDays,
    missed_zoom_count: missedZoomCount,
    no_reply_streak: noReplyStreak,
    unpaid_after_offer: unpaidAfterOffer,
    abandoned_payment: abandonedPayment,
  }
}

function classifyDropOff(
  canonicalEvent: BehavioralEventType | null,
  state: string | null | undefined,
  payload: Prisma.JsonObject,
): BehavioralDropOffPattern | null {
  if (canonicalEvent === 'PAYMENT_FAILED' || Boolean(getBooleanField(payload, ['abandoned_payment', 'abandonedPayment']))) {
    return 'payment_abandoned'
  }

  if (canonicalEvent === 'ZOOM_REGISTERED' && Boolean(getBooleanField(payload, ['missed_zoom', 'no_show', 'noShow']))) {
    return 'joined_no_zoom'
  }

  if (canonicalEvent === 'RESULT_OPENED' && !Boolean(getBooleanField(payload, ['opened_platform_offer', 'platform_offer_opened']))) {
    return 'focus_no_upgrade'
  }

  if (canonicalEvent === 'TEST_EXITED') {
    const hasResultContext = Boolean(
      getStringField(payload, ['result_type']) ||
      getNumberField(payload, ['delay_from_result_ms']) !== null,
    )
    const hasOfferContext = Boolean(
      getStringField(payload, ['source_stage', 'sourceStage']) ||
      getStringField(payload, ['selected_plan', 'selectedPlan']),
    )

    if (hasResultContext || state === 'S3_TEST_RESULT') {
      return 'exited_after_result'
    }

    if (hasOfferContext) {
      return 'exited_after_offer'
    }

    return 'exited_on_question'
  }

  return null
}

function enrichEventSpecificFields(
  canonicalEvent: BehavioralEventType | null,
  payload: Prisma.JsonObject,
  now: Date,
): Prisma.JsonObject {
  const enriched: Prisma.JsonObject = { ...payload }

  if (canonicalEvent === 'QUESTION_ANSWERED') {
    const questionIndex = getNumberField(enriched, ['question_index', 'questionIndex']) ?? null
    const answerKey = getStringField(enriched, ['answer_key', 'answerKey', 'question_id', 'questionId'])
      ?? (questionIndex !== null ? `question_${questionIndex}` : null)
    const latencyMs = getNumberField(enriched, ['latency_ms', 'answer_latency_ms', 'answerLatencyMs'])
      ?? null

    if (questionIndex !== null && getField(enriched, 'question_index') === undefined) {
      enriched.question_index = questionIndex
    }
    if (answerKey && getField(enriched, 'answer_key') === undefined) {
      enriched.answer_key = answerKey
    }
    if (latencyMs !== null && getField(enriched, 'latency_ms') === undefined) {
      enriched.latency_ms = latencyMs
    }
  }

  if (canonicalEvent === 'TEST_COMPLETED') {
    const resultType = getStringField(enriched, ['result_type', 'resultType']) ?? 'default'
    const completionPercent = getNumberField(enriched, ['completion_percent', 'completionPercent', 'completion_rate', 'completionRate'])
      ?? null
    const startedAtMs = getNumberField(enriched, ['test_start_time_ms', 'started_at_ms', 'startedAtMs'])
    const totalDurationMs = getNumberField(enriched, ['total_duration_ms', 'totalDurationMs'])
      ?? (startedAtMs !== null ? Math.max(0, now.getTime() - startedAtMs) : null)

    if (getField(enriched, 'result_type') === undefined) {
      enriched.result_type = resultType
    }
    if (totalDurationMs !== null && getField(enriched, 'total_duration_ms') === undefined) {
      enriched.total_duration_ms = totalDurationMs
    }
    if (completionPercent !== null && getField(enriched, 'completion_percent') === undefined) {
      enriched.completion_percent = completionPercent
    }
  }

  if (canonicalEvent === 'CTA_FOCUS_CLICKED') {
    const sourceMessage = getStringField(enriched, ['source_message', 'sourceMessage', 'message_source', 'messageSource'])
    const resultType = getStringField(enriched, ['result_type', 'resultType'])
    const resultOpenedAtMs = getNumberField(enriched, ['result_opened_at_ms', 'resultOpenedAtMs'])
    const delayFromResultMs = getNumberField(enriched, ['delay_from_result_ms', 'delayFromResultMs'])
      ?? (resultOpenedAtMs !== null ? Math.max(0, now.getTime() - resultOpenedAtMs) : null)

    if (sourceMessage && getField(enriched, 'source_message') === undefined) {
      enriched.source_message = sourceMessage
    }
    if (resultType && getField(enriched, 'result_type') === undefined) {
      enriched.result_type = resultType
    }
    if (delayFromResultMs !== null && getField(enriched, 'delay_from_result_ms') === undefined) {
      enriched.delay_from_result_ms = delayFromResultMs
    }
  }

  if (canonicalEvent === 'PAYMENT_STARTED') {
    const sourceStage = getStringField(enriched, ['source_stage', 'sourceStage', 'stage'])
    const resultType = getStringField(enriched, ['result_type', 'resultType'])
    const selectedPlan = getStringField(enriched, ['selected_plan', 'selectedPlan', 'plan', 'planCode'])

    if (sourceStage && getField(enriched, 'source_stage') === undefined) {
      enriched.source_stage = sourceStage
    }
    if (resultType && getField(enriched, 'result_type') === undefined) {
      enriched.result_type = resultType
    }
    if (selectedPlan && getField(enriched, 'selected_plan') === undefined) {
      enriched.selected_plan = selectedPlan
    }
  }

  if (canonicalEvent === 'PAYMENT_SUCCESS') {
    const timeFromTestMs = getNumberField(enriched, ['time_from_test_ms', 'timeFromTestMs'])
    const funnelStage = getStringField(enriched, ['funnel_stage', 'funnelStage', 'source_stage', 'sourceStage'])
    if (timeFromTestMs === null) {
      const startedAtMs = getNumberField(enriched, ['test_start_time_ms', 'started_at_ms', 'startedAtMs'])
      if (startedAtMs !== null) {
        enriched.time_from_test_ms = Math.max(0, now.getTime() - startedAtMs)
      }
    }
    if (funnelStage && getField(enriched, 'funnel_stage') === undefined) {
      enriched.funnel_stage = funnelStage
    }
  }

  if (canonicalEvent === 'CTA_CLICKED') {
    const ctaId = getStringField(enriched, ['cta_id', 'ctaId'])
    const sourceMessage = getStringField(enriched, ['source_message', 'sourceMessage', 'message_key', 'messageKey'])
    const sourceStage = getStringField(enriched, ['source_stage', 'sourceStage'])
    const targetStage = getStringField(enriched, ['target_stage', 'targetStage'])
    const readinessLevel = getStringField(enriched, ['readiness_level', 'readinessLevel'])

    if (ctaId && getField(enriched, 'cta_id') === undefined) {
      enriched.cta_id = ctaId
    }
    if (sourceMessage && getField(enriched, 'source_message') === undefined) {
      enriched.source_message = sourceMessage
    }
    if (sourceStage && getField(enriched, 'source_stage') === undefined) {
      enriched.source_stage = sourceStage
    }
    if (targetStage && getField(enriched, 'target_stage') === undefined) {
      enriched.target_stage = targetStage
    }
    if (readinessLevel && getField(enriched, 'readiness_level') === undefined) {
      enriched.readiness_level = readinessLevel
    }
  }

  if (canonicalEvent === 'MESSAGE_OPENED') {
    const messageKey = getStringField(enriched, ['message_key', 'messageKey'])
    const lifecycleStage = getStringField(enriched, ['lifecycle_stage', 'lifecycleStage', 'state'])
    const previousMessageAtMs = getNumberField(enriched, ['previous_message_at_ms', 'previousMessageAtMs'])
    const delayFromPreviousMs = getNumberField(enriched, ['delay_from_previous_ms', 'delayFromPreviousMs'])
      ?? (previousMessageAtMs !== null ? Math.max(0, now.getTime() - previousMessageAtMs) : null)

    if (messageKey && getField(enriched, 'message_key') === undefined) {
      enriched.message_key = messageKey
    }
    if (lifecycleStage && getField(enriched, 'lifecycle_stage') === undefined) {
      enriched.lifecycle_stage = lifecycleStage
    }
    if (delayFromPreviousMs !== null && getField(enriched, 'delay_from_previous_ms') === undefined) {
      enriched.delay_from_previous_ms = delayFromPreviousMs
    }
  }

  if (canonicalEvent === 'FLOW_TRIGGERED') {
    const flowTimerId = getStringField(enriched, ['flow_timer_id', 'flowTimerId'])
    const lifecycleStage = getStringField(enriched, ['lifecycle_stage', 'lifecycleStage', 'state'])
    const delayMs = getNumberField(enriched, ['delay_ms', 'delayMs'])
    if (flowTimerId && getField(enriched, 'flow_timer_id') === undefined) {
      enriched.flow_timer_id = flowTimerId
    }
    if (lifecycleStage && getField(enriched, 'lifecycle_stage') === undefined) {
      enriched.lifecycle_stage = lifecycleStage
    }
    if (delayMs !== null && getField(enriched, 'delay_ms') === undefined) {
      enriched.delay_ms = delayMs
    }
  }

  if (canonicalEvent === 'FLOW_SKIPPED') {
    const reason = getStringField(enriched, ['reason'])
    const currentState = getStringField(enriched, ['current_state', 'currentState', 'state'])
    if (reason && getField(enriched, 'reason') === undefined) {
      enriched.reason = reason
    }
    if (currentState && getField(enriched, 'current_state') === undefined) {
      enriched.current_state = currentState
    }
  }

  if (canonicalEvent === 'FLOW_COMPLETED') {
    const resultingEvent = getStringField(enriched, ['resulting_event', 'resultingEvent'])
    const resultingTransition = getStringField(enriched, ['resulting_transition', 'resultingTransition'])
    if (resultingEvent && getField(enriched, 'resulting_event') === undefined) {
      enriched.resulting_event = resultingEvent
    }
    if (resultingTransition && getField(enriched, 'resulting_transition') === undefined) {
      enriched.resulting_transition = resultingTransition
    }
  }

  if (canonicalEvent === 'ZOOM_ATTENDED') {
    const attendedLive = getBooleanField(enriched, ['attended_live', 'attendedLive'])
    const zoomIndex = getNumberField(enriched, ['zoom_index', 'zoomIndex'])
    if (attendedLive === null) {
      enriched.attended_live = true
    }
    if (zoomIndex === null) {
      enriched.zoom_index = 1
    }
  }

  return enriched
}

export function enrichBehavioralEvent(input: {
  type: string
  state?: string | null
  payload?: Prisma.JsonValue
  now?: Date
}): BehavioralEnrichmentResult {
  const now = input.now ?? new Date()
  const payload = isJsonObject(input.payload) ? { ...input.payload } : {}
  const canonicalEvent = resolveCanonicalEvent(input.type)
  const enrichedPayload = enrichEventSpecificFields(canonicalEvent, payload, now)
  const readinessSignals = extractReadinessSignals(enrichedPayload)
  const readiness = scoreReadiness(readinessSignals)
  const dropOffPattern = classifyDropOff(canonicalEvent, input.state, enrichedPayload)
  const retentionMarkers = buildRetentionMarkers(enrichedPayload)

  return {
    canonicalEvent,
    payload: enrichedPayload,
    behavioral: {
      canonical_event: canonicalEvent,
      metric_keys: [...BEHAVIORAL_METRIC_KEYS],
      drop_off_pattern: dropOffPattern,
      readiness,
      retention_markers: retentionMarkers,
      enriched_at: now.toISOString(),
    },
  }
}

export function validateBehavioralAnalyticsLayer(): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const metricKeys = [...BEHAVIORAL_METRIC_KEYS]

  if (new Set(metricKeys).size !== metricKeys.length) {
    errors.push('duplicate_metric_names_detected')
  }

  if (metricKeys.length !== Object.keys(BEHAVIORAL_METRICS).length) {
    errors.push('metric_catalog_mismatch')
  }

  for (const key of metricKeys) {
    if (!BEHAVIORAL_METRICS[key]) {
      errors.push(`missing_metric_definition:${key}`)
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}
