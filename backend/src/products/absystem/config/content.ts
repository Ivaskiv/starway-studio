// backend/src/products/absystem/config/content.ts
import type { RelationshipMemoryProfile } from '../../../core/memory/relationshipMemory.js'
import { buildBehavioralNarrative } from '../../../core/behavioral/behavioralNarrative.js'

import {
  AB_TEST_START_INTRO,
  AB_TEST_START_STEP2,
  absystemFlowContent,
} from './flow.js'
import { absystemLifecycleContent } from './lifecycle.js'
import { absystemBehavioralContent } from './behavioral.js'

export {
  AB_TEST_START_INTRO,
  AB_TEST_START_STEP2,
} from './flow.js'

export const absystemContent = {
  ...absystemFlowContent,
  ...absystemLifecycleContent,
  ...absystemBehavioralContent,
} as const

import {
  AB_TEST_FOCUS_JOIN_CTA_TEXT,
  AB_TEST_FOCUS_PAYMENT_CTA_1M,
  AB_TEST_FOCUS_PAYMENT_CTA_3M,
} from '../../ab-system/content/abTest.shared.js'

export const absystemButtons = {
  startTest: 'Почати тест',
  continueTest: 'Продовжити тест',
  restoreProgress: 'Продовжити',
  continueInChat: '💬 Продовжити в чаті',
  openMiniApp: '📱 Відкрити Mini App',
  openInBrowser: '🌐 Відкрити в браузері',
  whatToDo: 'Що з цим робити?',
  joinFocus: 'Хочу у ФОКУС',
  payFocus: 'Оплатити ФОКУС',
  joinFocusNow: AB_TEST_FOCUS_JOIN_CTA_TEXT.replace(/ →$/, ''),
  joinChannel: 'Перейти в канал',
  focusMonthly: AB_TEST_FOCUS_PAYMENT_CTA_1M,
  focusQuarterly: AB_TEST_FOCUS_PAYMENT_CTA_3M,
  openPlatform: 'Перейти в ABSystem AI',
  openDashboard: 'Відкрити платформу',
  openDailyCycle: 'Відкрити щоденник',
  openZoom: 'Відкрити Zoom',
  back: 'Назад',
  continue: 'Продовжити',
  edit: (n: number) => `✏️ Змінити №${n}`,
  renewAccess: 'Продовжити доступ',
  restoreAccess: 'Відновити доступ',
  tryAgain: 'Спробувати ще раз',
  joinWaitlist: 'Залишити заявку',
  shareTest: 'Поділитись тестом',
} as const

export type AbsystemButtonKey = keyof typeof absystemButtons

export type AbsSystemBillingKey = keyof typeof absystemContent.BILLING

export function getBillingMessage(key: AbsSystemBillingKey) {
  return absystemContent.BILLING[key]
}

export function buildAbsystemStatusSnapshot(input: {
  relationship?: RelationshipMemoryProfile | null
  currentStep?: string | null
  currentLesson?: string | null
  nextStep?: string | null
  retainedContext?: boolean
  productLabel?: string | null
}): string[] {
  const narrative = buildBehavioralNarrative({
    currentFocus: input.currentLesson ?? input.currentStep ?? undefined,
    unresolvedGoal: input.relationship?.lastMeaningfulGoal ?? undefined,
    repeatedPostponedAction: input.relationship?.repeatedPostponedAction ?? undefined,
    repeatedRollback: Boolean(input.relationship?.repeatedRollbackTrigger),
    inactivityDays: input.relationship?.returnGapDays ?? undefined,
    wheelImbalance: input.relationship?.productContinuity?.focus
      ? { weakestArea: 'Focus', score: 0 }
      : undefined,
    lastMeaningfulAction: input.relationship?.lastMeaningfulProgress ?? undefined,
    unfinishedStrategyNode: input.nextStep ?? undefined,
    lastZoomTopic: input.relationship?.lastZoomTopic ?? undefined,
    dailyCycleInterrupted: Boolean(input.relationship?.abandonmentPattern),
    emotionalPattern: input.relationship?.lastEmotionalState ?? undefined,
    momentumLevel: input.relationship?.behavioralStabilizationTrend === 'stable'
      ? 'high'
      : input.relationship?.behavioralStabilizationTrend === 'improving'
        ? 'medium'
        : 'low',
    focusParticipation: Boolean(input.relationship?.lastFocusInsight || input.relationship?.lastZoomTopic),
    focusSessionsCount: input.relationship?.productContinuity?.focus ? 1 : 0,
    lastWeeklyReportInsight: undefined,
    unresolvedDecision: input.relationship?.unfinishedDecision ?? undefined,
    repeatedAvoidancePattern: input.relationship?.recurringTomorrowBehavior ?? undefined,
  }, 'status')

  return [
    narrative.title,
    ...narrative.body,
    input.retainedContext ? absystemContent.status.contextSaved : '',
  ].filter((line) => String(line ?? '').trim().length > 0)
}

