export type BillingPlan = 'monthly' | 'yearly'

export type UserSubscription = {
  userId: string
  plan: BillingPlan
  isPaid: boolean
  expiresAt: Date
  provider: 'wayforpay'
}
