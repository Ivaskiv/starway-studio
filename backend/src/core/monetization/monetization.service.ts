import type { CanonicalLifecycleState } from '../lifecycle/lifecycle.adapter.js'

export interface MonetizationContext {
  lifecycle: CanonicalLifecycleState
  hasProgress?: boolean
  daysToTrialEnd?: number | null
  repeatedInactivity?: boolean
  repeatedUsage?: boolean
  repeatedPatterns?: boolean
  blockedFeature?: boolean
  memoryBlockers?: string[]
  emotionalPatterns?: string[]
  streak?: number
  unfinishedSteps?: number
}

export interface MonetizationOffer {
  offerType: 'trial' | 'subscription' | 'upsell' | 'winback'
  reason: string
  urgency?: string
}

export function getOffer(context: MonetizationContext): MonetizationOffer | null {
  if (context.lifecycle === 'expired' || context.lifecycle === 'churned' || context.repeatedInactivity) {
    return {
      offerType: 'winback',
      reason: 'Користувач втратив активний доступ і потребує повернення в систему.',
      urgency: 'Поверни доступ, щоб не втратити інерцію та результати.',
    }
  }

  if (context.lifecycle === 'activated' && (context.hasProgress || (context.streak ?? 0) > 0)) {
    return {
      offerType: 'trial',
      reason: 'Користувач уже відчув першу цінність і готовий спробувати повний ритм ABsystem.',
    }
  }

  if (
    context.lifecycle === 'trial_active'
    && (context.repeatedUsage || (context.streak ?? 0) >= 3)
  ) {
    return {
      offerType: 'subscription',
      reason: 'Користувач повертається в систему повторно й уже формує звичку, тож готовий закріпити доступ підпискою.',
    }
  }

  if (
    context.lifecycle === 'trial_active'
    && typeof context.daysToTrialEnd === 'number'
    && context.daysToTrialEnd <= 2
  ) {
    return {
      offerType: 'subscription',
      reason: 'Тріал завершується, а користувач уже вклався в прогрес.',
      urgency: `Залишилося ${context.daysToTrialEnd} дн. щоб зберегти ритм без паузи.`,
    }
  }

  if (
    (context.lifecycle === 'trial_active' || context.lifecycle === 'paid_active')
    && (
      context.blockedFeature
      || context.repeatedPatterns
      || (context.memoryBlockers?.length ?? 0) >= 2
      || (context.emotionalPatterns?.length ?? 0) >= 2
    )
  ) {
    return {
      offerType: 'upsell',
      reason: context.blockedFeature
        ? 'Користувач уперся в заблоковану можливість і вже готовий до глибшого продукту.'
        : 'Повторюваний патерн у блокерах або емоційних станах вказує, що користувачу потрібна глибша підтримка або сильніший продукт.',
    }
  }

  if (context.lifecycle === 'paid_active' && (context.unfinishedSteps ?? 0) > 0 && (context.streak ?? 0) >= 3) {
    return {
      offerType: 'upsell',
      reason: 'Користувач тримає ритм, але впирається в незавершені кроки — час запропонувати глибший формат підтримки.',
    }
  }

  return null
}
