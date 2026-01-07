// packages/frontend/src/features/ai-generator/types/generator.types.ts

export const TOTAL_STEPS = 11;
export const ATTEMPTS_PER_STEP = 3;

export const STEP_DEFINITIONS = [
  {
    number: 1,
    title: 'Хто ти і за що тобі платять',
    description: 'Визначаємо твою цінність для клієнтів',
    placeholder: 'Наприклад: Допомагаю жінкам 30+ вийти з професійного застою через AI-систему змін',
  },
  {
    number: 2,
    title: 'Головний біль аудиторії',
    description: 'Проблема, за яку готові платити прямо зараз',
    placeholder: 'Наприклад: Відчувають що застрягли в кар\'єрі, бачать однакові дні',
  },
  {
    number: 3,
    title: 'Швидкий результат (1-7 днів)',
    description: 'Що людина отримає ШВИДКО',
    placeholder: 'Наприклад: За 3 дні отримаєш колесо балансу з AI-аналізом + перші кроки змін',
  },
  {
    number: 4,
    title: 'Портрет одного клієнта',
    description: 'Конкретна людина, не загальна ЦА',
    placeholder: 'Наприклад: Олена, 34, менеджер, втомилась від рутини',
  },
  {
    number: 5,
    title: 'Модель доходу',
    description: 'Як ти хочеш заробляти',
    options: ['Швидкий low-ticket', 'Підписка', 'Середній чек', 'Апсел', 'Мікс'],
  },
  {
    number: 6,
    title: 'Формат продукту',
    description: 'Що тобі простіше створити',
    options: ['Консультація', 'Курс', 'Шаблони', 'Чат-бот', 'AI-супровід'],
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
    options: ['Соцмережі', 'Реклама', 'База', 'Органіка', 'Партнери'],
  },
  {
    number: 9,
    title: 'Попередні провали',
    description: 'Що не спрацювало у твоїх клієнтів',
    placeholder: 'Наприклад: Купували курси, але не проходили до кінця',
  },
  {
    number: 10,
    title: 'Фінансова ціль',
    description: 'Скільки хочеш заробляти на місяць',
    placeholder: 'Наприклад: 50000 грн',
  },
  {
    number: 11,
    title: 'Обмеження',
    description: 'Що точно НЕ хочеш робити',
    placeholder: 'Наприклад: Не хочу знімати відео, працювати з холодним трафіком',
  },
] as const;

// ... решта типів без змін

export interface GenerationAttempt {
  id: string;
  content: string;
  createdAt: string;
  isSelected: boolean;
}

export interface StepData {
  number: number;
  userInput: string;
  attempts: GenerationAttempt[];
  remainingAttempts: number;
  selectedAttemptId: string | null;
}

export interface FunnelBlueprint {
  name: string;
  type: 'fast_cash' | 'diagnostic' | 'evergreen';
  targetAudience: string;
  painPoint: string;
  quickWin: string;
  coreOffer: {
    name: string;
    price: number;
    format: string;
  };
  upsell?: {
    name: string;
    price: number;
  };
  financialModel: {
    targetRevenue: number;
    averageCheck: number;
    requiredSales: number;
    conversionRate: number;
  };
  automation: string[];
  steps: {
    hook: string;
    diagnostic: string;
    quickWin: string;
    coreOffer: string;
    upsell: string;
  };
}

export interface AIGeneratorState {
  currentStep: number;
  stepsData: StepData[];
  totalRemainingAttempts: number;
  isGenerating: boolean;
  generatedBlueprint: FunnelBlueprint | null;
  error: string | null;
}