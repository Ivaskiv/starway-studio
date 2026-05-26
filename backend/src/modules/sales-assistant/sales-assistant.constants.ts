import type { AiBehaviorProfile, ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'

export const DEFAULT_PROVIDER: ModelProvider = 'gpt'
export const MAX_PROMPT_CHARS = 12_000
export const MAX_USER_REQUEST_CHARS = 4_000
export const PROMPT_PREVIEW_CHARS = 300
export const ADMIN_ALERT_DEBOUNCE_MS = 30 * 60 * 1000
export const RESULT_CACHE_LIMIT = 100

export const ALERT_WORTHY_CODES = new Set([
  'QUOTA_EXCEEDED',
  'INVALID_PROVIDER_KEY',
  'PROVIDER_FORBIDDEN',
  'ALL_PROVIDERS_DOWN',
])

export const PROVIDER_EMOJI: Record<string, string> = {
  claude: '🟠',
  gpt:    '🟢',
  gemini: '🔵',
  all:    '🔴',
}

export const FALLBACK_PROFILE: AiBehaviorProfile = {
  key: 'STARWAY_OGOLENA_PRAVDA',
  systemAnchor: 'Formula of Honesty. Говори прямо, конкретно, без маркетингової вати.',
  supportedProtocols: {
    SYSTEM: 'Оголена правда: провокативно, чесно, без прикрас.',
    AUTHOR: 'Головний Архітектор: сила, масштаб, структура.',
    PSYCH:  'Психологія Дії: аудит причин, барʼєрів і наступного кроку.',
  },
  supportedOutputs: [
    'REELS_SCENARIO','STORIES','WARMUP_3DAYS','WEBINAR_SALES',
    'STORIES_CHECK','BLOG_IDEAS','EMAIL','CUSTOM_SCRIPT','CUSTOM',
  ],
}