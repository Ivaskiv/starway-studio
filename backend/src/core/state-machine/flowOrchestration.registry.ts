import type { CanonicalCtaId, CanonicalMessageKey } from './ctaFoundation.js'
import { PAYMENT_REMINDER_MESSAGE_KEY_24H, PAYMENT_REMINDER_MESSAGE_KEY_72H } from './paymentReminderFoundation.js'
import type { CanonicalFlowStageId, CanonicalFlowTimerId } from './flowTimingFoundation.js'

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

export const READINESS_ORDER: Array<NonNullable<CanonicalFlowReadinessRequirements['minimum_level']>> = ['low', 'medium', 'high']

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

export const FLOW_TIMER_TO_FLOW_ID: Partial<Record<CanonicalFlowTimerId, CanonicalFlowId>> = {
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

export const EVENT_TO_FLOW_IDS: Record<string, readonly CanonicalFlowId[]> = {
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
