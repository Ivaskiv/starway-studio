type NullableString = string | null | undefined

export type UserLifecycleInput = {
  currentState?: NullableString
  currentStep?: NullableString
  funnelStage?: NullableString
  lifecycleState?: NullableString
}

export type ResolvedLifecycle = {
  value: string
  source: 'currentState' | 'currentStep' | 'funnelStage' | 'legacy'
}

function isStrictLifecycleModeEnabled(): boolean {
  const flag = String(process.env.USER_LIFECYCLE_STRICT_MODE ?? '').trim().toLowerCase()
  return flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on'
}

function normalize(value: NullableString): string | null {
  const trimmed = String(value ?? '').trim()
  return trimmed ? trimmed.toLowerCase() : null
}

function fromCurrentState(currentState: NullableString): string | null {
  const state = normalize(currentState)
  if (!state) return null
  if (state.startsWith('trial_day_')) return 'trial'
  if (state === 'active') return 'platform_active'
  if (state === 'inactive') return 'expired'
  if (state === 'new' || state === 'telegram_linked') return 'new'
  if (state === 'paid_onboarding') return 'platform_active'
  return state
}

function fromCurrentStep(currentStep: NullableString): string | null {
  const step = normalize(currentStep)
  if (!step) return null
  if (step === 'paywall') return 'expired'
  if (step.startsWith('lead_step_')) return 'lead_magnet'
  if (step === 'start_flow' || step === 'wheel' || step === 'daily_morning' || step === 'daily_evening' || step === 'trial_mirror' || step === 'trial_final') {
    return 'onboarding'
  }
  if (step === 'link_telegram') return 'new'
  return null
}

function fromFunnelStage(funnelStage: NullableString): string | null {
  const stage = normalize(funnelStage)
  if (!stage) return null
  if (stage === 'paid') return 'platform_active'
  if (stage === 'trial') return 'trial'
  if (stage === 'churned') return 'expired'
  if (stage === 'lead') return 'lead_magnet'
  if (stage === 'anonymous') return 'guest'
  return null
}

export function resolveUserLifecycle(input: UserLifecycleInput): ResolvedLifecycle {
  const byState = fromCurrentState(input.currentState)
  if (byState) return { value: byState, source: 'currentState' }

  const byStep = fromCurrentStep(input.currentStep)
  if (byStep) return { value: byStep, source: 'currentStep' }

  const byFunnel = fromFunnelStage(input.funnelStage)
  if (byFunnel) return { value: byFunnel, source: 'funnelStage' }

  if (isStrictLifecycleModeEnabled()) {
    return { value: 'new', source: 'legacy' }
  }

  return { value: normalize(input.lifecycleState) ?? 'new', source: 'legacy' }
}

export function resolveDisplayName(input: {
  firstName?: NullableString
  lastName?: NullableString
  telegramUserName?: NullableString
  email?: NullableString
}): string {
  const first = String(input.firstName ?? '').trim()
  const last = String(input.lastName ?? '').trim()
  const full = [first, last].filter(Boolean).join(' ').trim()
  if (full) return full
  const telegram = String(input.telegramUserName ?? '').trim()
  if (telegram) return telegram
  const email = String(input.email ?? '').trim()
  if (email) return email.split('@')[0] || email
  return 'Користувач'
}
