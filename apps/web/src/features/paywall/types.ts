export type PaywallTrigger =
  | 'pattern_detected'
  | 'day_3'
  | 'trial_expired'
  | 'manual'
  | 'recovery'

export type PaywallPlanUI = {
  id: string
  price: number
  title: string
  features: string[]
  cta: string
}

export type BackendPaywallPayload = {
  type: 'paywall'
  offerType: string
  plans: PaywallPlanUI[]
}
