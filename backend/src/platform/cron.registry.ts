import type { PlatformProductId } from '@shared/platform.registry'

export type PlatformCronCategory = 'reminder' | 'subscription' | 'retention' | 'analytics'
export type PlatformCronDeliveryMode = 'telegram' | 'internal'

export type PlatformCronJob = {
  id: string
  label: string
  cadence: string
  enabled: boolean
  category: PlatformCronCategory
  deliveryMode: PlatformCronDeliveryMode
  productScope: PlatformProductId[]
}

export type PlatformCronProfile = {
  reminders: boolean
  streak: boolean
  scheduledJobs: boolean
  jobs: PlatformCronJob[]
}

export const PLATFORM_CRON_REGISTRY: PlatformCronJob[] = [
  {
    id: 'dailyMorning',
    label: 'Daily morning reminder',
    cadence: '* * * * *',
    enabled: true,
    category: 'reminder',
    deliveryMode: 'telegram',
    productScope: ['stankey', 'absystem'],
  },
  {
    id: 'dailyEvening',
    label: 'Daily evening reminder',
    cadence: '* * * * *',
    enabled: true,
    category: 'reminder',
    deliveryMode: 'telegram',
    productScope: ['stankey', 'absystem'],
  },
  {
    id: 'streakRisk',
    label: 'Streak risk warning',
    cadence: '0 * * * *',
    enabled: true,
    category: 'retention',
    deliveryMode: 'telegram',
    productScope: ['absystem'],
  },
  {
    id: 'weeklySummary',
    label: 'Weekly summary',
    cadence: '* * * * *',
    enabled: true,
    category: 'analytics',
    deliveryMode: 'internal',
    productScope: ['absystem', 'stankey'],
  },
  {
    id: 'subscriptionExpiring',
    label: 'Subscription expiring',
    cadence: '0 * * * *',
    enabled: true,
    category: 'subscription',
    deliveryMode: 'telegram',
    productScope: ['focus', 'stankey', 'absystem'],
  },
  {
    id: 'subscriptionExpired',
    label: 'Subscription expired',
    cadence: '5 * * * *',
    enabled: true,
    category: 'subscription',
    deliveryMode: 'telegram',
    productScope: ['focus', 'stankey', 'absystem'],
  },
  {
    id: 'microTaskReminder',
    label: 'Micro task reminder',
    cadence: '0 * * * *',
    enabled: true,
    category: 'reminder',
    deliveryMode: 'telegram',
    productScope: ['absystem'],
  },
  {
    id: 'nudge',
    label: 'Nudge reminder',
    cadence: '15 * * * *',
    enabled: true,
    category: 'reminder',
    deliveryMode: 'telegram',
    productScope: ['absystem', 'stankey'],
  },
]

export function getProductCronProfile(productId: PlatformProductId): PlatformCronProfile {
  const jobs = PLATFORM_CRON_REGISTRY.filter(job => job.productScope.includes(productId) && job.enabled)

  return {
    reminders: jobs.some(job => job.category === 'reminder'),
    streak: jobs.some(job => job.id === 'streakRisk'),
    scheduledJobs: jobs.length > 0,
    jobs,
  }
}

