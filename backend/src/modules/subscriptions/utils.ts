import type { SubscriptionStatus } from '@starway/db/prisma-client'
import type { SafeUser } from '../../types/globalTypes.js'

const STATUS_MAP: Record<string, SafeUser['subscriptionStatus']> = {
  ACTIVE: 'active',
  TRIAL: 'active',
  PAST_DUE: 'past_due',
  INCOMPLETE: 'incomplete',
  CANCELED: 'canceled',
}

const ALLOWED_PLANS: SafeUser['subscriptionPlan'][] = ['free', 'trial', 'paid']

export function normalizeSubscriptionStatus(status?: SubscriptionStatus | string | null): SafeUser['subscriptionStatus'] {
  if (!status) return null
  const normalized = status.toUpperCase()
  return STATUS_MAP[normalized] ?? null
}

export function normalizeSubscriptionPlan(plan?: string | null): SafeUser['subscriptionPlan'] {
  if (!plan) return 'free'
  const normalized = plan.toLowerCase()
  return ALLOWED_PLANS.includes(normalized as SafeUser['subscriptionPlan']) ? (normalized as SafeUser['subscriptionPlan']) : 'free'
}
