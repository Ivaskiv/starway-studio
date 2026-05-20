import type { Prisma } from '@starway/db/prisma-client'
import { CANONICAL_CTA_IDS, CANONICAL_MESSAGE_KEYS, type CanonicalCtaId, type CanonicalMessageKey } from './ctaFoundation.js'

export const CANONICAL_FLOW_TIMER_IDS = [
  'RESULT_FOLLOWUP_24H',
  'RESULT_FOLLOWUP_48H',
  'RESULT_FOLLOWUP_72H',
  'RESULT_DOJIM_24H',
  'RESULT_DOJIM_48H',
  'RESULT_DOJIM_72H',
  'RESULT_DOJIM_5D',
  'RESULT_DOJIM_7D',
  'PAYMENT_REMINDER_24H',
  'PAYMENT_REMINDER_48H',
  'PAYMENT_REMINDER_72H',
  'PAYMENT_REMINDER_5D',
  'PAYMENT_REMINDER_7D',
  'ZOOM_REMINDER_24H',
  'ZOOM_REMINDER_2H',
  'PLATFORM_INVITE_AFTER_ZOOM_1',
  'PLATFORM_INVITE_AFTER_ZOOM_2',
] as const

export type CanonicalFlowTimerId = typeof CANONICAL_FLOW_TIMER_IDS[number]

export type CanonicalFlowStageId =
  | 'S0_TRAFFIC'
  | 'S3_TEST_RESULT'
  | 'S4_FOCUS_INVITE'
  | 'S5_PAYMENT'
  | 'S6_ZOOM'
  | 'S7_PLATFORM_INVITE'
  | 'S8_PLATFORM_READY'
  | 'S9_RETENTION'
  | 'S10_RETENTION_WINBACK'

export type CanonicalFlowTriggerEvent =
  | 'RESULT_OPENED'
  | 'PAYMENT_STARTED'
  | 'ZOOM_REGISTERED'
  | 'ZOOM_ATTENDED'
  | 'RETENTION_RISK'

export type CanonicalFlowDeliveryReason =
  | 'duplicate_reminder'
  | 'state_changed'
  | 'payment_success_already_happened'
  | 'focus_readiness_missing'
  | 'active_user_retention_flow'

export type CanonicalFlowTimerDefinition = {
  id: CanonicalFlowTimerId
  source_stage: CanonicalFlowStageId
  trigger_event: CanonicalFlowTriggerEvent
  delay_ms: number
  allowed_states: readonly CanonicalFlowStageId[]
  blocked_states: readonly CanonicalFlowStageId[]
  message_key: CanonicalMessageKey
  analytics_hook: 'FLOW_TRIGGERED' | 'FLOW_SKIPPED' | 'FLOW_COMPLETED'
}

export type CanonicalFlowOrchestrationRule = {
  trigger_event: CanonicalFlowTriggerEvent
  timers: readonly CanonicalFlowTimerId[]
  message_key: CanonicalMessageKey
  allowed_cta: readonly CanonicalCtaId[]
  next_expected_transition: CanonicalFlowStageId
}

