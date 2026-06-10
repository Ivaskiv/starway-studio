export type SubscriptionLifecycleState =
  | 'inactive'
  | 'trial'
  | 'active'
  | 'paused'
  | 'expired'
  | 'completed'
  | 'winback'
  | 'upsellReady'

export type SubscriptionTierId = 'starter' | 'growth' | 'architect'
export type SubscriptionProductId = 'focus' | 'stankey' | 'absystem'

type LocalizedBlock = {
  subtitleSection: string
  title: string
  text: string[]
  note: string[]
}

type SubscriptionCtaLabels = {
  start: string
  continue: string
  restore: string
  upgrade: string
  buy: string
  open: string
  resume: string
  activateTrial: string
  continueLesson: string
  openRoom: string
}

type SubscriptionTelegramCopy = {
  welcome: string[]
  paymentSuccess: string[]
  pausedAccess: string[]
  trialStarted: string[]
  trialEnding: string[]
  subscriptionExpired: string[]
  winback: string[]
  upsell: string[]
  continueFlow: string[]
}

type SubscriptionLifecycleCopy = Record<SubscriptionLifecycleState, string[]>

type SubscriptionTier = {
  id: SubscriptionTierId
  title: string
  subtitle: string
  description: string
  shortDescription: string
  priceLabel: string
  currency: string
  priceValue: number
  durationDays: number | null
  trial: string | null
  badges: string[]
  cta: string
  paymentUrl: string
  access: string[]
}

type SubscriptionProduct = {
  id: SubscriptionProductId
  title: string
  subtitle: string
  description: string
  shortDescription: string
  heroTitle: string
  heroSubtitle: string
  heroDescription: string
  features: string[]
  results: string[]
  problems: string[]
  format: string[]
  audience: string[]
  priceLabel: string
  paymentUrl: string
  trial: string
  badges: string[]
  cta: string[]
  telegram: {
    welcome: string[]
    paymentSuccess: string[]
    pausedAccess: string[]
    trialStarted: string[]
    trialEnding: string[]
    subscriptionExpired: string[]
    winback: string[]
    upsell: string[]
    continueFlow: string[]
  }
  landing: {
    hero: LocalizedBlock
    about: LocalizedBlock
    cta: LocalizedBlock
  }
  retention: string[]
  upsell: string[]
  winback: string[]
  navigation: {
    publicRoute: string
    appRoute: string
    miniAppRoute: string
    subscriptionRoute: string
  }
  access: {
    entryProducts: SubscriptionProductId[]
    includedProducts: SubscriptionProductId[]
    recommendedUpsells: SubscriptionProductId[]
    lifecycleStates: SubscriptionLifecycleState[]
  }
  analytics: {
    productOpened: string
    checkoutOpened: string
    paymentSucceeded: string
    paymentFailed: string
    trialActivated: string
    accessRestored: string
    winbackShown: string
  }
}

type SubscriptionsContent = {
  labels: {
    product: string
    tier: string
    pricing: string
    access: string
    lifecycle: string
  }
  cta: SubscriptionCtaLabels
  lifecycle: SubscriptionLifecycleCopy
  onboarding: {
    telegram: string[]
    landing: string[]
    product: string[]
  }
  telegram: SubscriptionTelegramCopy
  landing: {
    hero: LocalizedBlock
    onboarding: LocalizedBlock
    paywall: LocalizedBlock
    retention: LocalizedBlock
  }
  pricing: {
    currency: 'EUR'
    tiers: Record<SubscriptionTierId, SubscriptionTier>
  }
  tiers: Record<SubscriptionTierId, SubscriptionTier>
  products: Record<SubscriptionProductId, SubscriptionProduct>
  entryProducts: SubscriptionProductId[]
  includedProducts: SubscriptionProductId[]
  recommendedUpsells: Record<SubscriptionProductId, SubscriptionProductId[]>
  relationMap: {
    entryProducts: SubscriptionProductId[]
    includedProducts: SubscriptionProductId[]
    recommendedUpsells: Record<SubscriptionProductId, SubscriptionProductId[]>
  }
  analytics: {
    funnelStages: string[]
    leadStages: string[]
    salesStages: string[]
  }
}

