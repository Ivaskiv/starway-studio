import {
  AB_TEST_FOCUS_CTA_BLOCK,
  AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT,
  AB_TEST_FOCUS_REAL_SITUATION_INLINE,
  AB_TEST_FOCUS_TARIFF_BLOCKS,
  AB_TEST_FOCUS_WEEKLY_TEXT,
  AB_TEST_FOCUS_PRICE_1M,
  AB_TEST_FOCUS_PRICE_3M,
  telegramBlock,
} from './abTest.shared.js'

// ТЗ Блоки 15-21 — Меню та FAQ-відповіді
// Єдине джерело правди для всіх FAQ повідомлень бота.
// Handlers НЕ авторять тексти — тільки читають звідси.

// ── Блок 15: Головне меню бота ───────────────────────────────
export const MAIN_MENU = {
  items: [
    {
      label: 'Пройти тест',
      callbackData: 'ab_test:intro',
      description: 'Запустити тест-воронку',
    },
    {
      label: 'Дізнатись про ФОКУС',
      callbackData: 'ab_test:focus_info',
      description: 'Показати опис ФОКУСУ',
    },
    {
      label: 'Оплатити ФОКУС',
      callbackData: 'open_focus_payment',
      description: 'Показати кнопки оплати',
    },
    {
      label: 'Я вже оплатила',
      callbackData: 'check_payment_status',
      description: 'Перевірити статус і дати посилання',
    },
    {
      label: 'Задати питання',
      callbackData: 'open_faq',
      description: 'FAQ або зв\'язок з адміном',
    },
  ],
} as const

// ── Блок 16: «Що таке ФОКУС?» ────────────────────────────────
export const FAQ_WHAT_IS_FOCUS = {
  trigger: 'Що таке ФОКУС?',
  callbackData: 'faq:what_is_focus',
  text: [
    `${AB_TEST_FOCUS_WEEKLY_TEXT} за системою AB System.`,
    '',
    'Ти приходиш із реальною ситуацією:',
    '',
    'що давно відкладаєш, яке рішення переносиш, яка ціль не рухається.',
    '',
    'На практиці ми дивимось, чому це повторюється,',
    'і доводимо до одного конкретного кроку на тиждень.',
    '',
    AB_TEST_FOCUS_PRICE_1M,
    AB_TEST_FOCUS_PRICE_3M,
  ].join('\n'),
  cta: AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT,
  ctaCallback: 'open_focus_payment',
  blocks: [
    telegramBlock.text(`${AB_TEST_FOCUS_WEEKLY_TEXT} за системою AB System.`),
    telegramBlock.text(AB_TEST_FOCUS_REAL_SITUATION_INLINE),
    telegramBlock.text('На практиці ми дивимось, чому це повторюється, і доводимо до одного конкретного кроку на тиждень.'),
    ...AB_TEST_FOCUS_TARIFF_BLOCKS,
    AB_TEST_FOCUS_CTA_BLOCK,
  ],
} as const

// ── Блок 17: «Кому підходить?» ───────────────────────────────
export const FAQ_WHO_IS_IT_FOR = {
  trigger: 'Кому підходить?',
  callbackData: 'faq:who_is_it_for',
  text: [
    'ФОКУС підійде тобі, якщо ти:',
    '— давно відкладаєш важливе;',
    '— не можеш прийняти рішення;',
    '— починаєш і знову зупиняєшся;',
    '— багато думаєш, але не доходиш до кроку;',
    '— хочеш розібрати свою ситуацію на практиці,',
    '  а не просто читати ще один текст.',
  ].join('\n'),
  cta: null,
  ctaCallback: null,
} as const

// ── Блок 18: «Кому не підходить?» ───────────────────────────
export const FAQ_WHO_IS_IT_NOT_FOR = {
  trigger: 'Кому не підходить?',
  callbackData: 'faq:who_is_it_not_for',
  text: [
    'ФОКУС не підійде, якщо ти хочеш, щоб хтось вирішив усе за тебе.',
    '',
    'Тут не буде чарівної поради.',
    'Ми будемо дивитись на твою реальну ситуацію і працювати з нею:',
    '— що відкладаєш,',
    '— чому переносиш,',
    '— яке рішення не приймаєш,',
    '— який крок треба зробити зараз.',
  ].join('\n'),
  cta: null,
  ctaCallback: null,
} as const

