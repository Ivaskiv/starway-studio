import type { Prisma } from '@starway/db/prisma-client'

export const BEHAVIORAL_METRIC_KEYS = [
  'test_completion_rate',
  'question_dropoff_rate',
  'answer_latency_avg',
  'result_distribution',
  'result_to_focus_ctr',
  'focus_payment_conversion',
  'payment_abandonment_rate',
  'channel_join_rate',
  'zoom_attendance_rate',
  'focus_to_platform_conversion',
  'retention_risk_score',
  'return_after_message_rate',
  'CTA_conversion_rate',
  'result_LTV',
  'time_to_purchase',
  'message_fatigue_rate',
  'recovery_success_rate',
  'orphan_recovery_rate',
  'followup_effectiveness',
  'conversation_interruption_rate',
  'humanized_recovery_success',
  'relationship_depth_score',
  'continuity_retention_score',
  'behavioral_stability_score',
  'relapse_frequency',
  'stagnation_duration',
  'trust_progression',
  'return_context_success',
  'contextual_recovery_success',
  'upgrade_readiness_progression',
  'cross_product_progression',
  'conversation_relevance_score',
] as const

export type BehavioralMetricKey = typeof BEHAVIORAL_METRIC_KEYS[number]

export type BehavioralDropOffPattern =
  | 'exited_on_question'
  | 'exited_after_result'
  | 'exited_after_offer'
  | 'payment_abandoned'
  | 'joined_no_zoom'
  | 'focus_no_upgrade'

export type BehavioralReadinessLevel = 'low' | 'medium' | 'high'

export type BehavioralEventType =
  | 'TEST_OPENED'
  | 'TEST_STARTED'
  | 'QUESTION_ANSWERED'
  | 'TEST_COMPLETED'
  | 'RESULT_OPENED'
  | 'CTA_FOCUS_CLICKED'
  | 'TEST_EXITED'
  | 'CTA_CLICKED'
  | 'MESSAGE_OPENED'
  | 'FLOW_TRIGGERED'
  | 'FLOW_SKIPPED'
  | 'FLOW_COMPLETED'
  | 'PAYMENT_STARTED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'ZOOM_REGISTERED'
  | 'ZOOM_ATTENDED'

type BehavioralReadinessSignals = {
  attended_zoom: boolean
  replied_after_zoom: boolean
  opened_platform_offer: boolean
  returned_after_24h: boolean
  completed_focus_task: boolean
}

export type BehavioralEnrichmentResult = {
  canonicalEvent: BehavioralEventType | null
  payload: Prisma.JsonObject
  behavioral: Prisma.JsonObject
}