const CTA: SubscriptionCtaLabels = {
  start: 'Почати',
  continue: 'Продовжити',
  restore: 'Повернути доступ',
  upgrade: 'Наступний рівень',
  buy: 'Придбати',
  open: 'Відкрити',
  resume: 'Повернутись',
  activateTrial: 'Запустити пробний ритм',
  continueLesson: 'Продовжити урок',
  openRoom: 'Відкрити кімнату',
}

const lifecycle: SubscriptionLifecycleCopy = {
  inactive: [
    'Доступ ще не активований.',
    'Показуємо, з чого краще почати саме зараз.',
  ],
  trial: [
    'Триває пробний ритм.',
    'Тримай один зрозумілий крок і повертайся до практики.',
  ],
  active: [
    'Активний ритм.',
    'Показуємо продовження, прогрес і наступний крок.',
  ],
  paused: [
    'Ритм на паузі.',
    'Показуємо, як повернутись без втрати прогресу.',
  ],
  expired: [
    'Ритм призупинився.',
    'Показуємо м’яке повернення і збережений контекст.',
  ],
  completed: [
    'Продукт завершено.',
    'Показуємо результат, утримання і наступний рівень.',
  ],
  winback: [
    'Повернення в ритм.',
    'Показуємо шлях назад без втрати прогресу.',
  ],
  upsellReady: [
    'Готовність до наступного кроку.',
    'Показуємо наступний рівень після вже досягнутого результату.',
  ],
}

const telegramCopy: SubscriptionTelegramCopy = {
  welcome: [
    'Ласкаво просимо до продуктового Telegram-ритму.',
    'Показуємо лише релевантний доступ і наступний крок.',
  ],
  paymentSuccess: [
    'Оплата успішна.',
    'Доступ активовано і наступний крок уже відкрито.',
  ],
  pausedAccess: [
    'Твій ритм і прогрес збережені.',
    'Щоб повернути доступ, віднови ритм.',
  ],
  trialStarted: [
    'Пробний ритм активовано.',
    'Починай з першого кроку без зайвого шуму.',
  ],
  trialEnding: [
    'Пробний ритм завершується.',
    'Пора перейти до наступного кроку або повернутися пізніше.',
  ],
  subscriptionExpired: [
    'Ритм завершився.',
    'Можна повернути доступ без втрати прогресу.',
  ],
  winback: [
    'Повертаємо тебе в ритм.',
    'Прогрес і історія збережені.',
  ],
  upsell: [
    'Є наступний рівень.',
    'Показуємо upgrade лише коли він справді доречний.',
  ],
  continueFlow: [
    'Продовжуємо з того місця, де ти зупинилася.',
    'Без повторного нав’язливого продажу.',
  ],
}

const pricingTiers: Record<SubscriptionTierId, SubscriptionTier> = {
  starter: {
    id: 'starter',
    title: 'Starter',
    subtitle: 'Entry product',
    description: 'Легкий вхід у продукт без перевантаження.',
    shortDescription: 'Початковий доступ для першого контакту з продуктом.',
    priceLabel: 'EUR 15 / month',
    currency: 'EUR',
    priceValue: 15,
    durationDays: 30,
    trial: '7 days trial',
    badges: ['entry', 'telegram-ready'],
    cta: CTA.activateTrial,
    paymentUrl: 'https://secure.wayforpay.com/button/be85c6dcb9587',
    access: ['focus'],
  },
  growth: {
    id: 'growth',
    title: 'Growth',
    subtitle: 'Core product',
    description: 'Підписка для регулярного користування та росту.',
    shortDescription: 'Основний продукт з retention and upgrade path.',
    priceLabel: 'EUR 19 / month',
    currency: 'EUR',
    priceValue: 19,
    durationDays: 30,
    trial: '7 days trial',
    badges: ['core', 'upgrade-ready'],
    cta: CTA.buy,
    paymentUrl: 'https://secure.wayforpay.com/button/be85c6dcb9588',
    access: ['absystem', 'focus'],
  },
  architect: {
    id: 'architect',
    title: 'Architect',
    subtitle: 'Premium product',
    description: 'Максимальний рівень доступу, winback і upsell ready.',
    shortDescription: 'Розширений доступ для premium retention.',
    priceLabel: 'EUR 49 / month',
    currency: 'EUR',
    priceValue: 49,
    durationDays: 30,
    trial: null,
    badges: ['premium', 'lifecycle-driven'],
    cta: CTA.upgrade,
    paymentUrl: 'https://secure.wayforpay.com/button/be85c6dcb9588',
    access: ['stankey', 'absystem', 'focus'],
  },
}

