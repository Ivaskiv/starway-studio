// fix code_x: AI Producer 2026 architecture with controlled generation budget per phase.

export const TOTAL_STEPS = 11;
export const ATTEMPTS_PER_STEP = 3;

export interface GenerationAttempt {
  id: string;
  content: string;
  createdAt: string;
  isSelected: boolean;
}

export interface StepDefinition {
  number: number;
  title: string;
  description: string;
  placeholder?: string;
  options?: string[];
  expectedOutput?: string;
  examples?: string[];
}

export interface StepData {
  number: number;
  userInput: string;
  communityPrompt?: string;
  attempts: GenerationAttempt[];
  remainingAttempts: number;
  selectedAttemptId: string | null;
  isSaved?: boolean;
}

export interface FunnelBlueprint {
  id?: string;
  name: string;
  type: 'fast_cash' | 'diagnostic' | 'evergreen';
  targetAudience: string;
  painPoint?: string;
  quickWin?: string;
  steps: {
    hook: string;
    diagnostic: string;
    quickWin: string;
    coreOffer: string;
    upsell: string;
  };
  coreOffer: {
    name: string;
    price: number;
    format: string;
  };
  upsell?: {
    name: string;
    price: number;
  } | null;
  financialModel: {
    averageCheck: number;
    requiredSales: number;
    conversion_rate: number;
    targetRevenue: number;
  };
  automation: string[];
  products?: Array<{
    // fix code_x: template products can have stable ids (e.g. audit_basic/audit_upsell) for deterministic mapping.
    id?: string;
    name: string;
    title?: string;
    price: number;
    type: 'one_time' | 'subscription';
    format: string;
    integrations: string[];
    goals?: string[];
    purpose?: string;
    includesMentorship?: boolean;
  }>;
}

export interface AIGeneratorState {
  currentStep: number;
  stepsData: StepData[];
  totalRemainingAttempts: number;
  isGenerating: boolean;
  generatedBlueprint: FunnelBlueprint | null;
  error: string | null;
}

export interface OwnerOnboardingProfile {
  ownerEmail: string;
  productName: string;
  productCode: string;
  productDescription: string;
  funnelName: string;
  funnelGoal: string;
  coreTask: string;
  businessType: string;
  targetAudience: string;
  telegramBotName: string;
  telegramBotToken: string;
  telegramContact: string;
  initialProducts: string;
}

export const OWNER_ONBOARDING_DEFAULTS: OwnerOnboardingProfile = {
  ownerEmail: '',
  productName: '',
  productCode: '',
  productDescription: '',
  funnelName: '',
  funnelGoal: '',
  coreTask: '',
  businessType: '',
  targetAudience: '',
  telegramBotName: '',
  telegramBotToken: '',
  telegramContact: '',
  initialProducts: '',
};