export const BEHAVIORAL_METRICS: Record<BehavioralMetricKey, { label: string; description: string }> = {
  test_completion_rate: {
    label: 'Test completion rate',
    description: 'Share of users who complete the behavioral test funnel.',
  },
  question_dropoff_rate: {
    label: 'Question drop-off rate',
    description: 'Share of users who leave during the question loop.',
  },
  answer_latency_avg: {
    label: 'Average answer latency',
    description: 'How quickly users answer behavioral questions.',
  },
  result_distribution: {
    label: 'Result distribution',
    description: 'Spread of result types produced by the test funnel.',
  },
  result_to_focus_ctr: {
    label: 'Result-to-Focus CTR',
    description: 'Clicks from result view into the Focus offer.',
  },
  focus_payment_conversion: {
    label: 'Focus payment conversion',
    description: 'Payment completion after a Focus offer interaction.',
  },
  payment_abandonment_rate: {
    label: 'Payment abandonment rate',
    description: 'Payments started but not completed.',
  },
  channel_join_rate: {
    label: 'Channel join rate',
    description: 'Rate of joining the next channel step after the test.',
  },
  zoom_attendance_rate: {
    label: 'Zoom attendance rate',
    description: 'Share of zoom registrants who actually attend.',
  },
  focus_to_platform_conversion: {
    label: 'Focus to platform conversion',
    description: 'Focus users who move into platform access.',
  },
  retention_risk_score: {
    label: 'Retention risk score',
    description: 'Deterministic retention risk signal based on recent markers.',
  },
  return_after_message_rate: {
    label: 'Return-after-message rate',
    description: 'Return signal after a follow-up or reminder message.',
  },
  CTA_conversion_rate: {
    label: 'CTA conversion rate',
    description: 'Clicks on the canonical CTA compared to offer views.',
  },
  result_LTV: {
    label: 'Result LTV',
    description: 'Revenue linked to result-opened users.',
  },
  time_to_purchase: {
    label: 'Time to purchase',
    description: 'Time from test start to successful payment.',
  },
  message_fatigue_rate: {
    label: 'Message fatigue rate',
    description: 'How often users start ignoring repetitive conversational nudges.',
  },
  recovery_success_rate: {
    label: 'Recovery success rate',
    description: 'How often an interrupted flow is successfully resumed.',
  },
  orphan_recovery_rate: {
    label: 'Orphan recovery rate',
    description: 'How often dead-end or orphan states are guided back to a live path.',
  },
  followup_effectiveness: {
    label: 'Follow-up effectiveness',
    description: 'How well progressive follow-ups move the user forward.',
  },
  conversation_interruption_rate: {
    label: 'Conversation interruption rate',
    description: 'How often the user leaves or gets interrupted mid-flow.',
  },
  humanized_recovery_success: {
    label: 'Humanized recovery success',
    description: 'How often a recovery message feels contextual and gets the user moving again.',
  },
  relationship_depth_score: {
    label: 'Relationship depth score',
    description: 'Depth of relationship continuity across returns, zooms, and repeated engagement.',
  },
  continuity_retention_score: {
    label: 'Continuity retention score',
    description: 'How much relationship continuity is retained after interruptions or gaps.',
  },
  behavioral_stability_score: {
    label: 'Behavioral stability score',
    description: 'How stable the user journey looks across activity, recovery, and completion.',
  },
  relapse_frequency: {
    label: 'Relapse frequency',
    description: 'How often the same interruption or hesitation pattern repeats.',
  },
  stagnation_duration: {
    label: 'Stagnation duration',
    description: 'How long users tend to stay in the same stalled state before moving again.',
  },
  trust_progression: {
    label: 'Trust progression',
    description: 'How trust accumulates across returns, consistency, and deeper participation.',
  },
  return_context_success: {
    label: 'Return context success',
    description: 'How often a returning user receives and responds to the right context.',
  },
  contextual_recovery_success: {
    label: 'Contextual recovery success',
    description: 'How often contextual recovery copy moves the user back into a live path.',
  },
  upgrade_readiness_progression: {
    label: 'Upgrade readiness progression',
    description: 'How upgrade readiness grows across behavior, stability, and participation.',
  },
  cross_product_progression: {
    label: 'Cross-product progression',
    description: 'How users move across Focus, ABSystem AI, and deeper products.',
  },
  conversation_relevance_score: {
    label: 'Conversation relevance score',
    description: 'How relevant the conversation feels to the user’s current state and history.',
  },
}

const EVENT_ALIASES: Record<string, BehavioralEventType> = {
  TEST_OPENED: 'TEST_OPENED',
  TEST_STARTED: 'TEST_STARTED',
  QUESTION_ANSWERED: 'QUESTION_ANSWERED',
  TEST_COMPLETED: 'TEST_COMPLETED',
  RESULT_OPENED: 'RESULT_OPENED',
  CTA_FOCUS_CLICKED: 'CTA_FOCUS_CLICKED',
  TEST_EXITED: 'TEST_EXITED',
  CTA_CLICKED: 'CTA_CLICKED',
  MESSAGE_OPENED: 'MESSAGE_OPENED',
  FLOW_TRIGGERED: 'FLOW_TRIGGERED',
  FLOW_SKIPPED: 'FLOW_SKIPPED',
  FLOW_COMPLETED: 'FLOW_COMPLETED',
  billing_payment_initiated: 'PAYMENT_STARTED',
  payment_started: 'PAYMENT_STARTED',
  payment_success: 'PAYMENT_SUCCESS',
  payment_failed: 'PAYMENT_FAILED',
  PAYMENT_STARTED: 'PAYMENT_STARTED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ZOOM_REGISTERED: 'ZOOM_REGISTERED',
  ZOOM_ATTENDED: 'ZOOM_ATTENDED',
}

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function getField(payload: Prisma.JsonObject, key: string): unknown {
  return payload[key]
}