const products: Record<SubscriptionProductId, SubscriptionProduct> = {
  focus: {
    id: 'focus',
    title: 'FOCUS',
    subtitle: 'Landing product',
    description: 'Щотижневі живі практики рішень.',
    shortDescription: 'Entry landing and subscription product.',
    heroTitle: 'ФОКУС',
    heroSubtitle: 'Nadya by Starway',
    heroDescription: 'Закритий канал із живими Zoom-практиками та чітким rhythm of decisions.',
    features: ['живі практики', 'розбір ситуацій', 'щотижневий rhythm'],
    results: ['менше напруги', 'більше ясності', 'конкретні дії'],
    problems: ['гроші', 'напруга', 'відкладені рішення'],
    format: ['Telegram', 'Zoom', 'weekly practice'],
    audience: ['люди, які хочуть ясності', 'люди в напрузі', 'люди з відкладеними рішеннями'],
    priceLabel: 'EUR 15 / month',
    paymentUrl: 'https://secure.wayforpay.com/button/be85c6dcb9587',
    trial: '7 days',
    badges: ['landing', 'entry'],
    cta: [CTA.start, CTA.buy, CTA.open],
    telegram: telegramCopy,
    landing: {
      hero: {
        subtitleSection: 'Landing',
        title: 'FOCUS landing',
        text: ['Premium public landing surface.', 'Use only for acquisition and conversion.'],
        note: ['Telegram and AI sales logic should reference this block.'],
      },
      about: {
        subtitleSection: 'About',
        title: 'Why FOCUS exists',
        text: ['A concise entry point for the subscription funnel.'],
        note: ['Lifecycle and retention notes are centralized here.'],
      },
      cta: {
        subtitleSection: 'CTA',
        title: 'Join FOCUS',
        text: ['Public conversion block.', 'Keep it concise and high-trust.'],
        note: ['Landing copy only.'],
      },
    },
    retention: ['return to practice', 'keep progress visible'],
    upsell: ['upgrade to core', 'add premium access'],
    winback: ['restore subscription', 'resume the rhythm'],
    navigation: {
      publicRoute: '/focus',
      appRoute: '/app/dashboard',
      miniAppRoute: '/miniapp/zoom-calendar',
      subscriptionRoute: '/app/dashboard/subscription',
    },
    access: {
      entryProducts: ['focus'],
      includedProducts: ['focus'],
      recommendedUpsells: ['absystem', 'stankey'],
      lifecycleStates: ['inactive', 'trial', 'active', 'paused', 'expired', 'winback', 'upsellReady'],
    },
    analytics: {
      productOpened: 'focus_opened',
      checkoutOpened: 'focus_checkout_opened',
      paymentSucceeded: 'focus_payment_succeeded',
      paymentFailed: 'focus_payment_failed',
      trialActivated: 'focus_trial_activated',
      accessRestored: 'focus_access_restored',
      winbackShown: 'focus_winback_shown',
    },
  },
  stankey: {
    id: 'stankey',
    title: 'STANKEY',
    subtitle: 'Telegram product',
    description: 'Isolated Telegram product for course and mentor delivery.',
    shortDescription: 'Telegram-first course product with progress and lessons.',
    heroTitle: 'Стан – ключ до успіху',
    heroSubtitle: 'Практичний міні-курс',
    heroDescription: 'Telegram-first sequence with lessons, progress, streak and restoration flow.',
    features: ['перший урок', 'streak', 'progress', 'restore access'],
    results: ['перший матеріал', 'підписка', 'стійкий прогрес'],
    problems: ['немає ритму', 'немає першого уроку', 'потрібне відновлення доступу'],
    format: ['Telegram', 'mini-course', 'lesson sequence'],
    audience: ['ті, хто входять через Telegram', 'ті, кому потрібен короткий курс', 'ті, хто відновлюють доступ'],
    priceLabel: 'EUR 19 / month',
    paymentUrl: 'https://secure.wayforpay.com/button/be85c6dcb9588',
    trial: '7 days',
    badges: ['telegram', 'course'],
    cta: [CTA.continueLesson, CTA.restore, CTA.openRoom],
    telegram: telegramCopy,
    landing: {
      hero: {
        subtitleSection: 'Telegram course',
        title: 'STANKEY entry',
        text: ['Course activation copy for Telegram product.', 'Use for acquisition and onboarding.'],
        note: ['Telegram content only.'],
      },
      about: {
        subtitleSection: 'About',
        title: 'How STANKEY works',
        text: ['Short course entry with sequential delivery and restoration path.'],
        note: ['AI sales logic can reference this block.'],
      },
      cta: {
        subtitleSection: 'CTA',
        title: 'Open first lesson',
        text: ['Product-first CTA for Telegram course delivery.'],
        note: ['Keep the copy short and direct.'],
      },
    },
    retention: ['continue practice', 'preserve lesson progress'],
    upsell: ['upgrade to absystem', 'expand into focus'],
    winback: ['restore access', 'continue from saved lesson'],
    navigation: {
      publicRoute: '/telegram',
      appRoute: '/app/dashboard',
      miniAppRoute: '/miniapp/library',
      subscriptionRoute: '/app/dashboard/subscription',
    },
    access: {
      entryProducts: ['stankey'],
      includedProducts: ['stankey'],
      recommendedUpsells: ['absystem', 'focus'],
      lifecycleStates: ['inactive', 'trial', 'active', 'paused', 'expired', 'completed', 'winback', 'upsellReady'],
    },
    analytics: {
      productOpened: 'stankey_opened',
      checkoutOpened: 'stankey_checkout_opened',
      paymentSucceeded: 'stankey_payment_succeeded',
      paymentFailed: 'stankey_payment_failed',
      trialActivated: 'stankey_trial_activated',
      accessRestored: 'stankey_access_restored',
      winbackShown: 'stankey_winback_shown',
    },
  },
  absystem: {
    id: 'absystem',
    title: 'ABsystem',
    subtitle: 'AI sales product',
    description: 'Core product for mentor/sales-agent flows.',
    shortDescription: 'Core subscription and AI sales workspace.',
    heroTitle: 'ABsystem',
    heroSubtitle: 'Core product',
    heroDescription: 'Operational product for AI, sales, and mentor workflows.',
    features: ['AI mentor', 'sales logic', 'core subscription'],
    results: ['retention', 'upsell readiness', 'life-cycle continuity'],
    problems: ['manual follow-up', 'lost context', 'scattered funnel state'],
    format: ['Telegram', 'workspace', 'subscription'],
    audience: ['active users', 'trial users', 'paused users'],
    priceLabel: 'EUR 29 / month',
    paymentUrl: 'https://secure.wayforpay.com/button/be85c6dcb9587',
    trial: '7 days',
    badges: ['core', 'ai-sales'],
    cta: [CTA.continue, CTA.resume, CTA.upgrade],
    telegram: telegramCopy,
    landing: {
      hero: {
        subtitleSection: 'Core',
        title: 'ABsystem entry',
        text: ['Central AI sales / mentor product copy.'],
        note: ['AI sales logic and lifecycle states reference this block.'],
      },
      about: {
        subtitleSection: 'About',
        title: 'Core subscription',
        text: ['The main subscription layer for ongoing access.'],
        note: ['Use for retention and upgrade copy.'],
      },
      cta: {
        subtitleSection: 'CTA',
        title: 'Continue in ABsystem',
        text: ['Subscription CTA for active or paused users.'],
        note: ['Lifecycle-driven copy only.'],
      },
    },
    retention: ['preserve stats', 'keep streak history', 'continue from saved state'],
    upsell: ['move to architect', 'unlock premium flows'],
    winback: ['restore active access', 'resume mentor sessions'],
    navigation: {
      publicRoute: '/telegram',
      appRoute: '/app/dashboard',
      miniAppRoute: '/miniapp/mentor',
      subscriptionRoute: '/app/dashboard/subscription',
    },
    access: {
      entryProducts: ['absystem'],
      includedProducts: ['absystem', 'focus'],
      recommendedUpsells: ['stankey', 'focus'],
      lifecycleStates: ['inactive', 'trial', 'active', 'paused', 'expired', 'completed', 'winback', 'upsellReady'],
    },
    analytics: {
      productOpened: 'absystem_opened',
      checkoutOpened: 'absystem_checkout_opened',
      paymentSucceeded: 'absystem_payment_succeeded',
      paymentFailed: 'absystem_payment_failed',
      trialActivated: 'absystem_trial_activated',
      accessRestored: 'absystem_access_restored',
      winbackShown: 'absystem_winback_shown',
    },
  },
}

