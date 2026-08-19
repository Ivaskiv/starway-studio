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
  | 'PAYMENT_OPENED'
  | 'PLATFORM_OPENED'
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

export type BehavioralReadinessSignals = {
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

export const EVENT_ALIASES: Record<string, BehavioralEventType> = {
  TEST_OPENED: 'TEST_OPENED',
  TEST_STARTED: 'TEST_STARTED',
  QUESTION_ANSWERED: 'QUESTION_ANSWERED',
  TEST_COMPLETED: 'TEST_COMPLETED',
  RESULT_OPENED: 'RESULT_OPENED',
  PAYMENT_OPENED: 'PAYMENT_OPENED',
  PLATFORM_OPENED: 'PLATFORM_OPENED',
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

export function resolveCanonicalEvent(type: string): BehavioralEventType | null {
  return EVENT_ALIASES[type] ?? null
}

