import type { Prisma } from '@starway/db/prisma-client'

import {
  CANONICAL_CTA_REGISTRY,
  type CanonicalCtaId,
  type CanonicalMessageKey,
  resolveCanonicalMessageKeyByCtaId,
} from './ctaFoundation.js'
import {
  PAYMENT_REMINDER_MESSAGE_KEY_24H,
  PAYMENT_REMINDER_MESSAGE_KEY_72H,
} from './paymentReminderFoundation.js'
import {
  CANONICAL_FLOW_TIMER_REGISTRY,
  type CanonicalFlowStageId,
  type CanonicalFlowTimerId,
} from './flowTimingFoundation.js'

export const CANONICAL_FLOW_IDS = [
  'FOCUS_CONVERSION_FLOW',
  'PAYMENT_RECOVERY_FLOW',
  'ZOOM_ACTIVATION_FLOW',
  'PLATFORM_INVITE_FLOW',
  'PLATFORM_ACTIVATION_FLOW',
  'RETENTION_FLOW',
  'RETURN_FLOW',
] as const

export type CanonicalFlowId = typeof CANONICAL_FLOW_IDS[number]

export const CANONICAL_FLOW_ACTION_TYPES = [
  'SEND_MESSAGE',
  'SCHEDULE_TIMER',
  'CANCEL_TIMER',
  'OPEN_CTA',
  'CLOSE_FLOW',
  'COMPLETE_FLOW',
  'SKIP_FLOW',
  'MARK_RETENTION',
  'MARK_UPGRADE_READY',
] as const

export type CanonicalFlowActionType = typeof CANONICAL_FLOW_ACTION_TYPES[number]

export type CanonicalFlowPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export type CanonicalFlowReadinessRequirements = {
  minimum_level?: 'low' | 'medium' | 'high'
  requires_zoom_attended?: boolean
  requires_payment_success?: boolean
  requires_active_user?: boolean
  requires_platform_offer?: boolean
}

export type CanonicalFlowDefinition = {
  flow_id: CanonicalFlowId
  entry_state: CanonicalFlowStageId
  completion_state: CanonicalFlowStageId
  cancellation_states: readonly CanonicalFlowStageId[]
  allowed_events: readonly string[]
  blocked_events: readonly string[]
  orchestration_priority: CanonicalFlowPriority
  readiness_requirements: CanonicalFlowReadinessRequirements
  analytics_hooks: readonly string[]
  primary_cta: CanonicalCtaId
  completion_cta: CanonicalCtaId
  message_key: CanonicalMessageKey
  timer_ids: readonly CanonicalFlowTimerId[]
}

export type CanonicalFlowAction = {
  action_type: CanonicalFlowActionType
  flow_id: CanonicalFlowId
  message_key?: CanonicalMessageKey
  cta_id?: CanonicalCtaId
  timer_id?: CanonicalFlowTimerId
}

export type CanonicalFlowOrchestrationDecision = {
  flow_id: CanonicalFlowId | null
  flow_action: CanonicalFlowAction[]
  orchestration_reason: string | null
  blocked_reason: CanonicalFlowOrchestrationBlockReason | null
  guardrail_result: 'allow' | 'block'
  orchestration_priority: CanonicalFlowPriority | null
  lifecycle_stage: string | null
}

export type CanonicalFlowOrchestrationBlockReason =
  | 'duplicate_reminder'
  | 'state_changed'
  | 'payment_success_already_happened'
  | 'focus_readiness_missing'
  | 'active_user_retention_flow'
  | 'parallel_conflicting_flow'
  | 'upgrade_flow_without_focus_activation'
  | 'platform_invite_before_zoom_readiness'

const READINESS_ORDER: Array<NonNullable<CanonicalFlowReadinessRequirements['minimum_level']>> = ['low', 'medium', 'high']