export const subscriptionsContent: SubscriptionsContent = {
  labels: {
    product: 'Product',
    tier: 'Tier',
    pricing: 'Pricing',
    access: 'Access',
    lifecycle: 'Lifecycle',
  },
  cta: CTA,
  lifecycle,
  onboarding: {
    telegram: [
      'Telegram onboarding block.',
      'Show only product-specific next steps.',
    ],
    landing: [
      'Landing onboarding block.',
      'Keep it conversion-focused and concise.',
    ],
    product: [
      'Product onboarding block.',
      'Use for step-by-step access restoration or first lesson flow.',
    ],
  },
  telegram: telegramCopy,
  landing: {
    hero: {
      subtitleSection: 'Landing',
      title: 'Subscription landing',
      text: ['Central landing copy for subscription acquisition.'],
      note: ['Public-facing blocks only.'],
    },
    onboarding: {
      subtitleSection: 'Onboarding',
      title: 'Subscription onboarding',
      text: ['Use for web and Telegram onboarding prompts.'],
      note: ['Lifecycle-driven blocks.'],
    },
    paywall: {
      subtitleSection: 'Paywall',
      title: 'Paywall copy',
      text: ['Use when access is inactive or expired.'],
      note: ['Support restore and upgrade prompts.'],
    },
    retention: {
      subtitleSection: 'Retention',
      title: 'Retention copy',
      text: ['Keep progress visible and next step clear.'],
      note: ['Lifecycle-driven copy.'],
    },
  },
  pricing: {
    currency: 'EUR',
    tiers: pricingTiers,
  },
  tiers: pricingTiers,
  products,
  entryProducts: ['focus', 'stankey', 'absystem'],
  includedProducts: ['focus', 'stankey', 'absystem'],
  recommendedUpsells: {
    focus: ['absystem', 'stankey'],
    stankey: ['absystem', 'focus'],
    absystem: ['stankey', 'focus'],
  },
  relationMap: {
    entryProducts: ['focus', 'stankey', 'absystem'],
    includedProducts: ['focus', 'stankey', 'absystem'],
    recommendedUpsells: {
      focus: ['absystem', 'stankey'],
      stankey: ['absystem', 'focus'],
      absystem: ['stankey', 'focus'],
    },
  },
  analytics: {
    funnelStages: ['entry', 'trial', 'active', 'paused', 'expired', 'winback'],
    leadStages: ['lead_magnet', 'waitlist', 'trial_offer', 'paywall'],
    salesStages: ['upsell', 'retention', 'restore_access', 'activate_trial'],
  },
}
