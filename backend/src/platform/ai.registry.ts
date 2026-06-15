export type AiTaskTier = 'cheap' | 'balanced' | 'premium'

export type AiTaskType =
  | 'mentor_reply'
  | 'telegram_intelligence'
  | 'weekly_insight'
  | 'daily_analysis'
  | 'web_map_adaptation'
  | 'task_priority'
  | 'banner_generation'
  | 'assistant_weekly_insight'
  | 'lead_magnet_copy'

export type AiTaskRegistryEntry = {
  type: AiTaskType
  priority: 'low' | 'normal' | 'high'
  tier: AiTaskTier
  model: string
  maxTokens: number
  timeoutMs: number
  throttleMs: number
  retryPolicy: {
    retries: number
    baseDelayMs: number
  }
  cachePolicy: {
    ttlSeconds: number
    enabled: boolean
  }
  streaming: boolean
  label: string
}

export const AI_MODEL_TIERS = {
  cheap: 'gpt-4o-mini',
  balanced: 'gpt-4o',
  premium: 'gpt-4o',
} as const

export const AI_TASK_REGISTRY: Record<AiTaskType, AiTaskRegistryEntry> = {
  mentor_reply: {
    type: 'mentor_reply',
    priority: 'high',
    tier: 'balanced',
    model: AI_MODEL_TIERS.balanced,
    maxTokens: 520,
    timeoutMs: 25_000,
    throttleMs: 10_000,
    retryPolicy: { retries: 1, baseDelayMs: 500 },
    cachePolicy: { ttlSeconds: 300, enabled: true },
    streaming: true,
    label: 'mentor-reply',
  },
  telegram_intelligence: {
    type: 'telegram_intelligence',
    priority: 'high',
    tier: 'balanced',
    model: AI_MODEL_TIERS.balanced,
    maxTokens: 420,
    timeoutMs: 20_000,
    throttleMs: 5_000,
    retryPolicy: { retries: 1, baseDelayMs: 400 },
    cachePolicy: { ttlSeconds: 120, enabled: true },
    streaming: false,
    label: 'telegram-intelligence',
  },
  weekly_insight: {
    type: 'weekly_insight',
    priority: 'normal',
    tier: 'balanced',
    model: AI_MODEL_TIERS.balanced,
    maxTokens: 420,
    timeoutMs: 20_000,
    throttleMs: 10_000,
    retryPolicy: { retries: 1, baseDelayMs: 500 },
    cachePolicy: { ttlSeconds: 1_800, enabled: true },
    streaming: false,
    label: 'weekly-insight',
  },
  daily_analysis: {
    type: 'daily_analysis',
    priority: 'normal',
    tier: 'cheap',
    model: AI_MODEL_TIERS.cheap,
    maxTokens: 900,
    timeoutMs: 20_000,
    throttleMs: 10_000,
    retryPolicy: { retries: 1, baseDelayMs: 400 },
    cachePolicy: { ttlSeconds: 3_600, enabled: true },
    streaming: false,
    label: 'daily-analysis',
  },
  web_map_adaptation: {
    type: 'web_map_adaptation',
    priority: 'normal',
    tier: 'cheap',
    model: AI_MODEL_TIERS.cheap,
    maxTokens: 1_200,
    timeoutMs: 30_000,
    throttleMs: 10_000,
    retryPolicy: { retries: 1, baseDelayMs: 500 },
    cachePolicy: { ttlSeconds: 900, enabled: true },
    streaming: false,
    label: 'web-map-adaptation',
  },
  task_priority: {
    type: 'task_priority',
    priority: 'normal',
    tier: 'cheap',
    model: AI_MODEL_TIERS.cheap,
    maxTokens: 16,
    timeoutMs: 10_000,
    throttleMs: 10_000,
    retryPolicy: { retries: 1, baseDelayMs: 250 },
    cachePolicy: { ttlSeconds: 900, enabled: true },
    streaming: false,
    label: 'task-priority',
  },
  banner_generation: {
    type: 'banner_generation',
    priority: 'low',
    tier: 'balanced',
    model: AI_MODEL_TIERS.balanced,
    maxTokens: 300,
    timeoutMs: 20_000,
    throttleMs: 30_000,
    retryPolicy: { retries: 1, baseDelayMs: 400 },
    cachePolicy: { ttlSeconds: 1_800, enabled: true },
    streaming: false,
    label: 'banner-generation',
  },
  assistant_weekly_insight: {
    type: 'assistant_weekly_insight',
    priority: 'normal',
    tier: 'balanced',
    model: AI_MODEL_TIERS.balanced,
    maxTokens: 400,
    timeoutMs: 20_000,
    throttleMs: 10_000,
    retryPolicy: { retries: 1, baseDelayMs: 500 },
    cachePolicy: { ttlSeconds: 1_800, enabled: true },
    streaming: false,
    label: 'assistant-weekly-insight',
  },
  lead_magnet_copy: {
    type: 'lead_magnet_copy',
    priority: 'low',
    tier: 'cheap',
    model: AI_MODEL_TIERS.cheap,
    maxTokens: 280,
    timeoutMs: 15_000,
    throttleMs: 30_000,
    retryPolicy: { retries: 1, baseDelayMs: 300 },
    cachePolicy: { ttlSeconds: 3_600, enabled: true },
    streaming: false,
    label: 'lead-magnet-copy',
  },
}

export function getAiTaskConfig(taskType: AiTaskType): AiTaskRegistryEntry {
  return AI_TASK_REGISTRY[taskType]
}

export function resolveAiModel(taskType: AiTaskType): string {
  return getAiTaskConfig(taskType).model
}
