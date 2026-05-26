export type ContentTypeKey =
  | 'blog'
  | 'landing'
  | 'storytelling'
  | 'telegram_msg'
  | 'reels'
  | 'stories'
  | 'warmup'
  | 'webinar'
  | 'audit'
  | 'post'
  | 'email'
  | 'sales'

export type OutputModel = 'claude' | 'gpt' | 'gemini'
export type OutputStatus = 'pending' | 'generating' | 'ready' | 'error'

export interface BaseOutputCard {
  contentType: ContentTypeKey
  model: OutputModel
  status: OutputStatus
  wordCount: number
  generatedAt?: string
}

export interface BlogCard extends BaseOutputCard {
  contentType: 'blog'
  h1: string
  readTime: number
  thesis_blocks: Array<{ title: string; words: number }>
  body: string
  cta: string
  seoMeta: string
}

export interface LandingCard extends BaseOutputCard {
  contentType: 'landing'
  hero: string
  painBlock: string
  solutionBlock: string
  proofBlock: string
  offerBlock: string
  ctaBlock: string
  faqBlock: string
  blueprintBlocks: string[]
}

export interface StorytellingCard extends BaseOutputCard {
  contentType: 'storytelling'
  stories: Array<{ title: string; sceneType: string; text: string }>
}

export interface TelegramCard extends BaseOutputCard {
  contentType: 'telegram_msg'
  messages: Array<{ text: string; symbolCount: number }>
  ctaLink: string
}

export interface ReelsCard extends BaseOutputCard {
  contentType: 'reels'
  timeline: Array<{
    start: string
    end: string
    type: string
    text: string
    visual: string
  }>
  voiceover: string
  cta: string
}

export interface StoriesCard extends BaseOutputCard {
  contentType: 'stories'
  slides: Array<{ visual: string; thesis: string; stickerType?: string }>
}

export interface WarmupCard extends BaseOutputCard {
  contentType: 'warmup'
  days: Array<{ day: number; theme: string; text: string; tension: string }>
}

export interface WebinarCard extends BaseOutputCard {
  contentType: 'webinar'
  slides: Array<{ timing: string; title: string; speakerNotes: string }>
}

export interface AuditCard extends BaseOutputCard {
  contentType: 'audit'
  issues: Array<{
    marker: string
    severity: string
    original: string
    replacement: string
  }>
  score: number
  axes: {
    clarity: number
    context: number
    emotion: number
    action: number
  }
}

export interface PostCard extends BaseOutputCard {
  contentType: 'post'
  hook: string
  body: string
  hashtags: string[]
  cta: string
}

export interface EmailCard extends BaseOutputCard {
  contentType: 'email'
  subject: string
  preheader: string
  body: string
  ctaText: string
  ps: string
}

export interface SalesCard extends BaseOutputCard {
  contentType: 'sales'
  exchanges: Array<{
    speaker: 'manager' | 'client'
    text: string
    triggerWords?: string[]
  }>
}

export interface BannersLayer {
  cards: Array<{
    num: number
    imageUrl?: string
    prompt: string
    status: OutputStatus
  }>
}

export interface ReelsEngineLayer {
  pipeline: Array<{ step: string; status: OutputStatus; label: string }>
  progress: number
  eta: string
}

export type AnyOutputCard =
  | BlogCard
  | LandingCard
  | StorytellingCard
  | TelegramCard
  | ReelsCard
  | StoriesCard
  | WarmupCard
  | WebinarCard
  | AuditCard
  | PostCard
  | EmailCard
  | SalesCard

export type ContentCardType =
  | 'REELS'
  | 'WARMUP'
  | 'LANDING'
  | 'TELEGRAM_MSG'
  | 'STORIES'
  | 'CTA'

export interface ContentCard {
  id: string
  type: ContentCardType
  title: string
  hook: string
  body: string
  cta: string
  clickupTaskUrl?: string
  forecast?: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface GenerateResponse {
  success: boolean
  strategyApplied: string
  contentCount: number
  conversionForecast: 'HIGH' | 'MEDIUM' | 'LOW'
  data: ContentCard[]
  error?: string
}

export interface ProgressLog {
  time: string
  text: string
  pct: number
}
