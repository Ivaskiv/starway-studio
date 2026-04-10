export type FunnelScreenType = 'lead_magnet' | 'instant_value' | 'cta' | 'onboarding' | 'activation' | 'conversion'

export type FunnelTargetSegment = 'trial' | 'monthly' | 'yearly' | 'mentor' | 'free_practice'

export type FunnelChannel = 'telegram' | 'miniapp' | 'site'

export interface FunnelScreenMetrics {
  opened: number
  passedCta: number
  trialStart: number
  converted: number
}

export interface FunnelScreen {
  id: string
  order: number
  type: FunnelScreenType
  title: string
  bodyText: string
  ctaLabel: string
  ctaSecondaryLabel?: string
  channels: FunnelChannel[]
  aiPromptId?: string
  linkedNotificationId?: string
  metrics?: FunnelScreenMetrics
}

export interface Funnel {
  id: string
  name: string
  status: 'active' | 'draft' | 'archived'
  version: string
  targetSegment: FunnelTargetSegment
  screens: FunnelScreen[]
  createdAt: string
  updatedAt: string
}

export const FUNNEL_SCREEN_TYPE_OPTIONS: Array<{ value: FunnelScreenType; label: string }> = [
  { value: 'lead_magnet', label: 'Лід-магніт' },
  { value: 'instant_value', label: 'Миттєва цінність' },
  { value: 'cta', label: 'CTA' },
  { value: 'onboarding', label: 'Онбординг' },
  { value: 'activation', label: 'Активація' },
  { value: 'conversion', label: 'Конверсія' },
]

export const FUNNEL_SCREEN_TYPE_META: Record<FunnelScreenType, { label: string; badge: string }> = {
  lead_magnet: { label: 'Лід-магніт', badge: 'Lead' },
  instant_value: { label: 'Миттєва цінність', badge: 'Value' },
  cta: { label: 'CTA', badge: 'CTA' },
  onboarding: { label: 'Онбординг', badge: 'Onboarding' },
  activation: { label: 'Активація', badge: 'Activation' },
  conversion: { label: 'Конверсія', badge: 'Conversion' },
}

export const FUNNEL_CHANNEL_OPTIONS: Array<{ value: FunnelChannel; label: string }> = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'miniapp', label: 'Mini App' },
  { value: 'site', label: 'Сайт' },
]

export const FUNNEL_CHANNEL_META: Record<FunnelChannel, string> = {
  telegram: 'TG',
  miniapp: 'Mini',
  site: 'Site',
}

export const FUNNEL_TARGET_SEGMENT_OPTIONS: Array<{ value: FunnelTargetSegment; label: string }> = [
  { value: 'trial', label: 'Trial' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'free_practice', label: 'Free practice' },
]

export const FUNNEL_TARGET_SEGMENT_META: Record<FunnelTargetSegment, string> = {
  trial: 'Trial',
  monthly: 'Monthly',
  yearly: 'Yearly',
  mentor: 'Mentor',
  free_practice: 'Free practice',
}

export interface FunnelDraft {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt?: string | null;
  status: 'draft' | 'published' | 'archived';
  ownerId: string;
  ownerName: string;
  steps: Array<{ title: string; description: string }>;
}