export const STEP_DEFINITIONS: StepDefinition[] = [
  {
    number: 1,
    title: 'Крок 1: Ніша і трансформація',
    description:
      'Точка А/Б, для кого продукт і який вимірюваний результат даєш.',
    placeholder:
      'Проблема, ЦА, точка А, точка Б, KPI результату, термін, чим відрізняєшся.',
    expectedOutput: 'Формула трансформації + чіткий positioning',
    examples: [
      'Точка А: жінка 30+ в хаосі рішень; Точка Б: стабільний ритм дій 30 днів і +20% доходу за 8 тижнів.',
      'Унікальність: система “Стан → Вибір → Дія” + щоденний AI-супровід через Telegram.',
    ],
  },
  {
    number: 2,
    title: 'Крок 2: Формат продукту і чек',
    description:
      'Визнач формат (trial/підписка/курс), чек, ресурси і масштаб.',
    placeholder:
      'Формат (курс/підписка/наставництво), години/тиждень, команда, Zoom, автоматизація, бажаний чек.',
    expectedOutput: 'Валідація формату + фінансова рамка',
    examples: [
      'Формат: trial 7 днів + підписка 33€/міс, участь автора 2 год/тиждень.',
      'Команда: 1 асистент, Zoom 1 раз/тиждень, 80% автоматизовано.',
    ],
  },
  {
    number: 3,
    title: 'Крок 3: Портрет ЦА і тригери',
    description: 'Портрет ЦА, психологія, тригери, страхи, барʼєри, прихована вигода не змінюватись.',
    placeholder:
      'Вік, дохід, сфера, що вже пробували, головний страх, внутрішня причина застою, мрія, тригери.',
    expectedOutput: 'Портрет ЦА + 3 болі + 3 тригери',
    examples: [
      'ЦА: жінки 25-40, дохід 600-1500€, вже пробували курси/марафони, але зривались.',
      'Тригер: страх знову “почати і кинути”, мрія про стабільний дохід і внутрішню опору.',
    ],
  },
  {
    number: 4,
    title: 'Крок 4: Модель монетизації',
    description: 'Вибір лише однієї оптимальної моделі монетизації на базі чеку, довіри і ресурсу.',
    options: [
      'Low-ticket + Upsell',
      'Діагностика → High-ticket',
      'Підписка',
      'Вебінар',
      'Контент-прогрів → заявка',
    ],
    expectedOutput: 'Одна обрана модель + логіка апселів',
    examples: [
      'Модель: Trial 7 днів → Підписка 33€/міс → Upsell наставництво 149€.',
      'Причина вибору: низький поріг входу + швидкий малий результат + довічний LTV.',
    ],
  },
  {
    number: 5,
    title: 'Крок 5: Продукт №1 — Колесо балансу',
    description:
      'Сконструюй колесо балансу: 1-10 сфер, опис сфер, шкалу оцінки, текст аналізу.',
    placeholder:
      'Кількість сфер, назви сфер, emoji, опис, правила аналізу OpenAI, cooldown, CTA після результату.',
    expectedOutput: 'JSON-конфіг колеса + правила AI-аналізу',
    examples: [
      '8 сфер: здоровʼя, енергія, фінанси, стосунки, реалізація, свобода, оточення, внутрішня опора.',
      'Для кожної сфери: оцінка 1-10 + short reason + AI-висновок (сильні/ризики/наступний крок).',
    ],
  },
  {
    number: 6,
    title: 'Крок 6: Продукт №2 — AI-ментор',
    description:
      'Збери AI-ментора, який використовує колесо і веде по щоденному циклу.',
    placeholder:
      'Тон менторства, інструкції, рамки безпеки, стиль відповідей, CTA і контентні обмеження.',
    expectedOutput: 'Системний prompt AI-ментора + правила діалогу',
    examples: [
      'AI не “розумний”, AI корисний: “Задай 5 питань → отримай наступний крок і дію на сьогодні”.',
      'Вбудувати логіку: Стан → Ціль → Вибір → Рішення → Дія.',
    ],
  },
  {
    number: 7,
    title: 'Крок 7: Ранок/вечір і щоденний цикл',
    description: 'Сценарій двох опитувань на день + аналіз відповідей.',
    placeholder:
      'Ранкові/вечірні питання, умови нагадувань, логіка streak, тригери ескалації.',
    expectedOutput: 'Daily-cycle сценарій + правила аналітики',
    examples: [
      'Ранок: фокус/енергія/настрій/1 ключова дія. Вечір: підсумок/перешкоди/урок/наступний крок.',
      'Якщо 3 дні спад — ментор запускає anti-drop сценарій.',
    ],
  },
  {
    number: 8,
    title: 'Крок 8: Звіти і PDF',
    description: 'Тижневий/місячний/загальний звіти, короткі і чіткі.',
    placeholder:
      'Що входить у звіт, графіки, A4 структура, афірмація, рекомендації.',
    expectedOutput: 'Шаблон звіту + правила генерації PDF',
    examples: [
      'A4 portrait: header logo+date, radar chart, блок “було | є | покращити”, footer афірмація.',
      'Тижневий звіт надсилається в Telegram + доступний в miniapp.',
    ],
  },
  {
    number: 9,
    title: 'Крок 9: Telegram bot-flow',
    description: 'Підключення Telegram, нагадування, підписка, меню.',
    placeholder:
      'Імʼя бота, токен (secure), welcome flow, кнопки меню, fallback якщо не привʼязаний chatId.',
    expectedOutput: 'Telegram сценарій + карта кнопок',
    examples: [
      'Кнопки: Кабінет, Колесо, Звіти, Підписка, AI Ментор, Допомога.',
      'Якщо chatId відсутній — запросити username/номер і підтвердити лінк.',
    ],
  },
  {
    number: 10,
    title: 'Крок 10: Miniapp UX і гейміфікація',
    description: 'Сценарії miniapp, прогрес, бейджі, streak, рівні.',
    placeholder:
      'Рівні, XP, бейджі, анімації, як і коли показувати винагороди/челенджі.',
    expectedOutput: 'Механіка гейміфікації + miniapp flow',
    examples: [
      'Рівні: старт → стабільність 7 днів → стабільність 30 днів.',
      'Нагороди: бейдж “Перший крок”, “7 днів”, “Цілеспрямованість”.',
    ],
  },
  {
    number: 11,
    title: 'Крок 11: Фінальна AI-воронка',
    description:
      'Обʼєднай все: wheel + aIMentor + telegram + miniapp + монетизація в єдину воронку.',
    placeholder:
      'Канали входу, кодове слово, CTA, послідовність прогріву, точки апселу, retention.',
    expectedOutput: 'Готова funnel-схема під запуск',
    examples: [
      'Вхід: Instagram сторіс → код “СТАРТ” → бот → колесо балансу → результат → trial.',
      'Дотиск: день 2/4/7 з доказами прогресу і CTA “Активувати повний доступ”.',
    ],
  },
];
