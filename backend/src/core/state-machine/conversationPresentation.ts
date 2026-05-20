import type { TelegramMentorMode } from '@/content/telegram.product-context.js'
import type { RelationshipMemoryProfile } from '../memory/relationshipMemory.js'
import { buildRelationshipContinuityLines, resolveRelationshipUpgradeGate } from '../memory/relationshipMemory.js'
import { absystemContent, buildAbsystemRecoveryCopy, buildAbsystemStatusSnapshot } from '@/products/absystem/config/absystem.content.js'

export type ConversationProductId = 'focus' | 'stankey' | 'absystem'

export type ConversationProfile = {
  productId: ConversationProductId
  name: string
  tone: 'warm' | 'structured' | 'premium'
  continuityLead: string
  recoveryLead: string
  upgradeLead: string
  statusLead: string
  fallbackLead: string
}

export type ConversationRecoveryKind =
  | 'stale_callback'
  | 'flow_interrupted'
  | 'session_expired'
  | 'question_missing'
  | 'ai_unavailable'
  | 'voice_failure'
  | 'payment_interrupted'
  | 'zoom_missed'
  | 'progress_stalled'
  | 'duplicate_action'

const PROFILES: Record<ConversationProductId, ConversationProfile> = {
  focus: {
    productId: 'focus',
    name: 'FOCUS',
    tone: 'structured',
    continuityLead: 'Ти всередині Focus-ритму.',
    recoveryLead: 'Повертаємо тебе до найближчого зрозумілого кроку.',
    upgradeLead: 'Спочатку тримаємо ритм, потім розширюємо крок.',
    statusLead: 'Зараз важливо бачити один наступний крок без шуму.',
    fallbackLead: 'Повертаю тебе до практичної дії.',
  },
  stankey: {
    productId: 'stankey',
    name: 'STANKEY',
    tone: 'warm',
    continuityLead: 'Ти вже в потоці практикуму.',
    recoveryLead: 'Повертаємось до останнього збереженого кроку без втрати прогресу.',
    upgradeLead: 'Спершу тримаємо ритм, потім рухаємось далі.',
    statusLead: 'Зараз важливо не губити інерцію.',
    fallbackLead: 'Повертаю тебе в практикум.',
  },
  absystem: {
    productId: 'absystem',
    name: 'ABsystem',
    tone: 'premium',
    continuityLead: 'Я пам’ятаю, де ти зупинилась.',
    recoveryLead: 'Повертаю тебе до наступного кроку без зайвого шуму.',
    upgradeLead: 'Коли рух тримається, відкривається наступний крок.',
    statusLead: 'Зараз важливо побачити, де рух зупинився.',
    fallbackLead: 'Повертаю тебе до найближчого корисного кроку.',
  },
}

const LIFECYCLE_LABELS = absystemContent.presentation.lifecycleLabels
const SUBSCRIPTION_LABELS = absystemContent.presentation.subscriptionLabels
const ROOM_LABELS = absystemContent.presentation.roomLabels
const FLOW_LABELS = absystemContent.presentation.flowLabels
const STEP_LABELS = absystemContent.presentation.stepLabels

function normalize(value: string | null | undefined) {
  return String(value ?? '').trim()
}

function humanizeByMap(value: string | null | undefined, map: Readonly<Record<string, string>>, fallback: string) {
  const normalized = normalize(value)
  if (!normalized) return fallback

  if (map[normalized]) return map[normalized]
  const upper = normalized.toUpperCase()
  if (map[upper]) return map[upper]

  if (/^TRIAL_DAY_\d+$/i.test(normalized)) {
    return normalized.replaceAll('_', ' ').toLowerCase()
  }

  if (/^morning_q\d+$/i.test(normalized)) {
    return 'ранкова сесія'
  }

  if (/^evening_q\d+$/i.test(normalized)) {
    return 'вечірня рефлексія'
  }

  return normalized.replaceAll('_', ' ').toLowerCase()
}

export function resolveConversationProfile(productId: ConversationProductId | null | undefined): ConversationProfile {
  if (productId && productId in PROFILES) {
    return PROFILES[productId]
  }

  return PROFILES.absystem
}

export function humanizeLifecycleState(value: string | null | undefined): string {
  return humanizeByMap(value, LIFECYCLE_LABELS, 'зараз не визначено')
}

export function humanizeSubscriptionState(value: string | null | undefined): string {
  return humanizeByMap(value, SUBSCRIPTION_LABELS, 'стан підписки не визначено')
}

export function humanizeRoomState(value: string | null | undefined): string {
  return humanizeByMap(value, ROOM_LABELS, 'room ще не визначено')
}

export function humanizeFlowState(value: string | null | undefined): string {
  return humanizeByMap(value, FLOW_LABELS, 'поточний flow не визначено')
}

export function humanizeStep(value: string | null | undefined): string {
  return humanizeByMap(value, STEP_LABELS, 'крок ще не визначено')
}

export function humanizeUpgradeLabel(value: string | null | undefined): string {
  const normalized = normalize(value).toLowerCase()
  if (!normalized) return 'наступний крок'

  if (normalized === 'test') return 'TEST'

  if (normalized.includes('focus')) return 'Focus'
  if (normalized.includes('absystem') || normalized.includes('absystem') || normalized.includes('subscription') || normalized.includes('trial')) {
    return 'ABSystem AI'
  }
  if (normalized.includes('5points') || normalized.includes('points') || normalized.includes('стан') || normalized.includes('key')) {
    return 'Стан — ключ до змін'
  }
  if (normalized.includes('mentorship') || normalized.includes('mentor') || normalized.includes('strategic')) {
    return 'Strategic Session'
  }
  if (normalized.includes('architect') || normalized.includes('personal')) {
    return 'Personal Program'
  }
  if (normalized.includes('course') || normalized.includes('mini')) {
    return 'State Course'
  }

  return normalized.replaceAll('_', ' ')
}

