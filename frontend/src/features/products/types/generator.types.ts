// frontend/src/features/ai-generator/types/generator.types.ts

export const TOTAL_STEPS = 11
export const ATTEMPTS_PER_STEP = 3

// Спрощений тип продукту для AI generator (НЕ ІМПОРТУЄТЬСЯ з інших модулів)
export interface ProductForAI {
  id: string
  name: string
  title: string
  type: string
  price: number
  format: string
  includesMentorship: boolean
  integrations: string[]
  goals: string[]
  purpose: string
  
}

export interface FunnelBlueprint {
  id: string
  name: string
  type: 'fast_cash' | 'diagnostic' | 'evergreen'
  targetAudience: string
  painPoint: string
  quickWin: string
  coreOffer: {
    name: string
    price: number
    format: string
  }
  upsell?: {
    name: string
    price: number
  }
  financialModel: {
    targetRevenue: number
    averageCheck: number
    requiredSales: number
    conversion_rate: number
  }
  automation: string[]
  steps: {
    hook: string
    diagnostic: string
    quickWin: string
    coreOffer: string
    upsell: string
  }
  products: ProductForAI[]
}

export interface GenerationAttempt {
  id: string
  content: string
  created_at: string
  isSelected: boolean
}

export interface StepData {
  number: number
  userInput: string
  attempts: GenerationAttempt[]
  remainingAttempts: number
  selectedAttemptId: string | null
}

export interface AIGeneratorState {
  currentStep: number
  stepsData: StepData[]
  totalRemainingAttempts: number
  isGenerating: boolean
  generatedBlueprint: FunnelBlueprint | null
  error: string | null
}

export interface StepDefinition {
  number: number
  title: string
  description: string
  placeholder?: string
  options?: string[]
}

export interface GenerateStepPayload {
  stepNumber: number
  userInput: string
  context: Record<string, string>
}

// export interface StepGenerationResponse {
//   variants: string[]
// }

export interface GenerateStepResponse {
  variants: string[]; // кожен варіант — текст
}

export interface GenerateBlueprintPayload {
  stepsData: {
    number: number
    userInput: string
    selectedContent: string
  }[]
}

export interface SaveFunnelResponse {
  funnelId: string
}

export const STEP_DEFINITIONS: StepDefinition[] = [
  {
    number: 1,
    title: 'Хто ти і за що тобі платять',
    description: 'Визначаємо твою цінність для клієнтів',
    placeholder: 'Наприклад: Допомагаю жінкам 25-45 вийти з професійного застою через AI-менторинг',
  },
  {
    number: 2,
    title: 'Твоя унікальність',
    description: 'Що робить тебе особливим',
    placeholder: 'Наприклад: 10+ років досвіду + власна методика + AI-інструменти',
  },
  {
    number: 3,
    title: 'Головна біль клієнта',
    description: 'За що платять прямо зараз',
    placeholder: 'Наприклад: Роблять багато, але результату nemає. Вигорання.',
  },
  {
    number: 4,
    title: 'Швидкий результат',
    description: 'Що клієнт отримає за 1-7 днів',
    placeholder: 'Наприклад: PDF-аудит з 3 головними помилками + план дій',
  },
  {
    number: 5,
    title: 'Тип воронки',
    description: 'Який формат тобі ближчий',
    options: ['Швидкий low-ticket (до $50)', 'Діагностика + консультація', 'Evergreen з підписками'],
  },
  {
    number: 6,
    title: 'Формат основного продукту',
    description: 'Що ти будеш продавати',
    options: ['Консультація 1:1', 'Онлайн курс/шаблони', 'AI-супровід', 'Telegram чат-бот', 'Підписка/членство'],
  },
  {
    number: 7,
    title: 'Рівень твоєї участі',
    description: 'Скільки ти готовий бути залученим',
    options: ['Майже 0 (автомат)', 'Іноді (check-in)', 'Активно (менторство)'],
  },
  {
    number: 8,
    title: 'Джерело трафіку',
    description: 'Звідки прийдуть клієнти',
    options: ['Соцмережі (Instagram/TikTok)', 'Таргетована реклама', 'Email база', 'Органіка/SEO', 'Партнери/реферали'],
  },
  {
    number: 9,
    title: 'Попередні провали клієнтів',
    description: 'Що не спрацювало у твоїх клієнтів раніше',
    placeholder: 'Наприклад: Купували курси, але не проходили до кінця',
  },
  {
    number: 10,
    title: 'Фінансова ціль',
    description: 'Скільки хочеш заробляти на місяць',
    placeholder: 'Наприклад: 100000 грн',
  },
  {
    number: 11,
    title: 'Обмеження',
    description: 'Що точно НЕ хочеш робити',
    placeholder: 'Наприклад: Не хочу знімати відео, працювати з холодним трафіком',
  },
]