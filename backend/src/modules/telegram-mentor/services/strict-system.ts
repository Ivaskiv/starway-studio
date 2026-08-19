import {
AB_TEST_FOCUS_PRICE_1M,
AB_TEST_FOCUS_PRICE_1Y,
AB_TEST_FOCUS_PRICE_3M,
AB_TEST_FOCUS_WEEKLY_TEXT,
} from '../../../products/ab-system/content/abTest.shared.js'

export type StrictTelegramIntent =
  | 'about_focus'
  | 'about_absystem'
  | 'about_course'
  | 'pricing'
  | 'not_ready_to_buy'
  | 'technical_issue'
  | 'general_inquiry'
  | 'out_of_scope'
  | 'unknown'

export type StrictTelegramNextStep =
  | 'show_focus'
  | 'show_absystem'
  | 'contact_nadya'
  | 'continue_chat'

export type StrictTelegramResult = {
  message: string
  intent: StrictTelegramIntent
  confidence: number
  isFallback: boolean
  nextStep: StrictTelegramNextStep
  validationWarning?: string
}

type QuickIntentMatch = {
  intent: StrictTelegramIntent
  confidence: number
}

const STRICT_FALLBACK_MESSAGE =
  'Це не мої компетенції. Напиши Наді, вона відповість персонально.'

const STRICT_KNOWLEDGE_BASE = {
  focus: {
    name: 'ФОКУС',
    summary: AB_TEST_FOCUS_WEEKLY_TEXT,
    format:
      'Це жива група до 15 жінок, де кожна розбирає свою ситуацію через СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.',
    audience:
      'ФОКУС для жінок, які знають що потрібно робити, але не можуть це робити.',
    schedule:
      'У ФОКУСІ є 4 живі Zoom-розбори щомісяця. Точний розклад уточни у Наді.',
    pricing: {
      oneMonth: AB_TEST_FOCUS_PRICE_1M.replace('1 місяць — ', '').replace(' €', '€'),
      threeMonths: AB_TEST_FOCUS_PRICE_3M.replace('3 місяці — ', '').replace(' (23 € / місяць)', '').replace(' €', '€'),
      year: AB_TEST_FOCUS_PRICE_1Y.replace('1 рік — ', '').replace(' (19 € / місяць)', '').replace(' €', '€'),
      savings: '30€',
      abSystemOneMonth: '29€',
      abSystemThreeMonths: '69€',
    },
    guarantee:
      'На перший місяць ФОКУСУ є гарантія повернення грошей, якщо не сподобається.',
    results:
      '1-2 тижні — перші інсайти, 1 місяць — видимі зміни, 3 місяці — стабільна система.',
    nextSteps:
      'Можеш почати з безплатної демо-сесії ФОКУСУ або написати Наді.',
  },
  absystem: {
    summary:
      'ABSystem — це методологія з 5 елементів: СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.',
    outcome:
      'Вона допомагає вийти з петлі "знаю, але не роблю".',
    availability:
      'ABSystem використовується у ФОКУСІ, в ABSystem-платформі та в персональних сесіях з Надею.',
  },
} as const

const OUT_OF_SCOPE_PATTERNS = [
  /квартир|нерухом|будин|іпотек|житл/i,
  /політик|вибор|уряд|президент/i,
  /математ|рівнян|інтеграл|логарифм|таблиц.*множення/i,
  /погод|температур|дощ|сонячно/i,
  /лікар|здоров|медич|діагноз|таблетк/i,
]

const TECHNICAL_PATTERNS = [
  /не працю|помилк|доступ|логін|увійти|не можу зайти/i,
  /оплат.*не|не проходить оплат|payment|wayforpay/i,
]

const FOCUS_PATTERNS = [
  /що таке фокус|фокус це|про фокус/i,
  /zoom.*практик|практик.*zoom|груп|сесі/i,
]

const ABSYSTEM_PATTERNS = [
  /absystem|абсистема|ab system/i,
  /5\s*елемент|стан.*ціль|рішенн.*дія/i,
]

const PRICING_PATTERNS = [/ціна|вартість|коштує|скільки|тариф|євро|eur|€/i]
const NOT_READY_PATTERNS = [
  /не готов|ще не готов|подумаю|подумати|більше інформац|демо/i,
]

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function hasAnyPattern(message: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(message))
}