function getNumberField(payload: Prisma.JsonObject, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(getField(payload, key))
    if (value !== null) return value
  }
  return null
}

function getStringField(payload: Prisma.JsonObject, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(getField(payload, key))
    if (value) return value
  }
  return null
}

function getBooleanField(payload: Prisma.JsonObject, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = asBoolean(getField(payload, key))
    if (value !== null) return value
  }
  return null
}

function resolveCanonicalEvent(type: string): BehavioralEventType | null {
  return EVENT_ALIASES[type] ?? null
}

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

export type BehavioralEventRecord = {
  userId: string | null
  type: string
  state: string | null
  payload: Prisma.JsonValue | null
  createdAt: Date
}

export type BehavioralAnalyticsSnapshot = {
  metrics: Record<BehavioralMetricKey, number | string | Record<string, number>>
  dropOffPatterns: Record<BehavioralDropOffPattern, number>
  readiness: {
    low: number
    medium: number
    high: number
  }
  retentionMarkers: {
    inactivity_days_avg: number
    missed_zoom_count: number
    no_reply_streak: number
    unpaid_after_offer: number
    abandoned_payment: number
  }
}

function getBehavioralPayload(payload: Prisma.JsonValue | null): Prisma.JsonObject {
  if (!isJsonObject(payload)) {
    return {}
  }

  return isJsonObject(payload.behavioral) ? (payload.behavioral as Prisma.JsonObject) : payload
}

function getBehavioralCanonicalEvent(record: BehavioralEventRecord): BehavioralEventType | null {
  const payload = getBehavioralPayload(record.payload)
  const canonicalFromPayload = asString(payload.canonical_event)
  if (canonicalFromPayload && EVENT_ALIASES[canonicalFromPayload]) {
    return EVENT_ALIASES[canonicalFromPayload]
  }

  return resolveCanonicalEvent(record.type)
}

function getEventMetricValue(record: BehavioralEventRecord, metric: BehavioralMetricKey): number | null {
  const payload = getBehavioralPayload(record.payload)

  switch (metric) {
    case 'answer_latency_avg':
      return getNumberField(payload, ['latency_ms', 'answer_latency_ms'])
    case 'result_LTV':
      return getNumberField(payload, ['amount', 'amount_cents', 'amountCents'])
    case 'time_to_purchase':
      return getNumberField(payload, ['time_from_test_ms', 'timeFromTestMs'])
    default:
      return null
  }
}

