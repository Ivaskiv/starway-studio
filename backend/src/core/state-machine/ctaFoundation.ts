import type { Prisma } from '@starway/db/prisma-client'

import {
  PAYMENT_REMINDER_MESSAGE_KEYS,
} from './paymentReminderFoundation.js'

export const CANONICAL_CTA_IDS = [
  'START_TEST',
  'OPEN_FOCUS',
  'PAY_FOCUS_1M',
  'PAY_FOCUS_3M',
  'JOIN_CHANNEL',
  'OPEN_ZOOM',
  'OPEN_PLATFORM',
  'CONTINUE_FLOW',
  'RESTORE_PROGRESS',
] as const

export type CanonicalCtaId = typeof CANONICAL_CTA_IDS[number]

export const CANONICAL_MESSAGE_KEYS = [
  'TEST_RESULT_STATE',
  'TEST_RESULT_GOAL',
  'TEST_RESULT_CHOICE',
  'TEST_RESULT_DECISION',
  'TEST_RESULT_ACTION',
  'FOCUS_INVITE_24H',
  'FOCUS_INVITE_48H',
  'FOCUS_INVITE_72H',
  ...PAYMENT_REMINDER_MESSAGE_KEYS,
  'ZOOM_REMINDER_24H',
  'ZOOM_REMINDER_2H',
  'PLATFORM_INVITE_AFTER_ZOOM',
] as const

export type CanonicalMessageKey = typeof CANONICAL_MESSAGE_KEYS[number]

export type CanonicalMessageStageId =
  | 'S3_TEST_RESULT'
  | 'S4_FOCUS_INVITE'
  | 'S5_PAYMENT'
  | 'S6_ZOOM'
  | 'S7_PLATFORM_INVITE'
  | 'S8_PLATFORM_READY'

export type CanonicalCtaDefinition = {
  id: CanonicalCtaId
  allowed_states: readonly CanonicalMessageStageId[]
  forbidden_states: readonly CanonicalMessageStageId[]
  source_stage: CanonicalMessageStageId | 'any'
  target_stage: CanonicalMessageStageId
  analytics_event: 'CTA_CLICKED'
  callback_actions: readonly string[]
}

export type CanonicalMessageDefinition = {
  key: CanonicalMessageKey
  allowed_cta: readonly CanonicalCtaId[]
  forbidden_cta: readonly CanonicalCtaId[]
  next_transition: CanonicalMessageStageId
  analytics_hooks: readonly string[]
}

export const CANONICAL_CTA_REGISTRY: Record<CanonicalCtaId, CanonicalCtaDefinition> = {
  START_TEST: {
    id: 'START_TEST',
    allowed_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE', 'S8_PLATFORM_READY'],
    forbidden_states: ['S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE'],
    source_stage: 'S3_TEST_RESULT',
    target_stage: 'S3_TEST_RESULT',
    analytics_event: 'CTA_CLICKED',
    callback_actions: ['start_trial', 'waitlist_early_access', 'open_lidmagnet'],
  },
  OPEN_FOCUS: {
    id: 'OPEN_FOCUS',
    allowed_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE'],
    forbidden_states: ['S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY'],
    source_stage: 'S3_TEST_RESULT',
    target_stage: 'S4_FOCUS_INVITE',
    analytics_event: 'CTA_CLICKED',
    callback_actions: ['start_wheel', 'open_focus_portal'],
  },
  PAY_FOCUS_1M: {
    id: 'PAY_FOCUS_1M',
    allowed_states: ['S4_FOCUS_INVITE', 'S5_PAYMENT'],
    forbidden_states: ['S3_TEST_RESULT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY'],
    source_stage: 'S4_FOCUS_INVITE',
    target_stage: 'S5_PAYMENT',
    analytics_event: 'CTA_CLICKED',
    callback_actions: ['open_paid_checkout', 'pay_stankey_monthly'],
  },
  PAY_FOCUS_3M: {
    id: 'PAY_FOCUS_3M',
    allowed_states: ['S4_FOCUS_INVITE', 'S5_PAYMENT'],
    forbidden_states: ['S3_TEST_RESULT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY'],
    source_stage: 'S4_FOCUS_INVITE',
    target_stage: 'S5_PAYMENT',
    analytics_event: 'CTA_CLICKED',
    callback_actions: ['pay_stankey_quarterly'],
  },
  JOIN_CHANNEL: {
    id: 'JOIN_CHANNEL',
    allowed_states: ['S5_PAYMENT', 'S6_ZOOM'],
    forbidden_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY'],
    source_stage: 'S5_PAYMENT',
    target_stage: 'S6_ZOOM',
    analytics_event: 'CTA_CLICKED',
    callback_actions: ['open_course', 'open_practices'],
  },
  OPEN_ZOOM: {
    id: 'OPEN_ZOOM',
    allowed_states: ['S5_PAYMENT', 'S6_ZOOM'],
    forbidden_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY'],
    source_stage: 'S5_PAYMENT',
    target_stage: 'S6_ZOOM',
    analytics_event: 'CTA_CLICKED',
    callback_actions: ['open_tasks', 'continue_task'],
  },
  OPEN_PLATFORM: {
    id: 'OPEN_PLATFORM',
    allowed_states: ['S6_ZOOM', 'S7_PLATFORM_INVITE'],
    forbidden_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE', 'S5_PAYMENT'],
    source_stage: 'S6_ZOOM',
    target_stage: 'S7_PLATFORM_INVITE',
    analytics_event: 'CTA_CLICKED',
    callback_actions: ['continue_ai_mentor', 'continue_ai_mentor_chat', 'resume_morning_session', 'resume_evening_session'],
  },
  CONTINUE_FLOW: {
    id: 'CONTINUE_FLOW',
    allowed_states: ['S3_TEST_RESULT', 'S4_FOCUS_INVITE', 'S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY'],
    forbidden_states: [],
    source_stage: 'any',
    target_stage: 'S8_PLATFORM_READY',
    analytics_event: 'CTA_CLICKED',
    callback_actions: ['lm_continue', 'lm_continue_material', 'return_main_menu'],
  },
  RESTORE_PROGRESS: {
    id: 'RESTORE_PROGRESS',
    allowed_states: ['S4_FOCUS_INVITE', 'S5_PAYMENT', 'S6_ZOOM', 'S7_PLATFORM_INVITE', 'S8_PLATFORM_READY'],
    forbidden_states: ['S3_TEST_RESULT'],
    source_stage: 'S5_PAYMENT',
    target_stage: 'S8_PLATFORM_READY',
    analytics_event: 'CTA_CLICKED',
    callback_actions: ['restart_flow', 'open_status'],
  },
}

