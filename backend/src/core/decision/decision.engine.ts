import { getOffer } from '../monetization/monetization.service.js'
import type { UserMemoryProfile } from '../memory/memory.service.js'

export interface AccessDecisionContext {
  hasSubscription?: boolean
  hasLeadMagnet?: boolean
}

export interface ProductDecisionContext {
  hasProgress?: boolean
  unfinishedSteps?: number
  repeatedPatterns?: boolean
  streak?: number
  daysToTrialEnd?: number | null
  nextTrigger?: 'resume_session' | 'streak_reinforcement' | 'unfinished_action_push' | 'deeper_offer' | 'winback' | null
  memoryProfile?: UserMemoryProfile
}

export type DecisionInput = {
  userId: string | null
  event: string
  payload?: Record<string, unknown>
  currentState: string
  currentStep?: string | null
  access?: any
  product?: ProductDecisionContext
}

export type DecisionOutput = {
  nextAction:
    | 'show_funnel_step'
    | 'show_trial_offer'
    | 'show_funnel'
    | 'show_product'
    | 'start_trial'
    | 'show_paywall'
    | 'resume_session'
    | 'show_offer'
    | 'show_winback'
    | 'bind_user'
  nextState?: string
  nextStep?: string
  uiTemplate: string
  uiData?: Record<string, unknown>
}

function hasProductProgress(product?: ProductDecisionContext): boolean {
  return Boolean(product?.hasProgress)
}

function hasUnfinishedSteps(product?: ProductDecisionContext): boolean {
  return Number(product?.unfinishedSteps ?? 0) > 0
}

function isTrialNearEnd(input: DecisionInput): boolean {
  const days = input.product?.daysToTrialEnd
  return typeof days === 'number' && days <= 2
}

function isReinforcementMoment(input: DecisionInput) {
  return input.product?.nextTrigger === 'streak_reinforcement' || Number(input.product?.streak ?? 0) > 0
}

function buildOfferUiData(
  input: DecisionInput,
  lifecycle: 'activated' | 'trial_active' | 'paid_active' | 'expired' | 'churned',
) {
  return toUiData(getOffer({
    lifecycle,
    hasProgress: hasProductProgress(input.product),
    daysToTrialEnd: input.product?.daysToTrialEnd ?? null,
    repeatedPatterns: Boolean(input.product?.repeatedPatterns),
    repeatedInactivity: input.product?.nextTrigger === 'winback',
    memoryBlockers: input.product?.memoryProfile?.repeatedBlockers ?? [],
    emotionalPatterns: input.product?.memoryProfile?.emotionalPatterns ?? [],
    unfinishedSteps: input.product?.unfinishedSteps ?? 0,
    streak: input.product?.streak ?? 0,
  }))
}

function toUiData<T extends object>(data: T | null | undefined): Record<string, unknown> | undefined {
  if (!data) return undefined
  return { ...data } as Record<string, unknown>
}

export function decideNextAction(input: DecisionInput): DecisionOutput {
  if (!input.userId || input.currentState === 'anonymous') {
    return {
      nextAction: 'bind_user',
      nextState: 'lead',
      nextStep: 'link_telegram',
      uiTemplate: 'bind_account',
    }
  }

  if (input.currentState === 'lead') {
    return {
      nextAction: 'show_funnel_step',
      nextState: 'lead',
      nextStep: input.currentStep ?? 'lead_step',
      uiTemplate: 'funnel_step',
      uiData: {
        step: input.currentStep ?? 'lead_step',
        hasLeadMagnet: Boolean((input.access as AccessDecisionContext | undefined)?.hasLeadMagnet),
        goals: input.product?.memoryProfile?.goals ?? [],
      },
    }
  }

  if (input.currentState === 'expired' || input.currentState === 'churned') {
    return {
      nextAction: 'show_winback',
      nextState: input.currentState,
      nextStep: 'winback_offer',
      uiTemplate: 'winback_offer',
      uiData: buildOfferUiData(input, input.currentState as 'expired' | 'churned'),
    }
  }

  if (hasUnfinishedSteps(input.product) || input.product?.nextTrigger === 'resume_session') {
    return {
      nextAction: 'resume_session',
      nextState: input.currentState,
      nextStep: input.currentStep ?? 'resume',
      uiTemplate: 'resume_product',
      uiData: { unfinishedSteps: input.product?.unfinishedSteps ?? 0 },
    }
  }

  if (input.product?.nextTrigger === 'unfinished_action_push') {
    return {
      nextAction: 'resume_session',
      nextState: input.currentState,
      nextStep: input.currentStep ?? 'resume',
      uiTemplate: 'unfinished_action_push',
      uiData: { unfinishedSteps: input.product?.unfinishedSteps ?? 0 },
    }
  }

  if (
    input.event === 'lead_magnet_completed'
    && (input.currentState === 'lead' || input.currentState === 'activated')
  ) {
    return {
      nextAction: 'show_trial_offer',
      nextState: 'activated',
      nextStep: 'trial_offer',
      uiTemplate: 'show_trial_offer',
      uiData: buildOfferUiData({
        ...input,
        product: {
          ...input.product,
          hasProgress: true,
        },
      }, 'activated'),
    }
  }

  if (input.currentState === 'activated') {
    return {
      nextAction: 'show_trial_offer',
      nextState: 'activated',
      nextStep: 'trial_offer',
      uiTemplate: 'show_trial_offer',
      uiData: buildOfferUiData(input, 'activated'),
    }
  }

  if (input.currentState === 'trial_active' && isTrialNearEnd(input)) {
    return {
      nextAction: 'show_offer',
      nextState: 'trial_active',
      nextStep: 'subscription_offer',
      uiTemplate: 'subscription_offer',
      uiData: buildOfferUiData(input, 'trial_active'),
    }
  }

  if (
    (input.currentState === 'trial_active' || input.currentState === 'paid_active')
    && (input.product?.repeatedPatterns || input.product?.nextTrigger === 'deeper_offer')
  ) {
    return {
      nextAction: 'show_offer',
      nextState: input.currentState,
      nextStep: 'deep_support_offer',
      uiTemplate: 'upsell_offer',
      uiData: {
        ...(buildOfferUiData(input, input.currentState as 'trial_active' | 'paid_active') ?? {}),
        blockers: input.product?.memoryProfile?.repeatedBlockers ?? [],
        emotionalPatterns: input.product?.memoryProfile?.emotionalPatterns ?? [],
      },
    }
  }

  if (input.currentState === 'trial_active' && hasProductProgress(input.product)) {
    return {
      nextAction: 'show_product',
      nextState: 'trial_active',
      nextStep: input.currentStep ?? 'daily_cycle',
      uiTemplate: isReinforcementMoment(input) ? 'product_reinforcement' : 'product_home',
      uiData: { streak: input.product?.streak ?? 0 },
    }
  }

  if (input.currentState === 'paid_active') {
    return {
      nextAction: 'show_product',
      nextState: input.currentState,
      nextStep: input.currentStep ?? 'daily_cycle',
      uiTemplate: isReinforcementMoment(input) ? 'product_reinforcement' : 'product_home',
      uiData: { streak: input.product?.streak ?? 0 },
    }
  }

  if (input.currentState === 'paused') {
    return {
      nextAction: 'show_paywall',
      nextState: 'paused',
      nextStep: 'restore_access',
      uiTemplate: 'restore_access',
    }
  }

  return {
    nextAction: 'show_funnel',
    nextState: input.currentState,
    nextStep: input.currentStep ?? 'entry',
    uiTemplate: 'lead_magnet_entry',
  }
}
