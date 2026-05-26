import { MODEL_STRATEGY } from './models.js'

export const AI_ROUTING = {
  REELS: 'gpt',
  STORIES: 'gpt',
  AUDIT: 'gpt',
  WARMUP: 'gpt',
} as const

export const FALLBACK_CHAIN = [
  'openai',
  'anthropic',
  'gemini',
] as const

export function resolveModelStrategyTier(protocol: string) {
  return protocol === 'PSYCH' ? 'complex' : 'standard'
}

export function resolveModelStrategy(protocol: string) {
  return MODEL_STRATEGY[resolveModelStrategyTier(protocol)]
}
