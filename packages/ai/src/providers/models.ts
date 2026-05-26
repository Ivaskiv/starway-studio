export const AI_MODELS = {
  GPT_MAIN: 'gpt-4.1',
  GPT_MINI: 'gpt-4.1-mini',

  CLAUDE_MAIN: 'claude-sonnet-4-5',
  CLAUDE_HAIKU: 'claude-haiku-3-5',

  GEMINI_AUDIT: 'gemini-2.5-flash',
  GEMINI_FLASH: 'gemini-2.5-flash',
} as const

export const MODEL_STRATEGY = {
  standard: {
    openai: 'gpt-4.1-mini',
    anthropic: 'claude-haiku-3-5',
    gemini: 'gemini-2.5-flash',
  },
  complex: {
    openai: 'gpt-4.1',
    anthropic: 'claude-sonnet-4-5',
    gemini: 'gemini-2.5-pro',
  },
} as const

export type ModelStrategyTier = keyof typeof MODEL_STRATEGY