export const CANONICAL_FLOW_REGISTRY: Record<CanonicalFlowId, CanonicalFlowDefinition> = {
  FOCUS_CONVERSION_FLOW: {
    flow_id: 'FOCUS_CONVERSION_FLOW',
    entry_state: 'S3_TEST_RESULT',
    completion_state: 'S5_PAYMENT',
    cancellation_states: ['S9_RETENTION', 'S10_RETENTION_WINBACK'],
    allowed_events: ['RESULT_OPENED', 'CTA_FOCUS_CLICKED', 'TEST_COMPLETED'],
    blocked_events: ['PAYMENT_SUCCESS', 'ZOOM_ATTENDED', 'RETENTION_RISK'],
    orchestration_priority: 'MEDIUM',
    readiness_requirements: {
      minimum_level: 'low',
    },
    analytics_hooks: ['flow_id', 'flow_action', 'orchestration_reason', 'guardrail_result', 'orchestration_priority', 'lifecycle_stage'],
    primary_cta: 'OPEN_FOCUS',
    completion_cta: 'PAY_FOCUS_1M',
    message_key: 'TEST_RESULT_ACTION',
    timer_ids: ['RESULT_FOLLOWUP_24H', 'RESULT_FOLLOWUP_48H', 'RESULT_FOLLOWUP_72H'],
  },
  PAYMENT_RECOVERY_FLOW: {
    flow_id: 'PAYMENT_RECOVERY_FLOW',
    entry_state: 'S5_PAYMENT',
    completion_state: 'S6_ZOOM',
    cancellation_states: ['S9_RETENTION', 'S10_RETENTION_WINBACK'],
    allowed_events: ['PAYMENT_STARTED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'SUBSCRIPTION_EXPIRING', 'SUBSCRIPTION_EXPIRED'],
    blocked_events: ['ZOOM_ATTENDED', 'RETENTION_RISK'],
    orchestration_priority: 'MEDIUM',
    readiness_requirements: {
      minimum_level: 'medium',
      requires_payment_success: false,
    },
    analytics_hooks: ['flow_id', 'flow_action', 'orchestration_reason', 'blocked_reason', 'guardrail_result', 'orchestration_priority', 'lifecycle_stage'],
    primary_cta: 'PAY_FOCUS_1M',
    completion_cta: 'JOIN_CHANNEL',
    message_key: PAYMENT_REMINDER_MESSAGE_KEY_24H,
    timer_ids: ['PAYMENT_REMINDER_24H', 'PAYMENT_REMINDER_48H', 'PAYMENT_REMINDER_72H'],
  },
  ZOOM_ACTIVATION_FLOW: {
    flow_id: 'ZOOM_ACTIVATION_FLOW',
    entry_state: 'S6_ZOOM',
    completion_state: 'S7_PLATFORM_INVITE',
    cancellation_states: ['S9_RETENTION', 'S10_RETENTION_WINBACK'],
    allowed_events: ['ZOOM_REGISTERED', 'ZOOM_ATTENDED'],
    blocked_events: ['PAYMENT_STARTED', 'RETENTION_RISK'],
    orchestration_priority: 'MEDIUM',
    readiness_requirements: {
      minimum_level: 'medium',
      requires_payment_success: true,
    },
    analytics_hooks: ['flow_id', 'flow_action', 'orchestration_reason', 'guardrail_result', 'orchestration_priority', 'lifecycle_stage'],
    primary_cta: 'OPEN_ZOOM',
    completion_cta: 'OPEN_PLATFORM',
    message_key: 'ZOOM_REMINDER_24H',
    timer_ids: ['ZOOM_REMINDER_24H', 'ZOOM_REMINDER_2H'],
  },
  PLATFORM_INVITE_FLOW: {
    flow_id: 'PLATFORM_INVITE_FLOW',
    entry_state: 'S7_PLATFORM_INVITE',
    completion_state: 'S8_PLATFORM_READY',
    cancellation_states: ['S9_RETENTION', 'S10_RETENTION_WINBACK'],
    allowed_events: ['ZOOM_ATTENDED', 'OPEN_PLATFORM'],
    blocked_events: ['RESULT_OPENED', 'PAYMENT_STARTED'],
    orchestration_priority: 'HIGH',
    readiness_requirements: {
      minimum_level: 'high',
      requires_zoom_attended: true,
    },
    analytics_hooks: ['flow_id', 'flow_action', 'orchestration_reason', 'blocked_reason', 'guardrail_result', 'orchestration_priority', 'lifecycle_stage'],
    primary_cta: 'OPEN_PLATFORM',
    completion_cta: 'OPEN_PLATFORM',
    message_key: 'PLATFORM_INVITE_AFTER_ZOOM',
    timer_ids: ['PLATFORM_INVITE_AFTER_ZOOM_1', 'PLATFORM_INVITE_AFTER_ZOOM_2'],
  },
  PLATFORM_ACTIVATION_FLOW: {
    flow_id: 'PLATFORM_ACTIVATION_FLOW',
    entry_state: 'S8_PLATFORM_READY',
    completion_state: 'S8_PLATFORM_READY',
    cancellation_states: ['S9_RETENTION', 'S10_RETENTION_WINBACK'],
    allowed_events: ['OPEN_PLATFORM', 'CONTINUE_FLOW'],
    blocked_events: ['RESULT_OPENED', 'PAYMENT_STARTED'],
    orchestration_priority: 'HIGH',
    readiness_requirements: {
      minimum_level: 'high',
      requires_platform_offer: true,
    },
    analytics_hooks: ['flow_id', 'flow_action', 'orchestration_reason', 'guardrail_result', 'orchestration_priority', 'lifecycle_stage'],
    primary_cta: 'OPEN_PLATFORM',
    completion_cta: 'CONTINUE_FLOW',
    message_key: 'PLATFORM_INVITE_AFTER_ZOOM',
    timer_ids: [],
  },
  RETENTION_FLOW: {
    flow_id: 'RETENTION_FLOW',
    entry_state: 'S9_RETENTION',
    completion_state: 'S10_RETENTION_WINBACK',
    cancellation_states: ['S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY'],
    allowed_events: ['RETENTION_RISK', 'TEST_EXITED'],
    blocked_events: ['PAYMENT_SUCCESS', 'ZOOM_ATTENDED'],
    orchestration_priority: 'LOW',
    readiness_requirements: {
      requires_active_user: false,
    },
    analytics_hooks: ['flow_id', 'flow_action', 'orchestration_reason', 'blocked_reason', 'guardrail_result', 'orchestration_priority', 'lifecycle_stage'],
    primary_cta: 'RESTORE_PROGRESS',
    completion_cta: 'RESTORE_PROGRESS',
    message_key: PAYMENT_REMINDER_MESSAGE_KEY_72H,
    timer_ids: ['PAYMENT_REMINDER_5D', 'PAYMENT_REMINDER_7D'],
  },
  RETURN_FLOW: {
    flow_id: 'RETURN_FLOW',
    entry_state: 'S10_RETENTION_WINBACK',
    completion_state: 'S0_TRAFFIC',
    cancellation_states: ['S9_RETENTION'],
    allowed_events: ['RESTORE_PROGRESS', 'CONTINUE_FLOW'],
    blocked_events: ['RETENTION_RISK'],
    orchestration_priority: 'LOW',
    readiness_requirements: {
      minimum_level: 'low',
    },
    analytics_hooks: ['flow_id', 'flow_action', 'orchestration_reason', 'guardrail_result', 'orchestration_priority', 'lifecycle_stage'],
    primary_cta: 'CONTINUE_FLOW',
    completion_cta: 'CONTINUE_FLOW',
    message_key: 'TEST_RESULT_STATE',
    timer_ids: [],
  },
}

const FLOW_TIMER_TO_FLOW_ID: Partial<Record<CanonicalFlowTimerId, CanonicalFlowId>> = {
  RESULT_FOLLOWUP_24H: 'FOCUS_CONVERSION_FLOW',
  RESULT_FOLLOWUP_48H: 'FOCUS_CONVERSION_FLOW',
  RESULT_FOLLOWUP_72H: 'FOCUS_CONVERSION_FLOW',
  PAYMENT_REMINDER_24H: 'PAYMENT_RECOVERY_FLOW',
  PAYMENT_REMINDER_48H: 'PAYMENT_RECOVERY_FLOW',
  PAYMENT_REMINDER_72H: 'PAYMENT_RECOVERY_FLOW',
  PAYMENT_REMINDER_5D: 'RETENTION_FLOW',
  PAYMENT_REMINDER_7D: 'RETENTION_FLOW',
  ZOOM_REMINDER_24H: 'ZOOM_ACTIVATION_FLOW',
  ZOOM_REMINDER_2H: 'ZOOM_ACTIVATION_FLOW',
  PLATFORM_INVITE_AFTER_ZOOM_1: 'PLATFORM_INVITE_FLOW',
  PLATFORM_INVITE_AFTER_ZOOM_2: 'PLATFORM_INVITE_FLOW',
}

const EVENT_TO_FLOW_IDS: Record<string, readonly CanonicalFlowId[]> = {
  RESULT_OPENED: ['FOCUS_CONVERSION_FLOW'],
  CTA_FOCUS_CLICKED: ['FOCUS_CONVERSION_FLOW'],
  TEST_COMPLETED: ['FOCUS_CONVERSION_FLOW'],
  PAYMENT_STARTED: ['PAYMENT_RECOVERY_FLOW'],
  PAYMENT_SUCCESS: ['PAYMENT_RECOVERY_FLOW'],
  PAYMENT_FAILED: ['PAYMENT_RECOVERY_FLOW'],
  SUBSCRIPTION_EXPIRING: ['PAYMENT_RECOVERY_FLOW', 'RETENTION_FLOW'],
  SUBSCRIPTION_EXPIRED: ['PAYMENT_RECOVERY_FLOW', 'RETENTION_FLOW'],
  ZOOM_REGISTERED: ['ZOOM_ACTIVATION_FLOW'],
  ZOOM_ATTENDED: ['PLATFORM_INVITE_FLOW', 'PLATFORM_ACTIVATION_FLOW'],
  OPEN_PLATFORM: ['PLATFORM_ACTIVATION_FLOW', 'PLATFORM_INVITE_FLOW'],
  CONTINUE_FLOW: ['PLATFORM_ACTIVATION_FLOW', 'RETURN_FLOW'],
  RETENTION_RISK: ['RETENTION_FLOW'],
  TEST_EXITED: ['RETENTION_FLOW', 'RETURN_FLOW'],
  RESTORE_PROGRESS: ['RETURN_FLOW', 'RETENTION_FLOW'],
  FLOW_TRIGGERED: [],
  FLOW_SKIPPED: [],
  FLOW_COMPLETED: [],
}

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeReadinessLevel(value: unknown): 'low' | 'medium' | 'high' | null {
  const readiness = asString(value)
  return readiness === 'low' || readiness === 'medium' || readiness === 'high' ? readiness : null
}

function readinessRank(level: 'low' | 'medium' | 'high'): number {
  return READINESS_ORDER.indexOf(level) + 1
}

function resolveReadinessLevel(payload: Prisma.JsonObject, inputLevel?: string | null): 'low' | 'medium' | 'high' | null {
  const direct = normalizeReadinessLevel(inputLevel)
    ?? normalizeReadinessLevel(payload.readiness_level)
    ?? normalizeReadinessLevel(payload.readinessLevel)

  if (direct) return direct

  const readiness = isJsonObject(payload.readiness) ? payload.readiness : null
  return readiness ? normalizeReadinessLevel(readiness.level) : null
}

function resolveFlowIdFromTimerId(timerId?: string | null): CanonicalFlowId | null {
  if (!timerId) return null
  const value = timerId as CanonicalFlowTimerId
  return FLOW_TIMER_TO_FLOW_ID[value] ?? null
}

function resolveFlowCandidates(event: string, currentState: string | null, timerId?: string | null): CanonicalFlowId[] {
  const fromTimer = resolveFlowIdFromTimerId(timerId)
  if (fromTimer) {
    return [fromTimer]
  }

  const byEvent = EVENT_TO_FLOW_IDS[event] ?? []
  if (byEvent.length > 0) {
    return [...byEvent]
  }

  if (currentState?.startsWith('S9_')) {
    return ['RETENTION_FLOW']
  }

  if (currentState?.startsWith('S10_')) {
    return ['RETURN_FLOW']
  }

  return []
}

function isFlowGuardrailBlocked(input: {
  flow: CanonicalFlowDefinition
  currentState: string | null
  readinessLevel: 'low' | 'medium' | 'high' | null
  hasPaymentSuccess: boolean
  hasZoomAttended: boolean
  isActiveUser: boolean
  event: string
}): CanonicalFlowOrchestrationBlockReason | null {
  const { flow } = input
  const state = input.currentState

  if (state && flow.cancellation_states.includes(state as CanonicalFlowStageId)) {
    return 'state_changed'
  }

  if (flow.blocked_events.includes(input.event)) {
    return 'state_changed'
  }

  if (flow.flow_id === 'PAYMENT_RECOVERY_FLOW' && input.hasPaymentSuccess) {
    return 'payment_success_already_happened'
  }

  if ((flow.flow_id === 'PLATFORM_INVITE_FLOW' || flow.flow_id === 'ZOOM_ACTIVATION_FLOW') && !input.hasZoomAttended && input.readinessLevel === 'low') {
    return 'focus_readiness_missing'
  }

  if (flow.flow_id === 'PLATFORM_INVITE_FLOW' && !input.hasZoomAttended) {
    return 'platform_invite_before_zoom_readiness'
  }

  if (flow.flow_id === 'PLATFORM_ACTIVATION_FLOW' && !input.hasZoomAttended) {
    return 'upgrade_flow_without_focus_activation'
  }

  if (flow.flow_id === 'RETENTION_FLOW' && input.isActiveUser) {
    return 'active_user_retention_flow'
  }

  const minimumLevel = flow.readiness_requirements.minimum_level
  if (minimumLevel && input.readinessLevel) {
    if (readinessRank(input.readinessLevel) < readinessRank(minimumLevel)) {
      return 'focus_readiness_missing'
    }
  }

  if (flow.readiness_requirements.requires_zoom_attended && !input.hasZoomAttended) {
    return 'platform_invite_before_zoom_readiness'
  }

  if (flow.readiness_requirements.requires_payment_success && !input.hasPaymentSuccess) {
    return 'payment_success_already_happened'
  }

  if (flow.readiness_requirements.requires_active_user === false && input.isActiveUser) {
    return 'active_user_retention_flow'
  }

  if (flow.readiness_requirements.requires_platform_offer && input.readinessLevel !== 'high') {
    return 'upgrade_flow_without_focus_activation'
  }

  return null
}

function buildFlowActions(input: {
  flow: CanonicalFlowDefinition
  event: string
  blockedReason: CanonicalFlowOrchestrationBlockReason | null
  readinessLevel: 'low' | 'medium' | 'high' | null
  hasPaymentSuccess: boolean
  hasZoomAttended: boolean
  isActiveUser: boolean
}): CanonicalFlowAction[] {
  const { flow } = input
  const actions: CanonicalFlowAction[] = []
  const shouldCompleteFlow =
    (flow.flow_id === 'PAYMENT_RECOVERY_FLOW' && input.event === 'PAYMENT_SUCCESS') ||
    (flow.flow_id === 'ZOOM_ACTIVATION_FLOW' && input.event === 'ZOOM_ATTENDED') ||
    (flow.flow_id === 'PLATFORM_INVITE_FLOW' && input.event === 'OPEN_PLATFORM') ||
    (flow.flow_id === 'PLATFORM_ACTIVATION_FLOW' && (input.event === 'OPEN_PLATFORM' || input.event === 'CONTINUE_FLOW')) ||
    (flow.flow_id === 'RETURN_FLOW' && input.event === 'RESTORE_PROGRESS')

  if (input.blockedReason) {
    actions.push({ action_type: 'SKIP_FLOW', flow_id: flow.flow_id })
    return actions
  }

  const scheduleTimers = flow.timer_ids.map(timerId => ({
    action_type: 'SCHEDULE_TIMER' as const,
    flow_id: flow.flow_id,
    timer_id: timerId,
  }))

  const cancelTimers = flow.timer_ids.map(timerId => ({
    action_type: 'CANCEL_TIMER' as const,
    flow_id: flow.flow_id,
    timer_id: timerId,
  }))

  if (flow.flow_id === 'RETENTION_FLOW') {
    actions.push({
      action_type: 'MARK_RETENTION',
      flow_id: flow.flow_id,
    })
  }

  if (flow.flow_id === 'PLATFORM_ACTIVATION_FLOW' && input.readinessLevel === 'high') {
    actions.push({
      action_type: 'MARK_UPGRADE_READY',
      flow_id: flow.flow_id,
    })
  }

  if (shouldCompleteFlow) {
    actions.push(...cancelTimers)
    actions.push({
      action_type: 'COMPLETE_FLOW',
      flow_id: flow.flow_id,
    })
    actions.push({
      action_type: 'OPEN_CTA',
      flow_id: flow.flow_id,
      cta_id: flow.completion_cta,
      message_key: resolveCanonicalMessageKeyByCtaId(flow.completion_cta),
    })
    return actions
  }

  if (input.event === 'FLOW_COMPLETED') {
    actions.push({
      action_type: 'COMPLETE_FLOW',
      flow_id: flow.flow_id,
    })
    return actions
  }

  actions.push({
    action_type: 'SEND_MESSAGE',
    flow_id: flow.flow_id,
    message_key: flow.message_key,
  })
  actions.push({
    action_type: 'OPEN_CTA',
    flow_id: flow.flow_id,
    cta_id: flow.primary_cta,
    message_key: resolveCanonicalMessageKeyByCtaId(flow.primary_cta),
  })

  if (scheduleTimers.length > 0) {
    actions.push(...scheduleTimers)
  }

  return actions
}

export function resolveCanonicalFlowOrchestration(input: {
  event: string
  current_state?: string | null
  lifecycle_stage?: string | null
  readiness_level?: string | null
  payload?: Prisma.JsonValue | null
  has_payment_success?: boolean
  has_zoom_attended?: boolean
  is_active_user?: boolean
}): CanonicalFlowOrchestrationDecision {
  const payload = isJsonObject(input.payload) ? input.payload : {}
  const lifecycleStage = asString(input.lifecycle_stage ?? payload.lifecycle_stage ?? payload.lifecycleStage ?? input.current_state) ?? null
  const currentState = asString(input.current_state ?? lifecycleStage)
  const readinessLevel = resolveReadinessLevel(payload, input.readiness_level)
  const timerId = asString(payload.flow_timer_id ?? payload.flowTimerId)
  const hasPaymentSuccess = Boolean(input.has_payment_success)
    || input.event === 'PAYMENT_SUCCESS'
    || input.event === 'FLOW_COMPLETED'
    || Boolean(currentState && (currentState.startsWith('S6_') || currentState.startsWith('S7_') || currentState.startsWith('S8_') || currentState.startsWith('S9_') || currentState.startsWith('S10_')))
  const hasZoomAttended = Boolean(input.has_zoom_attended)
    || input.event === 'ZOOM_ATTENDED'
    || Boolean(currentState && (currentState.startsWith('S7_') || currentState.startsWith('S8_') || currentState.startsWith('S9_') || currentState.startsWith('S10_')))
  const isActiveUser = input.is_active_user ?? (currentState ? !currentState.startsWith('S9_') && !currentState.startsWith('S10_') : false)

  const candidateIds = resolveFlowCandidates(input.event, currentState, timerId)
  if (candidateIds.length === 0) {
    return {
      flow_id: null,
      flow_action: [],
      orchestration_reason: null,
      blocked_reason: null,
      guardrail_result: 'allow',
      orchestration_priority: null,
      lifecycle_stage: lifecycleStage,
    }
  }

  const candidateFlows = candidateIds
    .map(flowId => CANONICAL_FLOW_REGISTRY[flowId])
    .filter((flow): flow is CanonicalFlowDefinition => Boolean(flow))

  const blockedReasons = new Set<CanonicalFlowOrchestrationBlockReason>()
  for (const flow of candidateFlows) {
    const blockedReason = isFlowGuardrailBlocked({
      flow,
      currentState,
      readinessLevel,
      hasPaymentSuccess,
      hasZoomAttended,
      isActiveUser,
      event: input.event,
    })

    if (!blockedReason) {
      const parallelConflict = candidateFlows.length > 1
      return {
        flow_id: flow.flow_id,
        flow_action: buildFlowActions({
          flow,
          event: input.event,
          blockedReason: null,
          readinessLevel,
          hasPaymentSuccess,
          hasZoomAttended,
          isActiveUser,
        }),
        orchestration_reason: parallelConflict
          ? `selected_highest_priority:${flow.flow_id}`
          : `event_routed:${flow.flow_id}`,
        blocked_reason: parallelConflict ? 'parallel_conflicting_flow' : null,
        guardrail_result: 'allow',
        orchestration_priority: flow.orchestration_priority,
        lifecycle_stage: lifecycleStage,
      }
    }

    blockedReasons.add(blockedReason)
  }

  const firstBlockedReason = blockedReasons.values().next().value ?? 'state_changed'
  const fallbackFlow = candidateFlows[0] ?? null
  return {
    flow_id: fallbackFlow?.flow_id ?? null,
    flow_action: fallbackFlow
      ? buildFlowActions({
          flow: fallbackFlow,
          event: input.event,
          blockedReason: firstBlockedReason,
          readinessLevel,
          hasPaymentSuccess,
          hasZoomAttended,
          isActiveUser,
        })
      : [],
    orchestration_reason: fallbackFlow ? `blocked:${fallbackFlow.flow_id}` : null,
    blocked_reason: firstBlockedReason,
    guardrail_result: 'block',
    orchestration_priority: fallbackFlow?.orchestration_priority ?? null,
    lifecycle_stage: lifecycleStage,
  }
}

export function buildCanonicalFlowOrchestrationAnalytics(input: CanonicalFlowOrchestrationDecision): Prisma.JsonObject {
  return {
    flow_id: input.flow_id,
    flow_action: input.flow_action.map(action => action.action_type),
    orchestration_reason: input.orchestration_reason,
    blocked_reason: input.blocked_reason,
    guardrail_result: input.guardrail_result,
    orchestration_priority: input.orchestration_priority,
    lifecycle_stage: input.lifecycle_stage,
  }
}

export function enrichCanonicalFlowOrchestrationEvent(input: {
  type: string
  state?: string | null
  payload?: Prisma.JsonValue
  now?: Date
}): {
  payload: Prisma.JsonObject
  canonical: Prisma.JsonObject | null
} {
  const payload = isJsonObject(input.payload) ? { ...input.payload } : {}
  const readinessLevel = resolveReadinessLevel(payload, asString(payload.readiness_level ?? payload.readinessLevel))
  const decision = resolveCanonicalFlowOrchestration({
    event: input.type,
    current_state: input.state ?? asString(payload.current_state) ?? null,
    lifecycle_stage: asString(payload.lifecycle_stage ?? payload.lifecycleStage) ?? input.state ?? null,
    readiness_level: readinessLevel,
    payload,
    has_payment_success: asBoolean(payload.has_payment_success ?? payload.hasPaymentSuccess) ?? undefined,
    has_zoom_attended: asBoolean(payload.has_zoom_attended ?? payload.hasZoomAttended) ?? undefined,
    is_active_user: asBoolean(payload.is_active_user ?? payload.isActiveUser) ?? undefined,
  })

  if (!decision.flow_id) {
    return { payload, canonical: null }
  }

  const canonical = buildCanonicalFlowOrchestrationAnalytics(decision)
  return {
    payload: {
      ...payload,
      flow_orchestration: canonical,
    },
    canonical,
  }
}

export function validateCanonicalFlowOrchestrationFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []

  if (new Set(CANONICAL_FLOW_IDS).size !== CANONICAL_FLOW_IDS.length) {
    errors.push('duplicate_flow_ids_detected')
  }

  const timerIds = new Set<CanonicalFlowTimerId>()
  for (const flowId of CANONICAL_FLOW_IDS) {
    const flow = CANONICAL_FLOW_REGISTRY[flowId]
    if (!flow) {
      errors.push(`missing_flow_definition:${flowId}`)
      continue
    }

    if (!(CANONICAL_CTA_REGISTRY[flow.primary_cta])) {
      errors.push(`missing_primary_cta:${flowId}`)
    }

    if (!(CANONICAL_CTA_REGISTRY[flow.completion_cta])) {
      errors.push(`missing_completion_cta:${flowId}`)
    }

    for (const timerId of flow.timer_ids) {
      if (timerIds.has(timerId)) {
        errors.push(`duplicate_timer_id_detected:${timerId}`)
      }
      timerIds.add(timerId)
      if (!(timerId in CANONICAL_FLOW_TIMER_REGISTRY)) {
        errors.push(`missing_timer_definition:${timerId}`)
      }
    }

    if (flow.flow_id === 'RETENTION_FLOW' && flow.readiness_requirements.requires_active_user !== false) {
      errors.push('retention_flow_guardrail_invalid')
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}
