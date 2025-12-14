// src/types/modules.ts
export type ModuleId = 
  | 'ai-mentor'
  | 'telegram-bot'
  | 'courses'
  | 'tasks'
  | 'progress-tracker'
  | 'life-wheel'
  | 'analytics'
  | 'payments'
  | 'email-automation'
  | 'notifications'
  | 'resources'
  | 'quizzes'
  | 'reports'
  | 'gamification'
  | 'calendar'
  | 'support-chat'

export type ModuleCategory = 
  | 'ai'
  | 'automation'
  | 'content'
  | 'analytics'
  | 'monetization'
  | 'communication'
  | 'productivity'

export interface ModuleSettings {
  [key: string]: any
}

export interface Module {
  id: ModuleId
  name: string
  description: string
  category: ModuleCategory
  icon: string
  enabled: boolean
  isPremium: boolean
  dependencies?: ModuleId[]
  settings?: ModuleSettings
  version: string
}

export interface UserModuleProgress {
  moduleId: ModuleId
  userId: string
  progress: number
  startedAt: string
  completedAt?: string
  data?: any
}

// Всі доступні модулі
export const AVAILABLE_MODULES: Module[] = [
  {
    id: 'ai-mentor',
    name: 'AI-Ментор',
    description: 'Персональний асистент на базі GPT-4',
    category: 'ai',
    icon: '🤖',
    enabled: true,
    isPremium: true,
    version: '1.0.0',
    settings: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    }
  },
  {
    id: 'telegram-bot',
    name: 'Telegram-бот',
    description: 'Автоматизація через Telegram',
    category: 'automation',
    icon: '✈️',
    enabled: true,
    isPremium: false,
    version: '1.0.0',
    settings: {
      botToken: '',
      webhookUrl: ''
    }
  },
  {
    id: 'courses',
    name: 'Курси',
    description: 'Навчальні програми та уроки',
    category: 'content',
    icon: '📚',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  },
  {
    id: 'tasks',
    name: 'Завдання',
    description: 'Чек-листи та трекінг виконання',
    category: 'productivity',
    icon: '✅',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  },
  {
    id: 'progress-tracker',
    name: 'Прогрес',
    description: 'Візуалізація досягнень',
    category: 'analytics',
    icon: '📊',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  },
  {
    id: 'life-wheel',
    name: 'Колесо балансу',
    description: 'Оцінка сфер життя',
    category: 'analytics',
    icon: '⚖️',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  },
  {
    id: 'analytics',
    name: 'Аналітика',
    description: 'Детальна статистика',
    category: 'analytics',
    icon: '📈',
    enabled: true,
    isPremium: true,
    version: '1.0.0'
  },
  {
    id: 'payments',
    name: 'Платежі',
    description: 'Stripe та WayForPay',
    category: 'monetization',
    icon: '💳',
    enabled: true,
    isPremium: false,
    version: '1.0.0',
    settings: {
      stripeKey: '',
      wayforpayKey: ''
    }
  },
  {
    id: 'email-automation',
    name: 'Email-автоматизація',
    description: 'Послідовні розсилки',
    category: 'automation',
    icon: '📧',
    enabled: true,
    isPremium: true,
    dependencies: ['telegram-bot'],
    version: '1.0.0'
  },
  {
    id: 'notifications',
    name: 'Нотифікації',
    description: 'Push та нагадування',
    category: 'communication',
    icon: '🔔',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  },
  {
    id: 'resources',
    name: 'Бібліотека',
    description: 'Файли та шаблони',
    category: 'content',
    icon: '📁',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  },
  {
    id: 'quizzes',
    name: 'Тести',
    description: 'Перевірка знань',
    category: 'content',
    icon: '📝',
    enabled: true,
    isPremium: false,
    dependencies: ['courses'],
    version: '1.0.0'
  },
  {
    id: 'reports',
    name: 'Звіти',
    description: 'Тижневі та місячні звіти',
    category: 'analytics',
    icon: '📋',
    enabled: true,
    isPremium: true,
    dependencies: ['progress-tracker'],
    version: '1.0.0'
  },
  {
    id: 'gamification',
    name: 'Геймифікація',
    description: 'Бали, рівні, досягнення',
    category: 'productivity',
    icon: '🎮',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  },
  {
    id: 'calendar',
    name: 'Календар',
    description: 'Планування подій',
    category: 'productivity',
    icon: '📅',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  },
  {
    id: 'support-chat',
    name: 'Підтримка',
    description: 'Чат з командою',
    category: 'communication',
    icon: '💬',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  }
]