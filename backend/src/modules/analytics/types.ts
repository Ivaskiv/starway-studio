import type { Prisma } from '@starway/db/prisma-client'

export type Period = '7d' | '30d' | '90d'

export interface PeriodRange {
  now: Date
  start: Date
}

export interface OverviewStats {
  totalUsers: number
  activeUsers: number
  newUsers: number
  avgActionsPerUser: number
  streakUsers: number
}

export interface CanonicalCoachMetrics {
  totalUsers: number
  testInProgress: number
  testCompleted: number
  focusPaid: number
  activeZoomUsers: number
  testToFocusConversion: number
  abSystemUpgrades: number
  revenueCents: number
  mrr: number
}

export interface RevenueCurrencyStat {
  currency: string
  count: number
  sumCents: number
}

export interface RevenueProductStat {
  code: string
  name: string
  currency: string
  count: number
  sumCents: number
}

export interface CanonicalRevenueMetrics {
  periodStart: Date
  periodEnd: Date
  revenueCents: number
  paymentCount: number
  paidUsers: number
  paidUsersByProduct: Array<{
    code: string
    users: number
  }>
  renewals: number
  mrrCents: number
  arpuCents: number
  revenueByCurrency: RevenueCurrencyStat[]
  revenueByProduct: RevenueProductStat[]
  successfulPaymentEvents: number
  matchedPaymentEvents: number
  unmatchedPaymentEvents: number
}

export interface FunnelStageStat {
  stage: 'start' | 'lead_magnet' | 'wheel' | 'trial' | 'engagement' | 'purchase'
  users: number
  conversionRate: number
}

export interface FunnelStats {
  stages: FunnelStageStat[]
}

export interface ConversionRates {
  startToLeadMagnet: number
  leadMagnetToWheel: number
  wheelToTrial: number
  trialToPurchase: number
}

export interface DropOffPoint {
  from: FunnelStageStat['stage']
  to: FunnelStageStat['stage']
  dropOffRate: number
  lostUsers: number
}

export interface QuestionGroup {
  text: string
  count: number
  detectedIntent: string
  category: string
  productContext: string
}

export interface TopEvent {
  type: string
  count: number
}

export interface LiveEventItem {
  id: string
  type: string
  source: string
  state: string | null
  createdAt: string
  user: {
    id: string | null
    label: string
  }
}

export interface JourneyItem {
  id: string
  type: string
  source: string
  state: string | null
  payload: Prisma.JsonValue
  createdAt: string
}

export interface RetentionStats {
  day1: number
  day3: number
  day7: number
}

export interface InsightCount {
  label: string
  count: number
}

export interface AIInsights {
  topIntents: InsightCount[]
  topProblems: InsightCount[]
  topCategories: InsightCount[]
  trackingIntegrity?: TrackingIntegrity | null
}

export interface FounderFunnelStep {
  key: string
  label: string
  users: number
  conversionRate: number
  dropOffRate: number
  avgHoursToNext: number
  lastActionBeforeExit: string
}

export interface FounderAnalytics {
  funnel: FounderFunnelStep[]
  retention: {
    day1: number
    day3: number
    avgStreak: number
    actionsPerUser: number
  }
  behavior: {
    firstActionCompletionRate: number
    stuckUsersRate: number
    weakestPoint: string
    heuristic: string
    suggestion: string
  }
  channels: {
    webUsers: number
    miniAppUsers: number
    telegramUsers: number
    webOnlyUsers: number
    telegramReturnRate: number
    miniAppEngagementRate: number
  }
}

export interface TrackingIntegrity {
  isDisconnected: boolean
  coreProblem: string
  weakestStep: 'lead_magnet_to_app_entry' | 'lead_magnet_to_wheel' | 'wheel_to_trial' | 'trial_to_engagement' | 'trial_to_purchase'
  conversion: number
  sampleSize: number
  reasons: string[]
  actions: string[]
  worstSource: string | null
  sourceConversion: number
  leadUsers: number
  appUsers: number
  matchedUsers: number
  unlinkedEvents: number
}
