export type ResearchType = 'hooks' | 'ads' | 'formulas' | 'reels_trends'
export type ResearchPlatform = 'instagram' | 'meta_ads' | 'tiktok' | 'youtube'

export type ResearchConfig = {
  type: ResearchType
  platform: ResearchPlatform
  prompt: string
}

export type CachedEnvelope<TData> = {
  data: TData
  generatedAt: string
  isStale: boolean
  isFallback: boolean
  source: 'openai' | 'cache' | 'fallback'
}

export type HookRecord = {
  id: string
  type: string
  example: string
  why: string
  watchTimeBoost: number
  ctrBoost: number
  source: string
  bestFor: string[]
  platforms: string[]
  formula: string
  month: string
  year: string
}

export type CampaignRecord = {
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

export type FormulaRecord = {
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

export type TrendRecord = {
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