export function humanizeMentorMode(value: TelegramMentorMode | string | null | undefined): string {
  const normalized = normalize(value)
  switch (normalized) {
    case 'silent':
      return 'тихий режим'
    case 'soft':
      return 'м’який режим'
    case 'medium':
      return 'робочий режим'
    case 'aggressive':
      return 'посилений режим'
    default:
      return normalized || 'режим не визначено'
  }
}

export function buildHumanStatusLines(input: {
  profile?: ConversationProfile | null
  relationship?: RelationshipMemoryProfile | null
  lifecycleState?: string | null
  subscriptionState?: string | null
  roomState?: string | null
  flowState?: string | null
  currentStep?: string | null
  currentLesson?: string | null
  streak?: number | null
  xp?: number | null
  nextStep?: string | null
  retention?: string | null
  repeatedPattern?: boolean
  upgradeReady?: boolean
}): string[] {
  const profile = input.profile ?? resolveConversationProfile('absystem')
  const snapshot = buildAbsystemStatusSnapshot({
    relationship: input.relationship ?? null,
    currentStep: input.currentStep ? humanizeStep(input.currentStep) : null,
    currentLesson: input.currentLesson ?? null,
    nextStep: input.nextStep ? humanizeUpgradeLabel(input.nextStep) : null,
    retainedContext: Boolean(input.relationship?.available),
  })

  return [
    profile.statusLead,
    '',
    ...snapshot,
  ]
}

export function buildRecoveryCopy(
  kind: ConversationRecoveryKind,
  profile: ConversationProfile,
  details: {
    step?: string | null
    context?: string | null
    reason?: string | null
    nextStep?: string | null
    relationship?: RelationshipMemoryProfile | null
  } = {},
) {
  if (profile.productId === 'absystem') {
    return buildAbsystemRecoveryCopy(
      kind,
      details.relationship ?? null,
      {
        step: details.step ?? null,
        context: details.context ?? null,
        nextStep: details.nextStep ?? null,
      },
    )
  }

  switch (kind) {
    case 'stale_callback':
      return {
        title: 'Цей крок уже змінився',
        body: `${profile.recoveryLead} Відкриваю актуальний стан без втрати прогресу.`,
        cta: 'Продовжити',
      }
    case 'flow_interrupted':
      return {
        title: 'Потік перервався',
        body: `${profile.recoveryLead} Повертаю тебе до останнього збереженого місця${details.relationship?.lastMeaningfulGoal ? `, бо останній важливий фокус був: ${details.relationship.lastMeaningfulGoal}` : ''}.`,
        cta: 'Повернутись',
      }
    case 'session_expired':
      return {
        title: 'Контекст збережено',
        body: `${profile.recoveryLead} Контекст збережено${details.nextStep ? `, наступний крок уже готовий: ${details.nextStep}` : ''}${details.relationship?.inactivityContext ? `, ${details.relationship.inactivityContext}` : ''}.`,
        cta: 'Продовжити',
      }
    case 'question_missing':
      return {
        title: 'Не знайшов поточний крок',
        body: `${profile.fallbackLead} Повертаю до останнього збереженого місця${details.context ? `: ${details.context}` : ''}${details.relationship?.repeatedPostponedAction ? `, бо повторюється той самий вузол: ${details.relationship.repeatedPostponedAction}` : ''}.`,
        cta: 'Відновити',
      }
    case 'ai_unavailable':
      return {
        title: 'Відповідь не дійшла',
        body: `${profile.fallbackLead} Давай ще раз — що для тебе зараз найважливіше?`,
        cta: 'Написати ще раз',
      }
    case 'voice_failure':
      return {
        title: 'Голос не розпізнався',
        body: `${profile.fallbackLead} Спробуй коротше або напиши текстом — я підхоплю продовження.`,
        cta: 'Написати текстом',
      }
    case 'payment_interrupted':
      return {
        title: 'Оплата не завершилась',
        body: `${profile.recoveryLead} Повертаю тебе до оплати без втрати контексту.`,
        cta: 'Повернутись до оплати',
      }
    case 'zoom_missed':
      return {
        title: 'Zoom пропущено',
        body: `${profile.recoveryLead} Ритм ще можна зібрати: повертаємось до найближчої дії.`,
        cta: 'Відновити ритм',
      }
    case 'progress_stalled':
      return {
        title: 'Ритм зупинився',
        body: `${profile.upgradeLead}${details.relationship?.repeatedRollbackTrigger ? ` Повторюється той самий вузол: ${details.relationship.repeatedRollbackTrigger}.` : ''} Я підкажу найкоротший наступний крок без перевантаження.`,
        cta: 'Подивитись наступний крок',
      }
    case 'duplicate_action':
    default:
      return {
        title: 'Крок уже оброблено',
        body: `${profile.continuityLead} Відкриваю актуальний стан замість дубля.`,
        cta: 'Продовжити',
      }
  }
}

export function buildRelationshipContinuityLead(
  profile: ConversationProfile,
  relationship: RelationshipMemoryProfile | null,
): string[] {
  if (!relationship || !relationship.available) {
    return [profile.continuityLead]
  }

  const lines = buildRelationshipContinuityLines(relationship)
  return [
    profile.continuityLead,
    ...lines.slice(1).filter((line) => line.trim().length > 0),
  ]
}
