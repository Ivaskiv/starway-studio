// apps/web/src/features/content-studio/types/index.ts

export type ContentItemStatus =
  | 'draft'
  | 'approved'
  | 'published'

export type ContentItemType =
  | 'reel'
  | 'ad'
  | 'story'
  | 'podcast'
  | 'dm'

export type ContentStudioGoal =
  | 'sale'
  | 'traffic'
  | 'warmup'

export type LeadMagnetFormat =
  | 'checklist'
  | 'guide'
  | 'quiz'
  | 'exercise'
  | 'bot-flow'

export type LeadMagnetStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'

export type LeadMagnetDestination =
  | 'telegram_bot'
  | 'landing_page'
  | 'dm_script'

export type ContentStudioStrategyDecision =
  | 'pending'
  | 'confirmed'
  | 'manual'
  | 'rejected'

export type ContentStudioWeakestStep =
  | 'lead_magnet_to_app_entry'
  | 'lead_magnet_to_wheel'
  | 'wheel_to_trial'
  | 'trial_to_engagement'
  | 'trial_to_purchase'

export type ContentStudioFunnelTransitionKey =
  | 'lead_magnet_to_wheel'
  | 'wheel_to_trial'
  | 'trial_to_engagement'
  | 'trial_to_purchase'

/* -------------------------------- */
/* NEW CENTRALIZED UI TYPES */
/* -------------------------------- */

export type ContentStudioStep =
  | 'context'
  | 'lead-magnet'
  | 'cta'
  | 'formula'
  | 'hook'
  | 'api'
  | 'research'
  | 'texts'
  | 'banners'

export type PlatformValue =
  | 'reels'
  | 'stories'
  | 'reels_stories'
  | 'reels_ads'

export type AdMessageGoal =
  | 'tofu'
  | 'mofu'
  | 'bofu'

export type CtaType =
  | 'DM'
  | 'START'
  | 'GET_ACCESS'
  | 'TRY_NOW'

export type CtaRoutingMode =
  | 'single'
  | 'ai'

export type CtaDestinationValue =
  | 'telegram'
  | 'instagram'
  | 'site'
  | 'quiz'
  | 'bot'
  | 'dm'

/* -------------------------------- */
/* STRATEGY */
/* -------------------------------- */

export interface ContentStudioStrategy {
  angle: string
  hookType: string
  emotion: string
  format: string
  contentFocus?: string
  hookAngle?: string
  ctaStrategy?: string
  coreProblem?: string
  weakestStep?: ContentStudioWeakestStep | null
  conversion?: number
  trackingDisconnected?: boolean
  worstSource?: string | null
  sourceConversion?: number
}

export interface ContentStudioAIStrategy {
  coreProblem: string
  weakestStep: ContentStudioWeakestStep | null
  conversion: number
  sampleSize: number
  reasons: string[]
  actions: string[]
  contentFocus: string
  hookAngle: string
  ctaStrategy: string
  hookType: string
  emotion: string

  suggestedFormats: Array<
    | 'reels'
    | 'stories'
    | 'dm'
    | 'ad'
  >

  formatReasoning: string
  humanInsight: string
  isFallback: boolean
  trackingDisconnected?: boolean
  worstSource?: string | null
  sourceConversion?: number
}

/* -------------------------------- */
/* LEAD MAGNET */
/* -------------------------------- */

export interface LeadMagnet {
  id: string
  title: string
  promise: string
  format: LeadMagnetFormat

  structure: {
    hook: string
    explanation: string
    steps: string[]
    result: string
    transitionToProduct: string
  }

  status: LeadMagnetStatus
  destinations: LeadMagnetDestination[]
  createdAt: Date
}

export interface ContentStudioFunnelStepInsight {
  step: ContentStudioFunnelTransitionKey
  fromLabel: string
  toLabel: string
  realUsers: number
  sampleSize: number
  realConversion: string
  idealConversion: string
  explanation: string
  arguments: string[]
  differencePoints: number | null
  isStable: boolean
}

export interface ContentStudioFunnelInsight {
  steps: ContentStudioFunnelStepInsight[]
  summary: string
  weakestStableStep: ContentStudioFunnelTransitionKey | null
  weakestStableConversion: number | null
}