function mentionsThreeMonths(message: string): boolean {
  return /\b3\b|\bтри\b|\b3-х\b|3\s*місяц/i.test(message)
}

function mentionsOneMonth(message: string): boolean {
  return /\b1\b|\bодин\b|1\s*місяц/i.test(message)
}

function asksExactSchedule(message: string): boolean {
  return /коли|розклад|час|котрій|точн.*час/i.test(message)
}

function asksGuarantee(message: string): boolean {
  return /гарант|повернен.*гро/i.test(message)
}

function asksResults(message: string): boolean {
  return /результ|коли побач|за скільки|коли буде/i.test(message)
}

function asksAudience(message: string): boolean {
  return /для кого|кому підход|хто може/i.test(message)
}

function asksAbsystem(message: string): boolean {
  return hasAnyPattern(message, ABSYSTEM_PATTERNS)
}

function asksFocus(message: string): boolean {
  return hasAnyPattern(message, FOCUS_PATTERNS)
}

function asksPricing(message: string): boolean {
  return hasAnyPattern(message, PRICING_PATTERNS)
}

function resolveIntentFromMessage(message: string): QuickIntentMatch | null {
  if (hasAnyPattern(message, OUT_OF_SCOPE_PATTERNS)) {
    return { intent: 'out_of_scope', confidence: 1 }
  }

  if (hasAnyPattern(message, TECHNICAL_PATTERNS)) {
    return { intent: 'technical_issue', confidence: 1 }
  }

  if (asksPricing(message)) {
    return { intent: 'pricing', confidence: 1 }
  }

  if (asksAbsystem(message)) {
    return { intent: 'about_absystem', confidence: 0.98 }
  }

  if (asksFocus(message) || asksGuarantee(message) || asksResults(message) || asksAudience(message) || asksExactSchedule(message)) {
    return { intent: 'about_focus', confidence: 0.98 }
  }

  if (hasAnyPattern(message, NOT_READY_PATTERNS)) {
    return { intent: 'not_ready_to_buy', confidence: 0.96 }
  }

  return null
}

function buildFocusAnswer(message: string): string {
  if (asksGuarantee(message)) {
    return STRICT_KNOWLEDGE_BASE.focus.guarantee
  }

  if (asksResults(message)) {
    return STRICT_KNOWLEDGE_BASE.focus.results
  }

  if (asksAudience(message)) {
    return STRICT_KNOWLEDGE_BASE.focus.audience
  }

  if (asksExactSchedule(message)) {
    return STRICT_KNOWLEDGE_BASE.focus.schedule
  }

  return [
    STRICT_KNOWLEDGE_BASE.focus.summary,
    STRICT_KNOWLEDGE_BASE.focus.format,
    STRICT_KNOWLEDGE_BASE.focus.audience,
  ].join(' ')
}

function buildPricingAnswer(message: string): string {
  if (mentionsThreeMonths(message)) {
    return `ФОКУС на 3 місяці коштує ${STRICT_KNOWLEDGE_BASE.focus.pricing.threeMonths}. Це економія ${STRICT_KNOWLEDGE_BASE.focus.pricing.savings} в порівнянні з трьома місяцями по ${STRICT_KNOWLEDGE_BASE.focus.pricing.oneMonth}.`
  }

  if (/\bрік\b|12\s*місяц|1\s*рік/i.test(message)) {
    return `ФОКУС на 1 рік коштує ${STRICT_KNOWLEDGE_BASE.focus.pricing.year}.`
  }

  if (mentionsOneMonth(message)) {
    return `ФОКУС на 1 місяць коштує ${STRICT_KNOWLEDGE_BASE.focus.pricing.oneMonth}.`
  }

  if (/absystem/i.test(message)) {
    return `ABSystem коштує ${STRICT_KNOWLEDGE_BASE.focus.pricing.abSystemOneMonth} на 1 місяць або ${STRICT_KNOWLEDGE_BASE.focus.pricing.abSystemThreeMonths} на 3 місяці.`
  }

  return `ФОКУС коштує ${STRICT_KNOWLEDGE_BASE.focus.pricing.oneMonth} на 1 місяць, ${STRICT_KNOWLEDGE_BASE.focus.pricing.threeMonths} на 3 місяці або ${STRICT_KNOWLEDGE_BASE.focus.pricing.year} на 1 рік.`
}

