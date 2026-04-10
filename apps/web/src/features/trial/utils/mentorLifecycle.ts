import type { TrialStatus } from '../services/trial.api'

type AccessControlLike = {
  hasSubscription?: boolean
}

type SubscriptionLike = {
  isActive?: boolean
}

type TrialModuleLike = {
  lockReason?: 'TRIAL_EXPIRED' | 'NO_SUBSCRIPTION' | null
}

export type MentorLifecycleState =
  | 'never_started'
  | 'active_trial'
  | 'paid'
  | 'paused_trial_ended'

export function getMentorLifecycleState(input: {
  trial?: TrialStatus
  accessControl?: AccessControlLike | null
  subscription?: SubscriptionLike | null
  aiMentorModule?: TrialModuleLike | null
}): MentorLifecycleState {
  const trial = input.trial
  const isPaid = Boolean(trial?.isPaid || input.subscription?.isActive || input.accessControl?.hasSubscription)
  if (isPaid) {
    return 'paid'
  }

  if (trial?.isActive) {
    return 'active_trial'
  }

  const hasEverStarted = Boolean(
    (trial?.currentDay ?? 0) > 0 ||
    trial?.startedAt ||
    input.aiMentorModule?.lockReason === 'TRIAL_EXPIRED',
  )

  if (hasEverStarted) {
    return 'paused_trial_ended'
  }

  return 'never_started'
}
