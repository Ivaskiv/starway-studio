import { stankeyManifest } from '@/products/stankey/product.manifest.js'

export const CORE_SUBSCRIPTION_DURATIONS: Record<string, number> = {
  monthly: 30,
  yearly: 365,
  yearly_plus: 365,
}

export const STANKEY_SUBSCRIPTION_DURATIONS = Object.fromEntries(
  stankeyManifest.pricing.plans.map((plan) => [plan.id, plan.durationDays])
) as Record<string, number | null>

export type EcosystemPaymentProduct = 'focus' | 'absystem_ai'
export type EcosystemPaymentPlanId =
  | 'welcome_test'
  | '1month'
  | '1month_upgrade'
  | '3month'
  | '6month'
  | '1year'

export type EcosystemPlanDefinition = {
  amount: number
  durationDays: number
  dbProductCodes: readonly string[]
  lifecycleState: 'focus_active' | 'platform_active'
}

export const LIFECYCLE_STATE_ORDER = new Map<string, number>([
  ['new', 0],
  ['test_started', 1],
  ['test_completed', 2],
  ['result_opened', 3],
  ['focus_offer_opened', 4],
  ['payment_started', 5],
  ['focus_active', 6],
  ['platform_active', 7],
  ['expired', 8],
])

export const FOCUS_DOJIM_TIMER_IDS = [
  'RESULT_DOJIM_24H',
  'RESULT_DOJIM_48H',
  'RESULT_DOJIM_72H',
  'RESULT_DOJIM_5D',
  'RESULT_DOJIM_7D',
] as const

export type FocusActivationDojimTimerId = (typeof FOCUS_DOJIM_TIMER_IDS)[number]

export type FocusActivationPlan = {
  userId: string
  lifecycleState: 'focus_active'
  welcomeMessageSent: true
  welcomeText: string
  welcomeCtaText: string
  channelInviteLink: string
  channelLinkPresent: boolean
  preZoomScheduled: boolean
  preZoomReminders: Array<{
    timerId: 'ZOOM_REMINDER_24H' | 'ZOOM_REMINDER_2H'
    sendAt: Date
    body: string
    ctaText: string
  }>
  dojimsCancelled: readonly FocusActivationDojimTimerId[]
}

export type PostZoomBridgePlan = {
  userId: string
  scheduled: boolean
  delayMs: number
  ctaText: string
  paymentUrl: string
}

export type UpgradeOfferPlan = {
  userId: string
  scheduled: boolean
  text: string
  ctaText: string
  paymentUrl: string
  delayMs: number
}

export type EcosystemPaymentCheckoutSession = {
  checkoutUrl: string
  orderReference: string
}
