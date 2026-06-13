import { AB_TEST_FOCUS_CTA_BLOCK, telegramBlock } from './abTest.shared.js'

// FIX 2025-05-25 B: split Block 12 into msg1 (post-payment) and msg2 (post-channel-join)
export const FOCUS_CHANNEL_URL =
  process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK ??
  process.env.FOCUS_INVITE_LINK ??
  process.env.FOCUS_CHANNEL_INVITE_URL ??
  process.env.TELEGRAM_FOCUS_CHANNEL_INVITE_URL ??
  process.env.FOCUS_TELEGRAM_INVITE_URL ??
  process.env.TELEGRAM_FOCUS_INVITE_URL ??
  ''

export const FOCUS_WELCOME = {
  msg1: {
    body: [
      'Оплата пройшла — вхід у ФОКУС',
      '',
      'Оплата пройшла.',
      'Вітаю, ти у ФОКУСІ.',
      '',
      'Тут ми не будемо просто говорити про зміни.',
      'Раз на тиждень на Zoom-практиці ти будеш дивитись на свою реальну ситуацію:',
      '— що відкладаєш;',
      '— чому переносиш;',
      '— яке рішення не приймаєш;',
      '— який крок треба зробити зараз.',
      '',
      'Ось посилання на закритий канал:',
      '',
      'Перейди і закріпи його, щоб не загубити.',
    ].join('\n'),
    cta: 'Перейти в канал',
    blocks: [
      telegramBlock.text('Оплата пройшла — вхід у ФОКУС'),
      telegramBlock.text('Оплата пройшла.'),
      telegramBlock.text('Вітаю, ти у ФОКУСІ.'),
      telegramBlock.text('Тут ми не будемо просто говорити про зміни. Раз на тиждень на Zoom-практиці ти будеш дивитись на свою реальну ситуацію: що відкладаєш, чому переносиш, яке рішення не приймаєш, який крок треба зробити зараз.'),
      telegramBlock.text('Ось посилання на закритий канал. Перейди і закріпи його, щоб не загубити.'),
      AB_TEST_FOCUS_CTA_BLOCK,
    ],
  },
  msg2: {
    body: [
      '',
      'Ти вже в каналі ФОКУС.',
      '',
      'Що зробити зараз:',
      '1. Прочитай закріплене повідомлення.',
      '2. Подивись дату найближчого Zoom.',
      '3. Напиши собі одну ситуацію, яку хочеш розібрати:',
      '   що саме ти давно відкладаєш.',
      '',
      'На першій практиці ми почнемо саме з цього.',
    ].join('\n'),
    blocks: [
      telegramBlock.text('Ти вже в каналі ФОКУС.'),
      telegramBlock.text('Що зробити зараз:'),
      telegramBlock.text('1. Прочитай закріплене повідомлення.'),
      telegramBlock.text('2. Подивись дату найближчого Zoom.'),
      telegramBlock.text('3. Напиши собі одну ситуацію, яку хочеш розібрати: що саме ти давно відкладаєш.'),
      telegramBlock.text('На першій практиці ми почнемо саме з цього.'),
    ],
  },
} as const

// Backward-compatible alias for existing imports.
export const abTestFocusContent = {
  title: 'FOCUS_WELCOME',
  welcome: {
    body: FOCUS_WELCOME.msg1.body,
    cta: FOCUS_WELCOME.msg1.cta,
  },
  afterJoin: {
    body: FOCUS_WELCOME.msg2.body,
  },
} as const

export const FOCUS_PAYMENT_ISSUE_USER_MSG =
  'Дякуємо, що написала.\n\n' +
  'Ми отримали твій запит і зараз перевіряємо оплату.\n' +
  'Якщо все пройшло — відкриємо доступ найближчим часом.'

export const FOCUS_PAYMENT_ISSUE_NO_USER_MSG =
  'Не вдалося ідентифікувати профіль.\n\n' +
  'Спробуйте ще раз або напишіть нам — розберемось разом.'

export const FOCUS_PAYMENT_ISSUE_COACH_MSG = (params: {
  userId: string
  orderReference: string
  amount: number
}): string =>
  '💳 Учасниця повідомила про проблему з оплатою\n\n' +
  `UserId: ${params.userId}\n` +
  `Order: ${params.orderReference}\n` +
  `Перевір WayForPay — чи пройшла оплата.\n` +
  `Сума: ${params.amount} грн\n` +
  'Якщо підтверджено — натисни кнопку нижче.'

export const FOCUS_ALREADY_ACTIVE_MSG = (inviteUrl: string): string =>
  '✅ <b>Твій доступ до ФОКУСУ активний.</b>\n\n' +
  (inviteUrl
    ? 'Закритий канал:\n' + inviteUrl + '\n\nПерейди і закріпи, щоб не загубити.'
    : 'Натисни кнопку нижче щоб відновити доступ.')

export const FOCUS_RESEND_SUCCESS_MSG =
  'Посилання на канал надіслано повторно.\n' +
  'Якщо не бачиш — перевір папку «Інше» в Telegram.'

export const FOCUS_RESEND_NO_SUB_MSG =
  'Доступ до ФОКУСУ ще не активовано.\n\n' +
  'Якщо ти вже оплатила — натисни «⚠️ Проблема з оплатою».\n' +
  'Ми перевіримо і відкриємо доступ.'

export const FOCUS_RESEND_MISSING_USER_MSG =
  'Не вдалося відновити доступ: користувача не знайдено.'
