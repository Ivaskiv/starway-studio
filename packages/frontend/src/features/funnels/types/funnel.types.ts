// features/funnels/types/funnel.types.ts

export type FunnelStatus = 'draft' | 'active' | 'paused' | 'archived'
export type FunnelTheme = 'orange' | 'green' | 'blue' | 'red' | 'purple' | 'yellow'
export type StepType = 'message' | 'form' | 'payment' | 'condition' | 'delay' | 'webhook' | 'ai_mentor' | 'gamification' | 'email' | 'sms' | 'telegram'

export const TOTAL_STEPS = 8
export const ATTEMPTS_PER_STEP = 3

export const STEP_DEFINITIONS: FunnelStepDefinition[] = [
  { order: 1, title: 'Назва воронки', description: 'Коротка, продаюча назва', placeholder: 'AI-Аудит: Де ти втрачаєш гроші за 5 хвилин' },
  { order: 2, title: 'Цільова аудиторія', description: 'Хто саме купить у тебе', placeholder: 'Експерти з продуктом, але без стабільних продажів' },
  { order: 3, title: 'Головна біль', description: 'Проблема, за яку платять', placeholder: 'Продукт є, але продажі нестабільні' },
  { order: 4, title: 'Швидкий результат', description: 'Що клієнт отримає за 1–7 днів', placeholder: 'PDF-звіт з 3 помилками + AI-коментар' },
  { order: 5, title: 'Тип воронки', description: 'Який формат тобі ближчий', options: ['Швидкий low-ticket', 'Діагностика + консультація', 'Evergreen з підписками'] },
  { order: 6, title: 'Формат продукту', description: 'Що ти будеш продавати', options: ['Консультація', 'Курс/шаблони', 'AI-супровід', 'Чат-бот', 'Підписка'] },
  { order: 7, title: 'Джерело трафіку', description: 'Звідки прийдуть ліди', options: ['Соцмережі', 'Реклама', 'Органіка', 'База', 'Партнери'] },
  { order: 8, title: 'Фінансова мета', description: 'Скільки хочеш заробляти', placeholder: '100000 грн/міс' },
]

export interface FunnelStepDefinition {
  order: number
  title: string
  description: string
  placeholder?: string
  options?: string[]
}

export interface Funnel {
  id: string
  userId: string
  name: string
  description?: string
  theme: FunnelTheme
  status: FunnelStatus
  steps: FunnelStep[]
  analytics?: FunnelAnalytics
  createdAt: string
  updatedAt: string
}

export interface FunnelStep {
  id: string
  type: StepType
  name: string
  order: number
  config: StepConfig
  isActive: boolean
}

export interface StepConfig {
  message?: { text: string; buttons?: StepButton[] }
  form?: { fields: FormField[]; submitText: string }
  payment?: { amount: number; currency: string; provider: string }
  delay?: { duration: number; unit: 'minutes' | 'hours' | 'days' }
  webhook?: { url: string; method: 'GET' | 'POST' }
  aiMentor?: { type: string; questions: string[] }
  gamification?: { type: string; reward: number }
}

export interface StepButton {
  id: string
  text: string
  action: 'next' | 'url' | 'payment'
  value?: string
}

export interface FormField {
  id: string
  name: string
  type: string
  label: string
  required: boolean
}

export interface FunnelAnalytics {
  views: number
  uniqueVisitors: number
  conversions: number
  revenue: number
}

export interface GenerateVariantsRequest {
  stepNumber: number
  userInput: string
  context?: Record<string, string>
}

export interface GenerateVariantsResponse {
  variants: string[]
}

export interface FunnelAttempt {
  id: string
  content: string
  isSelected: boolean
}