export function buildAbsystemRecoveryCopy(
  kind:
    | 'stale_callback'
    | 'flow_interrupted'
    | 'session_expired'
    | 'question_missing'
    | 'ai_unavailable'
    | 'voice_failure'
    | 'payment_interrupted'
    | 'zoom_missed'
    | 'progress_stalled'
    | 'duplicate_action',
  relationship?: RelationshipMemoryProfile | null,
  details: { step?: string | null; context?: string | null; nextStep?: string | null } = {},
) {
  switch (kind) {
    case 'stale_callback':
      return {
        title: '',
        body: '',
        cta: absystemContent.behavioral.cta.continue,
      }
    case 'flow_interrupted':
      return {
        title: 'Рух перервався',
        body: [
          absystemContent.behavioral.narrative.genericFallback[0],
          relationship?.repeatedPostponedAction ? absystemContent.behavioral.narrative.repeatedPostponedAction(relationship.repeatedPostponedAction)[0] : null,
        ].filter(Boolean).join(' '),
        cta: absystemContent.behavioral.cta.restore,
      }
    case 'session_expired':
      return {
        title: 'Контекст збережено',
        body: [
          absystemContent.behavioral.narrative.genericFallback[0],
          relationship?.inactivityContext ?? null,
        ].filter(Boolean).join(' '),
        cta: absystemContent.behavioral.cta.continue,
      }
    case 'question_missing':
      return {
        title: 'Повертаю тебе до історіяу',
        body: [
          absystemContent.behavioral.narrative.genericFallback[0],
          details.context ? `Контекст: ${details.context}.` : null,
          relationship?.repeatedPostponedAction ? absystemContent.behavioral.narrative.repeatedPostponedAction(relationship.repeatedPostponedAction)[0] : null,
        ].filter(Boolean).join(' '),
        cta: absystemContent.behavioral.cta.restore,
      }
    case 'ai_unavailable':
      return {
        title: absystemContent.errors.aiUnavailable.title,
        body: absystemContent.errors.aiUnavailable.body,
        cta: absystemContent.buttons.retry,
      }
    case 'voice_failure':
      return {
        title: absystemContent.errors.voiceFailure.title,
        body: absystemContent.errors.voiceFailure.body,
        cta: absystemContent.buttons.retry,
      }
    case 'payment_interrupted':
      return {
        title: 'Оплата не завершилась',
        body: 'Повертаю тебе до оплати без втрати історіяу.',
        cta: absystemContent.behavioral.cta.continue,
      }
    case 'zoom_missed':
      return {
        title: 'Zoom пропущено',
        body: absystemContent.zoom.missed,
        cta: absystemContent.behavioral.cta.continue,
      }
    case 'progress_stalled':
      return {
        title: 'Рух зупинився',
        body: [
          'Схоже, зараз важливо не додавати нове, а повернутись до вже знайомого вузла.',
          relationship?.repeatedRollbackTrigger ? `Повторюється той самий вузол: ${relationship.repeatedRollbackTrigger}.` : null,
        ].filter(Boolean).join(' '),
        cta: absystemContent.behavioral.cta.continue,
      }
    case 'duplicate_action':
    default:
      return {
        title: 'Крок уже оброблено',
        body: absystemContent.behavioral.narrative.genericFallback.join(' '),
        cta: absystemContent.behavioral.cta.continue,
      }
  }
}

export function buildAbsystemStartCopy(input: {
  relationship?: RelationshipMemoryProfile | null
  hasFocusParticipation?: boolean
  hasActiveProduct?: boolean
  returnGapDays?: number | null
}): {
  title: string
  body: ReadonlyArray<string>
  cta: { text: string; callback_data: string }
} {
  const relationship = input.relationship
  const hasRelationship = Boolean(relationship?.available)

  if (!hasRelationship) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.firstEntry,
      cta: { text: absystemContent.start.cta.start, callback_data: 'start_trial' },
    }
  }

  if (input.hasActiveProduct && relationship?.lastMeaningfulGoal) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterUnresolvedGoal(relationship.lastMeaningfulGoal),
      cta: { text: absystemContent.start.cta.mentor, callback_data: 'continue_ai_mentor' },
    }
  }

  if (input.hasFocusParticipation || relationship?.lastFocusInsight || relationship?.lastZoomTopic) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterFocus,
      cta: { text: absystemContent.start.cta.focus, callback_data: 'open_focus_portal' },
    }
  }

  if (typeof input.returnGapDays === 'number' && input.returnGapDays >= 30) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterLongGap,
      cta: { text: absystemContent.start.cta.continue, callback_data: 'return_main_menu' },
    }
  }

  if (typeof input.returnGapDays === 'number' && input.returnGapDays > 0) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterInactivity(input.returnGapDays),
      cta: { text: absystemContent.start.cta.continue, callback_data: 'return_main_menu' },
    }
  }

  if (relationship?.repeatedPostponedAction) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterRepeatedAction(relationship.repeatedPostponedAction),
      cta: { text: absystemContent.start.cta.mentor, callback_data: 'continue_ai_mentor' },
    }
  }

  if (relationship?.lastMeaningfulGoal) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterUnresolvedGoal(relationship.lastMeaningfulGoal),
      cta: { text: absystemContent.start.cta.mentor, callback_data: 'continue_ai_mentor' },
    }
  }

  if (relationship?.lastMeaningfulProgress && !input.hasActiveProduct) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterTest,
      cta: { text: absystemContent.start.cta.continue, callback_data: 'continue_ai_mentor' },
    }
  }

  return {
    title: absystemContent.start.title,
    body: absystemContent.start.afterActive,
    cta: { text: absystemContent.start.cta.platform, callback_data: 'open_platform' },
  }
}
