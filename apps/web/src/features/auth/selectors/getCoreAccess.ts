type AccessInput = {
  trial?: {
    isActive?: boolean | null
  } | null
  subscription?: {
    isActive?: boolean | null
  } | null
  accessControl?: {
    hasSubscription?: boolean | null
  } | null
}

export type CoreAccessState = {
  trialActive: boolean
  subscriptionActive: boolean
  hasCoreAccess: boolean
}

export function getCoreAccess(input: AccessInput): CoreAccessState {
  const trialActive = Boolean(input.trial?.isActive)
  const subscriptionActive = Boolean(
    input.subscription?.isActive || input.accessControl?.hasSubscription
  )

  return {
    trialActive,
    subscriptionActive,
    hasCoreAccess: trialActive || subscriptionActive,
  }
}

export default getCoreAccess