export interface ContentStudioPerformanceForecast {
  views: string
  dm: string
  trial: string
  revenue: string
}

export interface ContentStudioImageVariant {
  id: string
  url: string
  prompt: string
}

export interface ContentStudioLeadMagnetPayload {
  id?: string
  productLabel: string
  status: LeadMagnetStatus
  destinations: LeadMagnetDestination[]
  promise: string
  format: LeadMagnetFormat

  structure: LeadMagnet['structure']

  title: string
  formatKey: string
  formatLabel: string
  previewText: string
  contentText: string
  telegramMessage: string
  aiInsight: string
  funnelStepLabel: string
  realConversion: string
  idealConversion: string
  sampleSize: number
  explanation: string
  arguments: string[]
  confirmations: string[]
}

export interface ContentStudioLeadMagnetPublishResult {
  ok: boolean
  contentItemId: string
  status: 'draft' | 'published'
  savedAt: string
  publishedAt?: string
  telegramSent: boolean
  telegramMessageId?: number | null
}

/* -------------------------------- */
/* RESEARCH */
/* -------------------------------- */

export interface MarketResearchHook {
  id: string
  type: string
  example: string
  why: string
  watchTimeBoost: number
  ctrBoost: number
  source: string
  bestFor: string[]
  platforms?: string[]
  formula: string
  month: string
  year: string
}

export interface MarketResearchCampaign {
  id: string
  brand: string
  hook: string
  formula: string
  hookType: string
  metric: string
  metricValue: number
  metricType: string
  description: string
  audienceTemp: string
  platform: string
  format: string
  month: string
  year: string
}

export interface MarketResearchFormula {
  id: string
  name: string
  fullName: string
  conversionBoost: number
  bestFor: string
  worstFor: string
  steps: string[]
  example: string
  rank: number
  trending: boolean
  month: string
  year: string
}

export interface MarketResearchTrend {
  id: string
  format: string
  hookText: string
  watchTimeBoost: number
  description: string
  duration: string
  structure: string[]
  example: string
  trending: boolean
  month: string
  year: string
}

export interface ResearchCacheEnvelope<TData> {
  data: TData
  generatedAt: string
  isStale: boolean
  isFallback: boolean
  source:
    | 'openai'
    | 'cache'
    | 'fallback'
}

export interface MarketResearchPayload {
  hooks:
    | ResearchCacheEnvelope<{
        hooks: MarketResearchHook[]
      }>
    | null

  ads:
    | ResearchCacheEnvelope<{
        campaigns: MarketResearchCampaign[]
      }>
    | null

  formulas:
    | ResearchCacheEnvelope<{
        formulas: MarketResearchFormula[]
      }>
    | null

  reelsTrends:
    | ResearchCacheEnvelope<{
        trends: MarketResearchTrend[]
      }>
    | null
}

/* -------------------------------- */
/* CONTENT */
/* -------------------------------- */

export interface ContentStudioInputs {
  goal: string[]
  product: string[]
  audience: string[]
  pain: string[]
  offer: string[]
  result: string[]
  cta: string[]
}

export interface ContentStudioItem {
  id: string
  type: ContentItemType
  title: string
  formatLabel: string
  status: ContentItemStatus
  content: string[]

  goal?: ContentStudioGoal
  offer?: string
  hook?: string
  script?: string
  cta?: string

  imagePrompt?: string

  generatedImages?: ContentStudioImageVariant[]

  visualStyle?: string
  topic?: string

  strategy?: ContentStudioStrategy

  telegramPayload?: string
  telegramMessage?: string
  dmEntry?: string

  funnelPath?: string[]

  performance?: ContentStudioPerformanceForecast

  launchReady?: boolean
  audioReady?: boolean

  updatedAt: string
}

export interface QueueItemWithSource {
  id: string
  title: string
  status: ContentItemStatus
  formatLabel: string
  sourceItem: ContentStudioItem
}

export type PreviewQueueItem =
  Omit<QueueItemWithSource, 'sourceItem'>

export interface ContentStudioState {
  inputs: ContentStudioInputs
  items: ContentStudioItem[]
  lastGeneratedAt: string | null
}