function safeAverage(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

export function buildBehavioralAnalyticsSnapshot(events: BehavioralEventRecord[]): BehavioralAnalyticsSnapshot {
  const readinessBuckets = { low: 0, medium: 0, high: 0 }
  const dropOffPatterns: Record<BehavioralDropOffPattern, number> = {
    exited_on_question: 0,
    exited_after_result: 0,
    exited_after_offer: 0,
    payment_abandoned: 0,
    joined_no_zoom: 0,
    focus_no_upgrade: 0,
  }
  const retentionMarkerTotals = {
    inactivityDays: [] as number[],
    missedZoomCount: 0,
    noReplyStreak: 0,
    unpaidAfterOffer: 0,
    abandonedPayment: 0,
  }

  const startedUsers = new Set<string>()
  const completedUsers = new Set<string>()
  const questionUsers = new Set<string>()
  const exitUsers = new Set<string>()
  const resultUsers = new Set<string>()
  const focusUsers = new Set<string>()
  const messageOpenUsers = new Set<string>()
  const ctaClickUsers = new Set<string>()
  const paymentStartedUsers = new Set<string>()
  const paymentSuccessUsers = new Set<string>()
  const paymentFailedUsers = new Set<string>()
  const zoomRegisteredUsers = new Set<string>()
  const zoomAttendedUsers = new Set<string>()
  const returnAfterMessageUsers = new Set<string>()
  const resultTypes = new Map<string, number>()
  const answerLatencies: number[] = []
  const purchaseDurationsByUser = new Map<string, number>()
  const ltvValues: number[] = []

  const eventsByUser = new Map<string, BehavioralEventRecord[]>()
  for (const event of events) {
    if (event.userId) {
      const bucket = eventsByUser.get(event.userId) ?? []
      bucket.push(event)
      eventsByUser.set(event.userId, bucket)
    }
  }

  for (const event of events) {
    const canonical = getBehavioralCanonicalEvent(event)
    const payload = getBehavioralPayload(event.payload)
    const userId = event.userId

    if (canonical === 'QUESTION_ANSWERED' && userId) {
      questionUsers.add(userId)
      const latency = getEventMetricValue(event, 'answer_latency_avg')
      if (latency !== null) {
        answerLatencies.push(latency)
      }
    }

    if (canonical === 'TEST_STARTED' && userId) {
      startedUsers.add(userId)
    }

    if (canonical === 'TEST_COMPLETED' && userId) {
      completedUsers.add(userId)
      const resultType = getStringField(payload, ['result_type']) ?? 'default'
      resultTypes.set(resultType, (resultTypes.get(resultType) ?? 0) + 1)
    }

    if (canonical === 'RESULT_OPENED' && userId) {
      resultUsers.add(userId)
      const resultType = getStringField(payload, ['result_type']) ?? 'default'
      resultTypes.set(resultType, (resultTypes.get(resultType) ?? 0) + 1)
    }

    if (canonical === 'CTA_FOCUS_CLICKED' && userId) {
      focusUsers.add(userId)
    }

    if (canonical === 'CTA_CLICKED' && userId) {
      ctaClickUsers.add(userId)
    }

    if (canonical === 'MESSAGE_OPENED' && userId) {
      messageOpenUsers.add(userId)
    }

    if (canonical === 'PAYMENT_STARTED' && userId) {
      paymentStartedUsers.add(userId)
    }

    if (canonical === 'PAYMENT_SUCCESS' && userId) {
      paymentSuccessUsers.add(userId)
      const duration = getEventMetricValue(event, 'time_to_purchase')
      if (duration !== null) {
        purchaseDurationsByUser.set(userId, duration)
      }
      const amount = getEventMetricValue(event, 'result_LTV')
      if (amount !== null) {
        ltvValues.push(amount)
      }
    }

    if (canonical === 'PAYMENT_FAILED' && userId) {
      paymentFailedUsers.add(userId)
    }

    if (canonical === 'ZOOM_REGISTERED' && userId) {
      zoomRegisteredUsers.add(userId)
    }

    if (canonical === 'ZOOM_ATTENDED' && userId) {
      zoomAttendedUsers.add(userId)
    }

    const dropOff = payload.drop_off_pattern
    if (typeof dropOff === 'string' && dropOff in dropOffPatterns) {
      dropOffPatterns[dropOff as BehavioralDropOffPattern] += 1
    }

    const readiness = isJsonObject(payload.readiness) ? payload.readiness as Prisma.JsonObject : null
    const level = readiness && asString(readiness.level)
    if (level === 'low' || level === 'medium' || level === 'high') {
      readinessBuckets[level] += 1
    }

    const retention = isJsonObject(payload.retention_markers) ? payload.retention_markers as Prisma.JsonObject : null
    const inactivityDays = retention ? asNumber(retention.inactivity_days) : null
    const missedZoomCount = retention ? asNumber(retention.missed_zoom_count) : null
    const noReplyStreak = retention ? asNumber(retention.no_reply_streak) : null
    const unpaidAfterOffer = retention ? asBoolean(retention.unpaid_after_offer) : null
    const abandonedPayment = retention ? asBoolean(retention.abandoned_payment) : null

    if (inactivityDays !== null) {
      retentionMarkerTotals.inactivityDays.push(inactivityDays)
    }
    if (missedZoomCount !== null) {
      retentionMarkerTotals.missedZoomCount += missedZoomCount
    }
    if (noReplyStreak !== null) {
      retentionMarkerTotals.noReplyStreak += noReplyStreak
    }
    if (unpaidAfterOffer) {
      retentionMarkerTotals.unpaidAfterOffer += 1
    }
    if (abandonedPayment) {
      retentionMarkerTotals.abandonedPayment += 1
    }

    const readinessSignals = isJsonObject(payload.readiness) ? payload.readiness as Prisma.JsonObject : null
    const readinessSignalValues = readinessSignals && isJsonObject(readinessSignals.signals)
      ? readinessSignals.signals as Prisma.JsonObject
      : null
    if (readinessSignalValues && asBoolean(readinessSignalValues.returned_after_24h)) {
      if (event.userId) {
        returnAfterMessageUsers.add(event.userId)
      }
    }
  }

  for (const userId of paymentSuccessUsers) {
    if (purchaseDurationsByUser.has(userId)) {
      continue
    }

    const userEvents = eventsByUser.get(userId) ?? []
    const firstTestStarted = userEvents.find((event) => getBehavioralCanonicalEvent(event) === 'TEST_STARTED')
    const firstPaymentSuccess = userEvents.find((event) => getBehavioralCanonicalEvent(event) === 'PAYMENT_SUCCESS')
    if (firstTestStarted && firstPaymentSuccess) {
      purchaseDurationsByUser.set(userId, Math.max(0, firstPaymentSuccess.createdAt.getTime() - firstTestStarted.createdAt.getTime()))
    }
  }

  dropOffPatterns.joined_no_zoom = Math.max(0, zoomRegisteredUsers.size - zoomAttendedUsers.size)
  dropOffPatterns.focus_no_upgrade = Math.max(0, resultUsers.size - focusUsers.size)
  dropOffPatterns.payment_abandoned = Math.max(dropOffPatterns.payment_abandoned, Math.max(0, paymentStartedUsers.size - paymentSuccessUsers.size))

  const focusPaymentConversion = safeAverage([
    focusUsers.size > 0 ? (paymentSuccessUsers.size / focusUsers.size) * 100 : 0,
  ])
  const resultToFocusCtr = safeAverage([
    resultUsers.size > 0 ? (focusUsers.size / resultUsers.size) * 100 : 0,
  ])
  const paymentAbandonmentRate = safeAverage([
    paymentStartedUsers.size > 0 ? (paymentFailedUsers.size / paymentStartedUsers.size) * 100 : 0,
  ])
  const zoomAttendanceRate = safeAverage([
    zoomRegisteredUsers.size > 0 ? (zoomAttendedUsers.size / zoomRegisteredUsers.size) * 100 : 0,
  ])
  const channelJoinRate = safeAverage([
    resultUsers.size > 0 ? (zoomRegisteredUsers.size / resultUsers.size) * 100 : 0,
  ])
  const testCompletionRate = safeAverage([
    startedUsers.size > 0 ? (completedUsers.size / startedUsers.size) * 100 : 0,
  ])
  const questionDropoffRate = safeAverage([
    questionUsers.size > 0 ? ((questionUsers.size - completedUsers.size) / questionUsers.size) * 100 : 0,
  ])
  const focusToPlatformConversion = safeAverage([
    focusUsers.size > 0 ? (paymentSuccessUsers.size / focusUsers.size) * 100 : 0,
  ])
  const resultLtv = safeAverage(ltvValues)
  const timeToPurchase = safeAverage([...purchaseDurationsByUser.values()])
  const answerLatencyAvg = safeAverage(answerLatencies)
  const retentionRiskScore = safeAverage([
    retentionMarkerTotals.inactivityDays.length > 0
      ? retentionMarkerTotals.inactivityDays.reduce((sum, value) => sum + Math.min(100, value * 6), 0) / retentionMarkerTotals.inactivityDays.length
      : 0,
    retentionMarkerTotals.missedZoomCount * 14,
    retentionMarkerTotals.noReplyStreak * 12,
    retentionMarkerTotals.unpaidAfterOffer * 18,
    retentionMarkerTotals.abandonedPayment * 20,
  ])
  const returnAfterMessageRate = safeAverage([
    messageOpenUsers.size > 0 ? (returnAfterMessageUsers.size / messageOpenUsers.size) * 100 : 0,
  ])
  const ctaConversionRate = safeAverage([
    messageOpenUsers.size > 0 ? (ctaClickUsers.size / messageOpenUsers.size) * 100 : 0,
  ])
  const messageFatigueRate = safeAverage([
    Math.max(0, 100 - returnAfterMessageRate),
  ])
  const recoverySuccessRate = safeAverage([
    returnAfterMessageRate,
  ])
  const orphanRecoveryRate = safeAverage([
    returnAfterMessageRate,
  ])
  const followupEffectiveness = safeAverage([
    ctaConversionRate,
  ])
  const conversationInterruptionRate = safeAverage([
    questionDropoffRate,
  ])
  const humanizedRecoverySuccess = safeAverage([
    returnAfterMessageRate,
  ])
  const relationshipDepthScore = safeAverage([
    testCompletionRate,
    zoomAttendanceRate,
    returnAfterMessageRate,
    focusToPlatformConversion,
  ])
  const continuityRetentionScore = Math.max(0, Math.round(100 - retentionRiskScore))
  const behavioralStabilityScore = safeAverage([
    testCompletionRate,
    returnAfterMessageRate,
    Math.max(0, 100 - questionDropoffRate),
    Math.max(0, 100 - paymentAbandonmentRate),
  ])
  const relapseFrequency = safeAverage([
    Math.min(
      100,
      (dropOffPatterns.joined_no_zoom * 12)
        + (dropOffPatterns.focus_no_upgrade * 10)
        + (dropOffPatterns.payment_abandoned * 15)
        + ((100 - returnAfterMessageRate) * 0.4),
    ),
  ])
  const stagnationDuration = safeAverage(retentionMarkerTotals.inactivityDays)
  const trustProgression = safeAverage([
    relationshipDepthScore,
    continuityRetentionScore,
    behavioralStabilityScore,
  ])
  const returnContextSuccess = returnAfterMessageRate
  const contextualRecoverySuccess = humanizedRecoverySuccess
  const totalReadinessSignals = readinessBuckets.low + readinessBuckets.medium + readinessBuckets.high
  const upgradeReadinessProgression = totalReadinessSignals > 0
    ? Math.round((((readinessBuckets.medium * 50) + (readinessBuckets.high * 100)) / totalReadinessSignals) * 10) / 10
    : 0
  const crossProductProgression = safeAverage([
    resultToFocusCtr,
    focusToPlatformConversion,
    channelJoinRate,
  ])
  const conversationRelevanceScore = safeAverage([
    returnAfterMessageRate,
    ctaConversionRate,
    contextualRecoverySuccess,
  ])

  return {
    metrics: {
      test_completion_rate: testCompletionRate,
      question_dropoff_rate: questionDropoffRate,
      answer_latency_avg: answerLatencyAvg,
      result_distribution: Object.fromEntries(resultTypes.entries()),
      result_to_focus_ctr: resultToFocusCtr,
      focus_payment_conversion: focusPaymentConversion,
      payment_abandonment_rate: paymentAbandonmentRate,
      channel_join_rate: channelJoinRate,
      zoom_attendance_rate: zoomAttendanceRate,
      focus_to_platform_conversion: focusToPlatformConversion,
      retention_risk_score: retentionRiskScore,
      return_after_message_rate: returnAfterMessageRate,
      CTA_conversion_rate: ctaConversionRate,
      result_LTV: resultLtv,
      time_to_purchase: timeToPurchase,
      message_fatigue_rate: messageFatigueRate,
      recovery_success_rate: recoverySuccessRate,
      orphan_recovery_rate: orphanRecoveryRate,
      followup_effectiveness: followupEffectiveness,
      conversation_interruption_rate: conversationInterruptionRate,
      humanized_recovery_success: humanizedRecoverySuccess,
      relationship_depth_score: relationshipDepthScore,
      continuity_retention_score: continuityRetentionScore,
      behavioral_stability_score: behavioralStabilityScore,
      relapse_frequency: relapseFrequency,
      stagnation_duration: stagnationDuration,
      trust_progression: trustProgression,
      return_context_success: returnContextSuccess,
      contextual_recovery_success: contextualRecoverySuccess,
      upgrade_readiness_progression: upgradeReadinessProgression,
      cross_product_progression: crossProductProgression,
      conversation_relevance_score: conversationRelevanceScore,
    },
    dropOffPatterns,
    readiness: readinessBuckets,
    retentionMarkers: {
      inactivity_days_avg: safeAverage(retentionMarkerTotals.inactivityDays),
      missed_zoom_count: retentionMarkerTotals.missedZoomCount,
      no_reply_streak: retentionMarkerTotals.noReplyStreak,
      unpaid_after_offer: retentionMarkerTotals.unpaidAfterOffer,
      abandoned_payment: retentionMarkerTotals.abandonedPayment,
    },
  }
}