function buildAbsystemAnswer(): string {
  return [
    STRICT_KNOWLEDGE_BASE.absystem.summary,
    STRICT_KNOWLEDGE_BASE.absystem.outcome,
    STRICT_KNOWLEDGE_BASE.absystem.availability,
  ].join(' ')
}

function containsDisallowedPrice(text: string): boolean {
  const matches = text.match(/\d+€/g) ?? []
  const allowed = new Set(['29€', '33€', '69€', '229€', '30€'])
  return matches.some((match) => !allowed.has(match))
}

function containsDisallowedTime(text: string): boolean {
  return /\b\d{1,2}:\d{2}\b/.test(text)
}

function containsUncertainLanguage(text: string): boolean {
  return /\b(можливо|мабуть|напевно|ймовірно|probably|maybe|perhaps)\b/i.test(text)
}

export function validateStrictResponse(result: StrictTelegramResult): StrictTelegramResult {
  if (result.isFallback) {
    return result
  }

  if (containsDisallowedPrice(result.message)) {
    return {
      ...buildStrictFallback(result.intent),
      validationWarning: 'price_validation_failed',
    }
  }

  if (containsDisallowedTime(result.message)) {
    return {
      ...buildStrictFallback(result.intent),
      validationWarning: 'time_validation_failed',
    }
  }

  if (containsUncertainLanguage(result.message)) {
    return {
      ...buildStrictFallback(result.intent),
      validationWarning: 'uncertainty_validation_failed',
    }
  }

  return result
}

export function resolveNextStep(
  intent: StrictTelegramIntent,
  isFallback: boolean,
): StrictTelegramNextStep {
  if (isFallback || intent === 'technical_issue' || intent === 'out_of_scope') {
    return 'contact_nadya'
  }

  if (intent === 'about_absystem') {
    return 'show_absystem'
  }

  if (intent === 'about_focus' || intent === 'pricing' || intent === 'not_ready_to_buy') {
    return 'show_focus'
  }

  return 'continue_chat'
}

export function buildStrictFallback(
  intent: StrictTelegramIntent = 'unknown',
): StrictTelegramResult {
  return {
    message: STRICT_FALLBACK_MESSAGE,
    intent,
    confidence: 1,
    isFallback: true,
    nextStep: resolveNextStep(intent, true),
  }
}

export function quickDetectIntent(message: string): QuickIntentMatch | null {
  return resolveIntentFromMessage(normalizeText(message))
}

export function resolveStrictIntelligenceReply(
  message: string,
  preferredIntent?: StrictTelegramIntent,
): StrictTelegramResult {
  const cleanMessage = normalizeText(message)
  const detected = resolveIntentFromMessage(cleanMessage)
  const intent = preferredIntent && preferredIntent !== 'unknown'
    ? preferredIntent
    : detected?.intent ?? 'unknown'

  let candidate: StrictTelegramResult

  switch (intent) {
    case 'about_focus':
      candidate = {
        message: buildFocusAnswer(cleanMessage),
        intent,
        confidence: 0.98,
        isFallback: false,
        nextStep: resolveNextStep(intent, false),
      }
      break
    case 'pricing':
      candidate = {
        message: buildPricingAnswer(cleanMessage),
        intent,
        confidence: 1,
        isFallback: false,
        nextStep: resolveNextStep(intent, false),
      }
      break
    case 'about_absystem':
      candidate = {
        message: buildAbsystemAnswer(),
        intent,
        confidence: 0.98,
        isFallback: false,
        nextStep: resolveNextStep(intent, false),
      }
      break
    case 'not_ready_to_buy':
      candidate = {
        message: STRICT_KNOWLEDGE_BASE.focus.nextSteps,
        intent,
        confidence: 0.97,
        isFallback: false,
        nextStep: resolveNextStep(intent, false),
      }
      break
    case 'technical_issue':
    case 'out_of_scope':
    case 'about_course':
    case 'general_inquiry':
    case 'unknown':
    default:
      candidate = buildStrictFallback(intent)
      break
  }

  return validateStrictResponse(candidate)
}

export { STRICT_FALLBACK_MESSAGE,STRICT_KNOWLEDGE_BASE }