export const CANONICAL_MESSAGE_REGISTRY: Record<CanonicalMessageKey, CanonicalMessageDefinition> = {
  TEST_RESULT_STATE: {
    key: 'TEST_RESULT_STATE',
    allowed_cta: ['START_TEST', 'OPEN_FOCUS', 'CONTINUE_FLOW'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S3_TEST_RESULT',
    analytics_hooks: ['message_opened', 'result_distribution'],
  },
  TEST_RESULT_GOAL: {
    key: 'TEST_RESULT_GOAL',
    allowed_cta: ['OPEN_FOCUS', 'CONTINUE_FLOW'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S4_FOCUS_INVITE',
    analytics_hooks: ['message_opened', 'result_to_focus_ctr'],
  },
  TEST_RESULT_CHOICE: {
    key: 'TEST_RESULT_CHOICE',
    allowed_cta: ['OPEN_FOCUS', 'CONTINUE_FLOW'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S4_FOCUS_INVITE',
    analytics_hooks: ['message_opened', 'question_dropoff_rate'],
  },
  TEST_RESULT_DECISION: {
    key: 'TEST_RESULT_DECISION',
    allowed_cta: ['OPEN_FOCUS', 'PAY_FOCUS_1M', 'PAY_FOCUS_3M'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S5_PAYMENT',
    analytics_hooks: ['message_opened', 'CTA_conversion_rate'],
  },
  TEST_RESULT_ACTION: {
    key: 'TEST_RESULT_ACTION',
    allowed_cta: ['OPEN_FOCUS', 'CONTINUE_FLOW'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S4_FOCUS_INVITE',
    analytics_hooks: ['message_opened', 'CTA_conversion_rate'],
  },
  FOCUS_INVITE_24H: {
    key: 'FOCUS_INVITE_24H',
    allowed_cta: ['PAY_FOCUS_1M', 'PAY_FOCUS_3M', 'OPEN_FOCUS'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S4_FOCUS_INVITE',
    analytics_hooks: ['message_opened', 'focus_payment_conversion'],
  },
  FOCUS_INVITE_48H: {
    key: 'FOCUS_INVITE_48H',
    allowed_cta: ['PAY_FOCUS_1M', 'PAY_FOCUS_3M', 'OPEN_FOCUS'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S4_FOCUS_INVITE',
    analytics_hooks: ['message_opened', 'focus_payment_conversion'],
  },
  FOCUS_INVITE_72H: {
    key: 'FOCUS_INVITE_72H',
    allowed_cta: ['RESTORE_PROGRESS', 'PAY_FOCUS_1M', 'PAY_FOCUS_3M'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S4_FOCUS_INVITE',
    analytics_hooks: ['message_opened', 'return_after_message_rate'],
  },
  PAYMENT_REMINDER_24H: {
    key: 'PAYMENT_REMINDER_24H',
    allowed_cta: ['PAY_FOCUS_1M', 'PAY_FOCUS_3M', 'RESTORE_PROGRESS'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S5_PAYMENT',
    analytics_hooks: ['message_opened', 'payment_abandonment_rate'],
  },
  PAYMENT_REMINDER_48H: {
    key: 'PAYMENT_REMINDER_48H',
    allowed_cta: ['PAY_FOCUS_1M', 'PAY_FOCUS_3M', 'RESTORE_PROGRESS'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S5_PAYMENT',
    analytics_hooks: ['message_opened', 'payment_abandonment_rate'],
  },
  PAYMENT_REMINDER_72H: {
    key: 'PAYMENT_REMINDER_72H',
    allowed_cta: ['RESTORE_PROGRESS', 'PAY_FOCUS_1M', 'PAY_FOCUS_3M'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S5_PAYMENT',
    analytics_hooks: ['message_opened', 'retention_risk_score'],
  },
  ZOOM_REMINDER_24H: {
    key: 'ZOOM_REMINDER_24H',
    allowed_cta: ['OPEN_ZOOM', 'CONTINUE_FLOW'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S6_ZOOM',
    analytics_hooks: ['message_opened', 'zoom_attendance_rate'],
  },
  ZOOM_REMINDER_2H: {
    key: 'ZOOM_REMINDER_2H',
    allowed_cta: ['OPEN_ZOOM', 'CONTINUE_FLOW'],
    forbidden_cta: ['OPEN_PLATFORM'],
    next_transition: 'S6_ZOOM',
    analytics_hooks: ['message_opened', 'zoom_attendance_rate'],
  },
  PLATFORM_INVITE_AFTER_ZOOM: {
    key: 'PLATFORM_INVITE_AFTER_ZOOM',
    allowed_cta: ['OPEN_PLATFORM', 'CONTINUE_FLOW'],
    forbidden_cta: ['OPEN_FOCUS'],
    next_transition: 'S7_PLATFORM_INVITE',
    analytics_hooks: ['message_opened', 'focus_to_platform_conversion'],
  },
}

const CTA_BY_ACTION: Record<string, CanonicalCtaId> = {
  start_trial: 'START_TEST',
  waitlist_early_access: 'START_TEST',
  open_lidmagnet: 'START_TEST',
  open_focus_portal: 'OPEN_FOCUS',
  open_status: 'RESTORE_PROGRESS',
  start_wheel: 'OPEN_FOCUS',
  open_paid_checkout: 'PAY_FOCUS_1M',
  pay_stankey_monthly: 'PAY_FOCUS_1M',
  pay_stankey_quarterly: 'PAY_FOCUS_3M',
  open_course: 'JOIN_CHANNEL',
  open_practices: 'JOIN_CHANNEL',
  open_tasks: 'OPEN_ZOOM',
  continue_task: 'OPEN_ZOOM',
  continue_ai_mentor: 'OPEN_PLATFORM',
  continue_ai_mentor_chat: 'OPEN_PLATFORM',
  resume_morning_session: 'OPEN_PLATFORM',
  resume_evening_session: 'OPEN_PLATFORM',
  lm_continue: 'CONTINUE_FLOW',
  lm_continue_material: 'CONTINUE_FLOW',
  return_main_menu: 'CONTINUE_FLOW',
  restart_flow: 'RESTORE_PROGRESS',
}

const MESSAGE_BY_CTA: Record<CanonicalCtaId, CanonicalMessageKey> = {
  START_TEST: 'TEST_RESULT_STATE',
  OPEN_FOCUS: 'TEST_RESULT_ACTION',
  PAY_FOCUS_1M: 'FOCUS_INVITE_24H',
  PAY_FOCUS_3M: 'FOCUS_INVITE_48H',
  JOIN_CHANNEL: 'PAYMENT_REMINDER_24H',
  OPEN_ZOOM: 'ZOOM_REMINDER_24H',
  OPEN_PLATFORM: 'PLATFORM_INVITE_AFTER_ZOOM',
  CONTINUE_FLOW: 'TEST_RESULT_DECISION',
  RESTORE_PROGRESS: 'PAYMENT_REMINDER_72H',
}

const TEST_EVENT_MESSAGE_BY_TYPE: Record<'TEST_OPENED' | 'TEST_STARTED' | 'QUESTION_ANSWERED' | 'TEST_COMPLETED' | 'RESULT_OPENED' | 'CTA_FOCUS_CLICKED' | 'TEST_EXITED', CanonicalMessageKey> = {
  TEST_OPENED: 'TEST_RESULT_STATE',
  TEST_STARTED: 'TEST_RESULT_GOAL',
  QUESTION_ANSWERED: 'TEST_RESULT_CHOICE',
  TEST_COMPLETED: 'TEST_RESULT_DECISION',
  RESULT_OPENED: 'TEST_RESULT_ACTION',
  CTA_FOCUS_CLICKED: 'TEST_RESULT_ACTION',
  TEST_EXITED: 'TEST_RESULT_CHOICE',
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

export function resolveCanonicalCtaId(action: string): CanonicalCtaId | null {
  if (action.startsWith('pay_stankey_')) {
    return action.includes('quarterly') ? 'PAY_FOCUS_3M' : 'PAY_FOCUS_1M'
  }

  return CTA_BY_ACTION[action] ?? null
}

export function resolveCanonicalMessageKeyByCtaId(ctaId: CanonicalCtaId): CanonicalMessageKey {
  return MESSAGE_BY_CTA[ctaId]
}

export function resolveCanonicalMessageKeyByTestEvent(type: keyof typeof TEST_EVENT_MESSAGE_BY_TYPE): CanonicalMessageKey {
  return TEST_EVENT_MESSAGE_BY_TYPE[type]
}

export function enrichCanonicalCtaMessageEvent(input: {
  type: string
  state?: string | null
  payload?: Prisma.JsonValue
  now?: Date
}): {
  payload: Prisma.JsonObject
  canonical: Prisma.JsonObject | null
} {
  const now = input.now ?? new Date()
  const payload = isJsonObject(input.payload) ? { ...input.payload } : {}

  if (input.type === 'CTA_CLICKED') {
    const ctaId = asString(payload.cta_id)
    const canonicalCta = ctaId && (CANONICAL_CTA_IDS as readonly string[]).includes(ctaId)
      ? ctaId as CanonicalCtaId
      : (asString(payload.callback_action) ? resolveCanonicalCtaId(String(payload.callback_action)) : null)

    const messageKey = canonicalCta ? resolveCanonicalMessageKeyByCtaId(canonicalCta) : asString(payload.message_key) as CanonicalMessageKey | null
    const behavioral = isJsonObject(payload.behavioral) ? payload.behavioral : null
    const readiness = behavioral && isJsonObject(behavioral.readiness) ? behavioral.readiness : null

    const canonical = canonicalCta
      ? {
          cta_id: canonicalCta,
          source_message: messageKey,
          source_stage: CANONICAL_CTA_REGISTRY[canonicalCta].source_stage,
          target_stage: CANONICAL_CTA_REGISTRY[canonicalCta].target_stage,
          readiness_level: asString(payload.readiness_level) ?? asString(readiness?.level),
        }
      : null

    return {
      payload: {
        ...payload,
        ...(canonical ? { cta_message: canonical } : {}),
      },
      canonical,
    }
  }

  if (input.type === 'MESSAGE_OPENED') {
    const messageKey = asString(payload.message_key)
    const canonical = messageKey && (CANONICAL_MESSAGE_KEYS as readonly string[]).includes(messageKey)
      ? {
          message_key: messageKey as CanonicalMessageKey,
          lifecycle_stage: asString(payload.lifecycle_stage) ?? input.state ?? null,
          delay_from_previous_ms: asNumber(payload.delay_from_previous_ms) ?? null,
        }
      : null

    return {
      payload: {
        ...payload,
        ...(canonical ? { cta_message: canonical } : {}),
      },
      canonical,
    }
  }

  return { payload, canonical: null }
}

export function validateCanonicalCtaMessageFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const callbackActions = new Set<string>()

  if (new Set(CANONICAL_CTA_IDS).size !== CANONICAL_CTA_IDS.length) {
    errors.push('duplicate_cta_ids_detected')
  }

  if (new Set(CANONICAL_MESSAGE_KEYS).size !== CANONICAL_MESSAGE_KEYS.length) {
    errors.push('duplicate_message_keys_detected')
  }

  for (const ctaId of CANONICAL_CTA_IDS) {
    const cta = CANONICAL_CTA_REGISTRY[ctaId]
    if (!cta) {
      errors.push(`missing_cta_definition:${ctaId}`)
      continue
    }
    for (const action of cta.callback_actions) {
      if (callbackActions.has(action)) {
        errors.push(`duplicate_callback_name_detected:${action}`)
      }
      callbackActions.add(action)
    }
    if (ctaId === 'OPEN_PLATFORM' && cta.allowed_states.includes('S3_TEST_RESULT')) {
      errors.push('direct_platform_cta_from_result_detected')
    }
  }

  for (const messageKey of CANONICAL_MESSAGE_KEYS) {
    const message = CANONICAL_MESSAGE_REGISTRY[messageKey]
    if (!message) {
      errors.push(`missing_message_definition:${messageKey}`)
      continue
    }
    if (message.allowed_cta.includes('OPEN_PLATFORM') && message.next_transition === 'S4_FOCUS_INVITE') {
      errors.push(`platform_cta_before_focus_ready:${messageKey}`)
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}