export const CANONICAL_FLOW_TIMER_REGISTRY: Record<CanonicalFlowTimerId, CanonicalFlowTimerDefinition> = {
  RESULT_FOLLOWUP_24H: {
    id: 'RESULT_FOLLOWUP_24H',
    source_stage: 'S3_TEST_RESULT',
    trigger_event: 'RESULT_OPENED',
    delay_ms: 24 * 60 * 60 * 1000,
    allowed_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE'],
    blocked_states: ['S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'TEST_RESULT_ACTION',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  RESULT_FOLLOWUP_48H: {
    id: 'RESULT_FOLLOWUP_48H',
    source_stage: 'S3_TEST_RESULT',
    trigger_event: 'RESULT_OPENED',
    delay_ms: 48 * 60 * 60 * 1000,
    allowed_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE'],
    blocked_states: ['S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'TEST_RESULT_DECISION',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  RESULT_FOLLOWUP_72H: {
    id: 'RESULT_FOLLOWUP_72H',
    source_stage: 'S3_TEST_RESULT',
    trigger_event: 'RESULT_OPENED',
    delay_ms: 72 * 60 * 60 * 1000,
    allowed_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE'],
    blocked_states: ['S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'TEST_RESULT_CHOICE',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  RESULT_DOJIM_24H: {
    id: 'RESULT_DOJIM_24H',
    source_stage: 'S4_FOCUS_INVITE',
    trigger_event: 'RESULT_OPENED',
    delay_ms: 24 * 60 * 60 * 1000,
    allowed_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE'],
    blocked_states: ['S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'TEST_RESULT_ACTION',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  RESULT_DOJIM_48H: {
    id: 'RESULT_DOJIM_48H',
    source_stage: 'S4_FOCUS_INVITE',
    trigger_event: 'RESULT_OPENED',
    delay_ms: 48 * 60 * 60 * 1000,
    allowed_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE'],
    blocked_states: ['S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'TEST_RESULT_ACTION',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  RESULT_DOJIM_72H: {
    id: 'RESULT_DOJIM_72H',
    source_stage: 'S4_FOCUS_INVITE',
    trigger_event: 'RESULT_OPENED',
    delay_ms: 72 * 60 * 60 * 1000,
    allowed_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE'],
    blocked_states: ['S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'TEST_RESULT_ACTION',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  RESULT_DOJIM_5D: {
    id: 'RESULT_DOJIM_5D',
    source_stage: 'S4_FOCUS_INVITE',
    trigger_event: 'RESULT_OPENED',
    delay_ms: 5 * 24 * 60 * 60 * 1000,
    allowed_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE'],
    blocked_states: ['S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'TEST_RESULT_ACTION',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  RESULT_DOJIM_7D: {
    id: 'RESULT_DOJIM_7D',
    source_stage: 'S4_FOCUS_INVITE',
    trigger_event: 'RESULT_OPENED',
    delay_ms: 7 * 24 * 60 * 60 * 1000,
    allowed_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE'],
    blocked_states: ['S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'TEST_RESULT_ACTION',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  PAYMENT_REMINDER_24H: {
    id: 'PAYMENT_REMINDER_24H',
    source_stage: 'S5_PAYMENT',
    trigger_event: 'PAYMENT_STARTED',
    delay_ms: 24 * 60 * 60 * 1000,
    allowed_states: ['S4_FOCUS_INVITE', 'S5_PAYMENT'],
    blocked_states: ['S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'PAYMENT_REMINDER_24H',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  PAYMENT_REMINDER_48H: {
    id: 'PAYMENT_REMINDER_48H',
    source_stage: 'S5_PAYMENT',
    trigger_event: 'PAYMENT_STARTED',
    delay_ms: 48 * 60 * 60 * 1000,
    allowed_states: ['S4_FOCUS_INVITE', 'S5_PAYMENT'],
    blocked_states: ['S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'PAYMENT_REMINDER_48H',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  PAYMENT_REMINDER_72H: {
    id: 'PAYMENT_REMINDER_72H',
    source_stage: 'S5_PAYMENT',
    trigger_event: 'PAYMENT_STARTED',
    delay_ms: 72 * 60 * 60 * 1000,
    allowed_states: ['S4_FOCUS_INVITE', 'S5_PAYMENT'],
    blocked_states: ['S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'PAYMENT_REMINDER_72H',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  PAYMENT_REMINDER_5D: {
    id: 'PAYMENT_REMINDER_5D',
    source_stage: 'S9_RETENTION',
    trigger_event: 'RETENTION_RISK',
    delay_ms: 5 * 24 * 60 * 60 * 1000,
    allowed_states: ['S9_RETENTION', 'S10_RETENTION_WINBACK'],
    blocked_states: ['S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY'],
    message_key: 'PAYMENT_REMINDER_72H',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  PAYMENT_REMINDER_7D: {
    id: 'PAYMENT_REMINDER_7D',
    source_stage: 'S9_RETENTION',
    trigger_event: 'RETENTION_RISK',
    delay_ms: 7 * 24 * 60 * 60 * 1000,
    allowed_states: ['S9_RETENTION', 'S10_RETENTION_WINBACK'],
    blocked_states: ['S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY'],
    message_key: 'PAYMENT_REMINDER_72H',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  ZOOM_REMINDER_24H: {
    id: 'ZOOM_REMINDER_24H',
    source_stage: 'S6_ZOOM',
    trigger_event: 'ZOOM_REGISTERED',
    delay_ms: 24 * 60 * 60 * 1000,
    allowed_states: ['S5_PAYMENT', 'S6_ZOOM'],
    blocked_states: ['S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'ZOOM_REMINDER_24H',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  ZOOM_REMINDER_2H: {
    id: 'ZOOM_REMINDER_2H',
    source_stage: 'S6_ZOOM',
    trigger_event: 'ZOOM_REGISTERED',
    delay_ms: 2 * 60 * 60 * 1000,
    allowed_states: ['S5_PAYMENT', 'S6_ZOOM'],
    blocked_states: ['S7_PLATFORM_INVITE', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'ZOOM_REMINDER_2H',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  PLATFORM_INVITE_AFTER_ZOOM_1: {
    id: 'PLATFORM_INVITE_AFTER_ZOOM_1',
    source_stage: 'S7_PLATFORM_INVITE',
    trigger_event: 'ZOOM_ATTENDED',
    delay_ms: 24 * 60 * 60 * 1000,
    allowed_states: ['S6_ZOOM', 'S7_PLATFORM_INVITE'],
    blocked_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE', 'S5_PAYMENT', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'PLATFORM_INVITE_AFTER_ZOOM',
    analytics_hook: 'FLOW_TRIGGERED',
  },
  PLATFORM_INVITE_AFTER_ZOOM_2: {
    id: 'PLATFORM_INVITE_AFTER_ZOOM_2',
    source_stage: 'S7_PLATFORM_INVITE',
    trigger_event: 'ZOOM_ATTENDED',
    delay_ms: 48 * 60 * 60 * 1000,
    allowed_states: ['S6_ZOOM', 'S7_PLATFORM_INVITE'],
    blocked_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE', 'S5_PAYMENT', 'S8_PLATFORM_READY', 'S9_RETENTION', 'S10_RETENTION_WINBACK'],
    message_key: 'PLATFORM_INVITE_AFTER_ZOOM',
    analytics_hook: 'FLOW_TRIGGERED',
  },
}

export const CANONICAL_FLOW_ORCHESTRATION_RULES: Record<CanonicalFlowTriggerEvent, CanonicalFlowOrchestrationRule> = {
  RESULT_OPENED: {
    trigger_event: 'RESULT_OPENED',
    timers: ['RESULT_FOLLOWUP_24H', 'RESULT_FOLLOWUP_48H', 'RESULT_FOLLOWUP_72H'],
    message_key: 'TEST_RESULT_ACTION',
    allowed_cta: ['OPEN_FOCUS', 'CONTINUE_FLOW'],
    next_expected_transition: 'S4_FOCUS_INVITE',
  },
  PAYMENT_STARTED: {
    trigger_event: 'PAYMENT_STARTED',
    timers: ['PAYMENT_REMINDER_24H', 'PAYMENT_REMINDER_48H', 'PAYMENT_REMINDER_72H'],
    message_key: 'PAYMENT_REMINDER_24H',
    allowed_cta: ['PAY_FOCUS_1M', 'PAY_FOCUS_3M', 'RESTORE_PROGRESS'],
    next_expected_transition: 'S5_PAYMENT',
  },
  ZOOM_REGISTERED: {
    trigger_event: 'ZOOM_REGISTERED',
    timers: ['ZOOM_REMINDER_24H', 'ZOOM_REMINDER_2H'],
    message_key: 'ZOOM_REMINDER_24H',
    allowed_cta: ['OPEN_ZOOM', 'CONTINUE_FLOW'],
    next_expected_transition: 'S6_ZOOM',
  },
  ZOOM_ATTENDED: {
    trigger_event: 'ZOOM_ATTENDED',
    timers: ['PLATFORM_INVITE_AFTER_ZOOM_1', 'PLATFORM_INVITE_AFTER_ZOOM_2'],
    message_key: 'PLATFORM_INVITE_AFTER_ZOOM',
    allowed_cta: ['OPEN_PLATFORM', 'CONTINUE_FLOW'],
    next_expected_transition: 'S7_PLATFORM_INVITE',
  },
  RETENTION_RISK: {
    trigger_event: 'RETENTION_RISK',
    timers: ['PAYMENT_REMINDER_5D', 'PAYMENT_REMINDER_7D'],
    message_key: 'PAYMENT_REMINDER_72H',
    allowed_cta: ['RESTORE_PROGRESS'],
    next_expected_transition: 'S9_RETENTION',
  },
}

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function resolveFlowTimerById(timerId: CanonicalFlowTimerId) {
  return CANONICAL_FLOW_TIMER_REGISTRY[timerId]
}

export function resolveFlowTimerFromNotification(input: {
  event: string
  payload?: Prisma.JsonValue | null
}): CanonicalFlowTimerDefinition | null {
  const payload = isJsonObject(input.payload) ? input.payload : {}
  const explicitTimerId = asString(payload.flow_timer_id ?? payload.flowTimerId)
  if (explicitTimerId && (CANONICAL_FLOW_TIMER_IDS as readonly string[]).includes(explicitTimerId)) {
    return resolveFlowTimerById(explicitTimerId as CanonicalFlowTimerId)
  }

  if (input.event === 'POST_TRIAL_REPORTS') {
    return resolveFlowTimerById('RESULT_FOLLOWUP_24H')
  }

  if (input.event === 'SUBSCRIPTION_EXPIRING') {
    return resolveFlowTimerById('PAYMENT_REMINDER_5D')
  }

  if (input.event === 'SUBSCRIPTION_EXPIRED') {
    return resolveFlowTimerById('PAYMENT_REMINDER_7D')
  }

  return null
}

export function resolveFlowTimerContext(input: {
  trigger_event: CanonicalFlowTriggerEvent | string
  timer_id?: CanonicalFlowTimerId | null
  payload?: Prisma.JsonValue | null
}): {
  timer: CanonicalFlowTimerDefinition | null
  rule: CanonicalFlowOrchestrationRule | null
} {
  const payload = isJsonObject(input.payload) ? input.payload : {}
  const resolvedTimer = input.timer_id
    ? resolveFlowTimerById(input.timer_id)
    : CANONICAL_FLOW_ORCHESTRATION_RULES[input.trigger_event as CanonicalFlowTriggerEvent]
      ? resolveFlowTimerById(CANONICAL_FLOW_ORCHESTRATION_RULES[input.trigger_event as CanonicalFlowTriggerEvent].timers[0])
      : resolveFlowTimerFromNotification({ event: input.trigger_event, payload })

  const rule = resolvedTimer
    ? CANONICAL_FLOW_ORCHESTRATION_RULES[resolvedTimer.trigger_event]
    : (CANONICAL_FLOW_ORCHESTRATION_RULES[input.trigger_event as CanonicalFlowTriggerEvent] ?? null)

  return {
    timer: resolvedTimer,
    rule,
  }
}

export function shouldSkipFlowTimerDelivery(input: {
  currentState: string | null
  timer: CanonicalFlowTimerDefinition
  payload?: Prisma.JsonValue | null
  hasPaymentSuccess?: boolean
  hasZoomAttendance?: boolean
  isActiveUser?: boolean
  readinessLevel?: string | null
}): { ok: boolean; reason?: CanonicalFlowDeliveryReason } {
  const state = input.currentState ?? null
  const timer = input.timer

  if (state && !timer.allowed_states.includes(state as CanonicalFlowStageId)) {
    return { ok: false, reason: 'state_changed' }
  }

  if (input.hasPaymentSuccess) {
    return { ok: false, reason: 'payment_success_already_happened' }
  }

  if (timer.id.startsWith('PLATFORM_INVITE_AFTER_ZOOM') && input.readinessLevel === 'low') {
    return { ok: false, reason: 'focus_readiness_missing' }
  }

  if (timer.source_stage === 'S9_RETENTION' && input.isActiveUser) {
    return { ok: false, reason: 'active_user_retention_flow' }
  }

  if (timer.trigger_event === 'ZOOM_REGISTERED' && input.hasZoomAttendance) {
    return { ok: false, reason: 'state_changed' }
  }

  return { ok: true }
}

export function buildFlowTimerAnalytics(input: {
  timer: CanonicalFlowTimerDefinition
  lifecycleStage?: string | null
  delayMs?: number | null
  currentState?: string | null
  reason?: string | null
  resultingEvent?: string | null
  resultingTransition?: string | null
}): Prisma.JsonObject {
  if (input.reason) {
    return {
      flow_timer_id: input.timer.id,
      reason: input.reason,
      current_state: input.currentState ?? null,
    }
  }

  if (input.resultingEvent || input.resultingTransition) {
    return {
      flow_timer_id: input.timer.id,
      resulting_event: input.resultingEvent ?? null,
      resulting_transition: input.resultingTransition ?? null,
    }
  }

  return {
    flow_timer_id: input.timer.id,
    lifecycle_stage: input.lifecycleStage ?? input.timer.source_stage,
    delay_ms: input.delayMs ?? input.timer.delay_ms,
  }
}

export function validateCanonicalFlowTimingFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []

  if (new Set(CANONICAL_FLOW_TIMER_IDS).size !== CANONICAL_FLOW_TIMER_IDS.length) {
    errors.push('duplicate_flow_timer_ids_detected')
  }

  for (const timerId of CANONICAL_FLOW_TIMER_IDS) {
    const timer = CANONICAL_FLOW_TIMER_REGISTRY[timerId]
    if (!timer) {
      errors.push(`missing_timer_definition:${timerId}`)
      continue
    }
    if (!(CANONICAL_MESSAGE_KEYS as readonly string[]).includes(timer.message_key)) {
      errors.push(`missing_timer_message_key:${timerId}`)
    }
    if (!(CANONICAL_CTA_IDS as readonly string[]).includes(
      timer.id.startsWith('RESULT') ? 'OPEN_FOCUS' : timer.id.startsWith('PAYMENT') ? 'RESTORE_PROGRESS' : timer.id.startsWith('ZOOM') ? 'OPEN_ZOOM' : 'OPEN_PLATFORM',
    )) {
      errors.push(`timer_cta_catalog_mismatch:${timerId}`)
    }
  }

  for (const triggerEvent of Object.keys(CANONICAL_FLOW_ORCHESTRATION_RULES) as CanonicalFlowTriggerEvent[]) {
    const rule = CANONICAL_FLOW_ORCHESTRATION_RULES[triggerEvent]
    if (!rule.timers.length) {
      errors.push(`missing_rule_timers:${triggerEvent}`)
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

export function resolveCanonicalFlowMessageKey(timerId: CanonicalFlowTimerId): CanonicalMessageKey {
  return resolveFlowTimerById(timerId).message_key
}

export function resolveCanonicalFlowCta(timerId: CanonicalFlowTimerId): CanonicalCtaId[] {
  const timer = resolveFlowTimerById(timerId)
  const rule = CANONICAL_FLOW_ORCHESTRATION_RULES[timer.trigger_event]
  return [...rule.allowed_cta]
}

export function resolveCanonicalFlowTimerIds(triggerEvent: CanonicalFlowTriggerEvent): CanonicalFlowTimerId[] {
  return [...CANONICAL_FLOW_ORCHESTRATION_RULES[triggerEvent].timers]
}
