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
  },
  msg2: {
    body: [
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
