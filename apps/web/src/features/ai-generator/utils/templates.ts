// /features/ai-generator/utils/templates.ts

import { FunnelBlueprint } from "@/features/ai-generator/types/wizard.types";


export const DEMO_TEMPLATES: FunnelBlueprint[] = [
  {
    id: 'template1',
    name: 'AI-Аудит: Де ти втрачаєш гроші',
    type: 'fast_cash',
    targetAudience: 'Експерти, фрілансери, малі бізнеси без стабільних продажів',
    painPoint: 'Продукт не продається, незрозуміло чому',
    quickWin: 'PDF-звіт з 3 головними помилками за 5 хвилин',
    coreOffer: {
      name: 'Персональний AI-розбір + план дій',
      price: 99,
      format: 'AI-супровід + документація',
    },
    upsell: {
      name: 'AI-воронка під твій продукт',
      price: 299,
    },
    financialModel: {
      targetRevenue: 10000,
      averageCheck: 99,
      requiredSales: 101,
      conversion_rate: 18,
    },
    automation: [
      'AI-діагностика автоматична',
      'Генерація PDF-звіту',
      'Email-секвенція',
      'Telegram-нагадування',
    ],
    steps: {
      hook: 'Хочеш знати, чому твій продукт не продається? AI знайде причину за 2 хвилини',
      diagnostic: '5 питань про продукт, трафік, офер → AI виявляє 3 фейли',
      quickWin: 'Безкоштовний PDF з розбором + voice-коментар AI',
      coreOffer: 'Персональний AI-план на 14 днів: що змінити, як протестувати, чого чекати',
      upsell: 'Хочеш AI зробить це за тебе? Готова воронка + інтеграції за 299 грн',
    },
    products: [
      {
        id: 'audit_basic',
        name: 'AI-Аудит (основний)',
        title: 'AI-аудит',
        type: 'one_time',
        price: 99,
        format: 'web',
        integrations: ['other'],
        includesMentorship: false,
        goals: ['lead'],
        purpose: 'збір потенційних клієнтів',
      },
      {
        id: 'audit_upsell',
        name: 'Повна AI-воронка під ключ',
        title: 'AI-воронка',
        type: 'one_time',
        price: 299,
        format: 'mini-app',
        integrations: ['telegram'],
        includesMentorship: true,
        goals: ['sale'],
        purpose: 'продаж повного пакету',
      },
    ],
  },

  {
    id: 'diagnostic',
    name: 'AI-Діагностика твого доходу',
    type: 'diagnostic',
    targetAudience: 'Експерти, коучі, онлайн-школи з продуктом але без стабільного доходу',
    painPoint: 'Є продукт, є аудиторія, але гроші нестабільні',
    quickWin: 'Персональний AI-звіт: продукт VS воронка VS трафік',
    coreOffer: {
      name: 'AI-Стратегія росту',
      price: 399,
      format: 'Стратегічна сесія + roadmap',
    },
    upsell: {
      name: 'Повна AI-воронка під ключ',
      price: 999,
    },
    financialModel: {
      targetRevenue: 50000,
      averageCheck: 399,
      requiredSales: 125,
      conversion_rate: 15,
    },
    automation: [
      'AI-аналіз бізнес-моделі',
      'Автоматичні рекомендації',
      'Email + Telegram-секвенція',
      'Трекінг виконання',
    ],
    steps: {
      hook: 'Твій дохід — проблема продукту чи воронки? AI дасть відповідь за 3 хвилини',
      diagnostic: 'AI аналізує: якість продукту, позиціонування, джерела трафіку, конверсію',
      quickWin: 'Детальний звіт з цифрами: де втрачаєш, скільки і як виправити',
      coreOffer: 'AI-Стратегія: покроковий план виходу на стабільний дохід за 30-60 днів',
      upsell: 'AI збудує всю воронку: лендинг, бот, email, аналітику — готове рішення',
    },
    products: [
      {
        id: 'diagnostic_strategy',
        name: 'AI-Стратегія росту',
        title: 'AI-аналіз бізнес-моделі',
        type: 'one_time',
        price: 399,
        format: 'web',
        integrations: ['other'],
        includesMentorship: false,
        goals: ['sale'],
        purpose: 'продаж повного пакету',
      },
      {
        id: 'diagnostic_full_funnel',
        name: 'Повна воронка під ключ',
        title: 'AI-аналіз бізнес-моделі',
        type: 'one_time',
        price: 999,
        format: 'mini-app',
        integrations: ['telegram'],
        includesMentorship: true,
        goals: ['sale'],
        purpose: 'продаж повного пакету',
      },
    ],
  },

  {
    id: 'ai_mentorship',
    name: 'AI: Досвід → Продажі',
    type: 'evergreen',
    targetAudience: 'Контент-кріейтори, блогери, експерти з аудиторією',
    painPoint: 'Багато контенту, лайків, але продажів немає',
    quickWin: 'AI-чеклист: чому контент не конвертує',
    coreOffer: {
      name: 'AI-Контент + мікроворонка',
      price: 79,
      format: 'Контент-план + автоворонка',
    },
    upsell: {
      name: 'AI-Контент машина (місяць)',
      price: 199,
    },
    financialModel: {
      targetRevenue: 30000,
      averageCheck: 79,
      requiredSales: 380,
      conversion_rate: 12,
    },
    automation: [
      'AI-генерація контенту',
      'Автопублікація',
      'Мікроворонка на кожен пост',
      'Аналітика engagement',
    ],
    steps: {
      hook: 'Чому твій контент набирає лайки, але не продає? AI покаже за 1 хвилину',
      diagnostic: "AI перевіряє: теми, CTA, структуру, зв'язок з офером",
      quickWin: 'Чеклист з 7 пунктів + 3 готові продаючі теми під твій продукт',
      coreOffer: 'AI створює 14 днів контенту + мікроворонку під кожен пост',
      upsell: 'Підписка: AI генерує контент щодня + автоматично веде до продажу',
    },
    products: [
      {
        id: 'content_plan',
        name: 'AI-Контент план на 14 днів',
        title: 'AI-Контент план на 14 днів',
        type: 'one_time',
        price: 79,
        format: 'web',
        integrations: ['other'],
        includesMentorship: false,
        goals: ['lead'],
        purpose: 'збір потенційних клієнтів',
      },
      {
        id: 'content_subscription',
        name: 'AI-Контент машина (підписка)',
        title: 'AI-Контент машина (підписка)',
        type: 'subscription',
        price: 199,
        format: 'mini-app',
        integrations: ['telegram'],
        includesMentorship: false,
        goals: ['sale'],
        purpose: 'щоденний продаж контенту',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
//  AI_PRODUCER_TEMPLATES
// ═══════════════════════════════════════════════════════════════

export interface ProducerTemplate {
  id: string
  icon: string
  badge: string
  color: string
  glow: string
  title: string
  result: string
  modules: string
  finalState: string
  prefill: {
    name: string
    audience: string
    transformation: string
    format: string
    uniqueness: string
  }
  className?: string
}

export const AI_PRODUCER_TEMPLATES: ProducerTemplate[] = [
  {
    id: 'audit',
    icon: '🔍',
    badge: 'АУДИТ',
    color: '#0a2446',
    glow: 'rgba(var(--accent-rgb),0.13)',
    title: 'AI-Аудит: Де ти втрачаєш гроші',
    result: 'PDF-звіт з 3 головними помилками за 5 хвилин',
    modules: 'A–G',
    finalState: 'Хочеш AI зробить це за тебе? Готова воронка + інтеграції за 299 грн',
    prefill: {
      name: 'AI-Аудит: Де ти втрачаєш гроші',
      audience: 'Підприємці та фрілансери, що не розуміють чому немає продажів',
      transformation: "Від «не знаю де я провалююсь» → до «ось 3 конкретні помилки і як їх виправити»",
      format: '5-хвилинна діагностика → миттєвий PDF-звіт → оффер готового рішення за 299 грн',
      uniqueness: 'AI знаходить патерни втрат за 5 питань + генерує персональний PDF-аудит',
    },
  },
  {
    id: 'income',
    icon: '📈',
    badge: 'ДІАГНОСТИКА',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.13)',
    title: 'AI-Діагностика твого доходу',
    result: 'Персональний AI-звіт: продукт VS воронка VS трафік',
    modules: 'A–G',
    finalState: 'AI збудує всю воронку: лендинг, бот, email, аналітику — готове рішення',
    prefill: {
      name: 'AI-Діагностика твого доходу',
      audience: 'Онлайн-підприємці, коучи, експерти з доходом до $1000/міс',
      transformation: "Від «не розумію чому мало грошей» → до «ось що саме ламається»",
      format: '10-хвилинна діагностика → AI-звіт з пріоритетами → оффер на готове рішення',
      uniqueness: 'AI порівнює 3 зони: продукт, воронку і трафік — дає рейтинг і план дій',
    },
  },
  {
    id: 'content',
    icon: '✍️',
    badge: 'КОНТЕНТ',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.13)',
    title: 'AI: Досвід → Продажі',
    result: 'AI-чеклист: чому контент не конвертує',
    modules: 'A–G',
    finalState: 'Підписка: AI генерує контент щодня + автоматично веде до продажу',
    prefill: {
      name: 'AI: Досвід → Продажі',
      audience: 'Експерти та коучи, що пишуть багато, але отримують мало клієнтів з контенту',
      transformation: "Від «пишу але не продаю» → до «кожен пост — крок до покупки»",
      format: 'Аналіз 3 постів → AI-чеклист помилок → підписка на щоденну генерацію',
      uniqueness: 'AI аналізує твій стиль + будує систему контент-воронки на автопілоті',
    },
  },
  {
    id: 'mentor',
    icon: '✦',
    badge: 'МЕНТОР',
    color: '#d4af37',
    glow: 'rgba(212,175,55,0.13)',
    title: 'AI-Ментор: Баланс та ціль',
    result: 'Колесо балансу + персональний план на 7 днів',
    modules: 'A–G',
    finalState: 'Підписка: AI-ментор щодня + тижневий PDF-звіт + Telegram',
    prefill: {
      name: 'AI-Ментор: Баланс та ціль (Starway by Nadya)',
      audience: 'Жінки 25–45, що шукають баланс у житті',
      transformation: 'Від хаосу та виснаження → до ясності, енергії та цілей',
      format: '7 днів безкоштовно → підписка 299/599/999 грн/міс',
      uniqueness: 'Колесо балансу + щоденні питання + тижневий PDF + Telegram Mini App',
    },
  },
] as const;


export const PRODUCER_WIZARD_FIELDS = [
  { key: 'name' as const, label: 'Назва продукту', placeholder: 'AI-Ментор: Баланс та ціль', icon: '📛' },
  { key: 'audience' as const, label: 'Цільова аудиторія', placeholder: 'Хто твій клієнт? Вік, біль, ситуація...', icon: '👥' },
  { key: 'transformation' as const, label: 'Трансформація (А → Б)', placeholder: "Від «проблема» → до «результат»...", icon: '✨' },
  { key: 'format' as const, label: 'Формат та ціна', placeholder: '7 днів безкоштовно, потім 299 грн/міс...', icon: '💰' },
  { key: 'uniqueness' as const, label: 'Унікальність продукту', placeholder: 'Що робить твій продукт особливим...', icon: '🌟' },
] as const;

export type WizardDataKey = typeof PRODUCER_WIZARD_FIELDS[number]['key'];
export type WizardData = Record<WizardDataKey, string>;

export const PRODUCER_BUILD_STEPS = [
  { id: 1, title: 'Концепція продукту', icon: '🎯', tag: 'ПРОДУКТ', desc: 'Ідея, аудиторія, трансформація' },
  { id: 2, title: 'Діагностика / Вхід', icon: '☯️', tag: 'ДІАГНОСТИКА', desc: 'Колесо балансу або вхідна анкета' },
  { id: 3, title: 'AI Воронка (7 днів)', icon: '🔄', tag: 'ВОРОНКА', desc: 'Структура безкоштовного досвіду' },
  { id: 4, title: 'Telegram бот', icon: '📱', tag: 'TELEGRAM', desc: 'Команди, розсилки, нагадування' },
  { id: 5, title: 'PDF-звіт', icon: '📊', tag: 'ЗВІТ', desc: 'Структура автозвіту від AI' },
  { id: 6, title: 'Монетизація', icon: '💎', tag: 'ГРОШІ', desc: 'Тарифи, оффер, тригери конверсії' },
  { id: 7, title: 'Mini App', icon: '🚀', tag: 'MINI APP', desc: 'UI для Telegram WebApp' },
  { id: 8, title: 'Тест у Telegram', icon: '🧪', tag: 'ТЕСТ', desc: 'Запуск на реальній аудиторії' },
] as const;
