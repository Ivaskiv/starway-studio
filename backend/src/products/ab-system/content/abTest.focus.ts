import {
  AB_TEST_FOCUS_CTA_BLOCK,
  AB_TEST_JOIN_CHANNEL_BUTTON_TEXT,
  telegramBlock,
} from './abTest.shared.js'

// FIX 2025-05-25 B: split Block 12 into msg1 (post-payment) and msg2 (post-channel-join)
export const FOCUS_CHANNEL_URL =
  process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK ??
  process.env.FOCUS_INVITE_LINK ??
  process.env.FOCUS_CHANNEL_INVITE_URL ??
  process.env.TELEGRAM_FOCUS_CHANNEL_INVITE_URL ??
  process.env.FOCUS_TELEGRAM_INVITE_URL ??
  process.env.TELEGRAM_FOCUS_INVITE_URL ??
  ''

const FOCUS_WELCOME_FALLBACK_GREETING = 'Вітаю'

export function buildFocusWelcomeMessage(
  firstName?: string | null,
  inviteLink?: string | null,
): string {
  const safeFirstName = String(firstName ?? '').trim()
  const greeting = safeFirstName
    ? `Вітаю, ${safeFirstName}`
    : FOCUS_WELCOME_FALLBACK_GREETING
  const channelLine = String(inviteLink ?? '').trim()

  return [
    greeting,
    '',
    '<b>Оплата пройшла успішно — ти у ФОКУСІ.</b>',
    '',
    'Тут ми не будемо просто говорити про зміни.',
    '',
    'Раз на тиждень на Zoom-практиці ти будеш дивитись на свою реальну ситуацію:',
    '',
    '— що відкладаєш',
    '— чому переносиш',
    '— яке рішення не приймаєш',
    '— який крок треба зробити зараз',
    '',
    '<b>Тепер справа за діями.</b>',
    '',
    'Ось закритий канал:',
    ...(channelLine ? [channelLine] : []),
    '',
    'Не відкладай — все важливе буде саме там.',
    'Закріпи канал, щоб не шукати потім.',
    '',
    'Там будуть:',
    '',
    '— Zoom-посилання',
    '— нагадування',
    '— всі наступні кроки',
  ].join('\n')
}

const FOCUS_WELCOME_MSG2_TITLE = 'Ти вже в каналі ФОКУС.'
const FOCUS_WELCOME_MSG2_STEPS_HEADER = 'Що зробити зараз:'
const FOCUS_WELCOME_MSG2_STEPS = [
  '— відкрий календар Zoom',
  '— обери найближчу практику',
  '— запиши ситуацію, яку хочеш розібрати',
] as const
const FOCUS_WELCOME_MSG2_FOOTER =
  'На найближчій практиці почнемо саме з цього.'

export const FOCUS_WELCOME = {
  msg1: {
    body: buildFocusWelcomeMessage(),
    cta: 'Відкрити канал',
    blocks: [
      telegramBlock.text(buildFocusWelcomeMessage()),
      AB_TEST_FOCUS_CTA_BLOCK,
    ],
  },
  msg2: {
    body: [
      `<b>${FOCUS_WELCOME_MSG2_TITLE}</b>`,
      '',
      'Доступ уже відкритий.',
      '',
      FOCUS_WELCOME_MSG2_STEPS_HEADER,
      ...FOCUS_WELCOME_MSG2_STEPS,
      '',
      FOCUS_WELCOME_MSG2_FOOTER,
      '',
      'Нижче кнопки: повернутись у канал або одразу записатись на Zoom.',
    ].join('\n'),
    blocks: [
      telegramBlock.text(FOCUS_WELCOME_MSG2_TITLE),
      telegramBlock.text(FOCUS_WELCOME_MSG2_STEPS_HEADER),
      ...FOCUS_WELCOME_MSG2_STEPS.map((line) => telegramBlock.text(line)),
      telegramBlock.text(FOCUS_WELCOME_MSG2_FOOTER),
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