// ── Блок 19: «Якщо не зможу бути на Zoom?» ──────────────────
export const FAQ_ZOOM_RECORDING = {
  trigger: 'Якщо не зможу бути на Zoom?',
  callbackData: 'faq:zoom_recording',
  text: [
    'Якщо не зможеш бути наживо, ти зможеш подивитись запис.',
    '',
    'Але краще приходити наживо.',
    'Бо на практиці ти не просто слухаєш.',
    'Ти береш свою ситуацію і працюєш із нею одразу.',
  ].join('\n'),
  cta: null,
  ctaCallback: null,
} as const

// ── Блок 20: «Чим ФОКУС відрізняється від курсу?» ───────────
export const FAQ_FOCUS_VS_COURSE = {
  trigger: 'Чим ФОКУС відрізняється від курсу?',
  callbackData: 'faq:focus_vs_course',
  text: [
    'Курс ти проходиш у своєму темпі.',
    'ФОКУС — це живі практики раз на тиждень.',
    '',
    'Тут важливо не просто отримати інформацію,',
    'а прийти, подивитись на свою ситуацію',
    'і вийти з конкретним кроком.',
  ].join('\n'),
  cta: null,
  ctaCallback: null,
  blocks: [
    telegramBlock.text('Курс ти проходиш у своєму темпі.'),
    telegramBlock.text('ФОКУС — це живі практики раз на тиждень.'),
    telegramBlock.text('Тут важливо не просто отримати інформацію, а прийти, подивитись на свою ситуацію і вийти з конкретним кроком.'),
  ],
} as const

// ── Блок 21: «Що буде після ФОКУСУ?» ────────────────────────
export const FAQ_AFTER_FOCUS = {
  trigger: 'Що буде після ФОКУСУ?',
  callbackData: 'faq:after_focus',
  text: [
    'Після ФОКУСУ для учасників відкривається перехід в ABSystem AI.',
    '',
    'Це платформа, яка веде тебе щодня між Zoom-практиками:',
    '— допомагає прописати цілі,',
    '— зібрати стратегію,',
    '— проходити колесо балансу,',
    '— відстежувати кроки,',
    '— бачити, де ти знову переносиш важливе.',
    '',
    'Але в платформу можна перейти тільки після входу у ФОКУС.',
  ].join('\n'),
  cta: null,
  ctaCallback: null,
  blocks: [
    telegramBlock.text('Після ФОКУСУ для учасників відкривається перехід в ABSystem AI.'),
    telegramBlock.text('Це платформа, яка веде тебе щодня між Zoom-практиками: допомагає прописати цілі, зібрати стратегію, проходити колесо балансу, відстежувати кроки, бачити, де ти знову переносиш важливе.'),
    telegramBlock.text('Але в платформу можна перейти тільки після входу у ФОКУС.'),
  ],
} as const

// ── Загальний реєстр FAQ ─────────────────────────────────────
export const FAQ_ITEMS = [
  FAQ_WHAT_IS_FOCUS,
  FAQ_WHO_IS_IT_FOR,
  FAQ_WHO_IS_IT_NOT_FOR,
  FAQ_ZOOM_RECORDING,
  FAQ_FOCUS_VS_COURSE,
  FAQ_AFTER_FOCUS,
] as const

export type FaqCallbackData =
  | 'faq:what_is_focus'
  | 'faq:who_is_it_for'
  | 'faq:who_is_it_not_for'
  | 'faq:zoom_recording'
  | 'faq:focus_vs_course'
  | 'faq:after_focus'

export function getFaqItem(callbackData: FaqCallbackData) {
  return FAQ_ITEMS.find(item => item.callbackData === callbackData) ?? null
}

export function buildFaqKeyboard(): { inline_keyboard: { text: string; callback_data: string }[][] } {
  return {
    inline_keyboard: FAQ_ITEMS.map(item => [{ text: item.trigger, callback_data: item.callbackData }]),
  }
}
