//backend/src/products/ab-system/content/abTest.shared.ts

export const AB_TEST_START_BUTTON_TEXT = 'Почати тест'
export const AB_TEST_CONTINUE_BUTTON_TEXT = 'Продовжити тест'
export const AB_TEST_CONTINUE_SHORT_BUTTON_TEXT = 'Продовжити'
export const AB_TEST_OPEN_FOCUS_BUTTON_TEXT = 'Хочу у ФОКУС'
export const AB_TEST_PAY_1M_BUTTON_TEXT = 'Оплатити 1 місяць'
export const AB_TEST_PAY_3M_BUTTON_TEXT = 'Оплатити 3 місяці'
export const AB_TEST_JOIN_CHANNEL_BUTTON_TEXT = 'Перейти в канал'
export const AB_TEST_OPEN_ZOOM_BUTTON_TEXT = 'Відкрити Zoom'
export const AB_TEST_OPEN_PLATFORM_BUTTON_TEXT = 'Відкрити платформу'

export const abTestContent = {
  meta: {
    productId: 'absystem',
    funnelId: 'ab_test',
  },
  buttons: {
    startTest: AB_TEST_START_BUTTON_TEXT,
    continueTest: AB_TEST_CONTINUE_BUTTON_TEXT,
    restoreProgress: AB_TEST_CONTINUE_SHORT_BUTTON_TEXT,
    openFocus: AB_TEST_OPEN_FOCUS_BUTTON_TEXT,
    payFocus1m: AB_TEST_PAY_1M_BUTTON_TEXT,
    payFocus3m: AB_TEST_PAY_3M_BUTTON_TEXT,
    joinChannel: AB_TEST_JOIN_CHANNEL_BUTTON_TEXT,
    openZoom: AB_TEST_OPEN_ZOOM_BUTTON_TEXT,
    openPlatform: AB_TEST_OPEN_PLATFORM_BUTTON_TEXT,
    continueFlow: AB_TEST_CONTINUE_SHORT_BUTTON_TEXT,
    answerState: 'Стан',
    answerGoal: 'Ціль',
    answerChoice: 'Вибір',
    answerDecision: 'Рішення',
    answerAction: 'Дія',
  },
  entry: {
    title: '',
    intro: [
      'У тесті буде 8 питань.',
      '',
      'Обирай той варіант який найбільше схожий на тебе зараз.',
      '',
      'Не треба відповідати "правильно". Треба чесно.',
    ],
    resume: [],
  },
  progress: {
    label: '',
    stepPrefix: '',
    resumeHint: '',
    completionHint: '',
  },
  restore: {
    title: 'Прогрес збережено',
    body: [
      'Ми відновили останній збережений крок тесту.',
      'Можеш продовжити з того місця, де зупинився/лася.',
    ],
  },
  errors: {
    stale: [
      'Дякую, бачу твою дію.',
      'Повертаю нас до поточного запитання.',
    ],
    invalid: ['Не вдалося розпізнати дію.', 'Повертаюсь до поточного кроку.'],
    retry: ['Спробуй ще раз за кілька секунд.', 'Прогрес уже збережений.'],
  },
  menu: {
    title: '',
    body: [
      'Повертаємось до твоєї діагностики з поточного кроку.',
    ],
  },
} as const

// export const abTestPlatformContent = {
//   bridge: {
//     title: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT_TITLE,
//     body: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT,
//     cta: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT_CTA,
//   },
// } as const

export const abTestMenuContent = {
  title: '',
  body: 'Повертаємось до діалогу. Обери, як тобі зручніше продовжити.',
  cta: {
    start: abTestContent.buttons.startTest,
    restore: abTestContent.buttons.restoreProgress,
    continue: abTestContent.buttons.continueTest,
  },
} as const

export const AB_TEST_NEONILA_REVIEW_HEADER = 'Неоніла написала після практики:'
export const AB_TEST_NATALIIA_REVIEW_HEADER = 'Наталія написала після практики:'
export const AB_TEST_VALENTYNA_REVIEW_HEADER = 'Валентина написала після практики:'
export const AB_TEST_YELYZAVETA_REVIEW_HEADER = 'Єлизавета написала після роботи зі мною:'
export const AB_TEST_KSENIIA_REVIEW_HEADER = 'Ксенія написала після роботи зі мною:'

export const AB_TEST_REVIEW_HEADERS = [
  AB_TEST_NEONILA_REVIEW_HEADER,
  AB_TEST_NATALIIA_REVIEW_HEADER,
  AB_TEST_VALENTYNA_REVIEW_HEADER,
  AB_TEST_YELYZAVETA_REVIEW_HEADER,
  AB_TEST_KSENIIA_REVIEW_HEADER,
] as const

export const AB_TEST_NEONILA_REVIEW_QUOTE =
  '"Зранку стала як побита. А потім згадала як Надя казала — що це я обираю як пройде мій день. Поміняла пластинку в голові і всьо заграло новими барвами."'
export const AB_TEST_NATALIIA_REVIEW_QUOTE =
  '"Стан спокою і впевненості, бо ціль таки є. Стати фінансово незалежною. Полюбити себе — слухати себе і чого я хочу."'
export const AB_TEST_NATALIIA_PROOF_QUOTE =
  '"Моя ціль-бачення сформувалася вчора. Я так включилась — одразу почала шукати будинки, навіть написала рієлтору."'
export const AB_TEST_VALENTYNA_REVIEW_QUOTE =
  '"Зрозуміла що я тут для того щоб змінити щось. А початок — з чесного зізнання собі."'
export const AB_TEST_CHOICE_PROOF_QUOTE =
  '"Боялась втратити ілюзорну стабільну роботу, страшно було вийти за межи звичного. А початок — з чесності з собою."'
export const AB_TEST_DECISION_PROOF_QUOTE =
  '"Вона веде мене до реалізації себе, показує як це — діяти, приймати рішення, не відкладати, не сумніватися у власних кроках."'
export const AB_TEST_YELYZAVETA_REVIEW_QUOTE =
  '"Завдяки її підтримці я стала впевненішою в собі, навчилася помічати свої внутрішні зміни — а не боротися з собою як робила це раніше."'
export const AB_TEST_KSENIIA_REVIEW_QUOTE_2 =
  '"Запуск 3.0 — оголошую старт 20 березня. Проводжу 2 Zoom зустрічі. Прийняла рішення — 3 дні взагалі не їм солодкого і не купую додому нічого."'
export const AB_TEST_ACTION_PROOF_QUOTE =
  '"Я не шукаю дешевших шляхів — я шукаю результат. І вкладаю не в навчання, а вкладаю в себе. Бо з кожним вкладом моє життя змінюється."'
export const AB_TEST_KSENIIA_REVIEW_QUOTE_1 =
  `${AB_TEST_ACTION_PROOF_QUOTE.replace(' Бо з кожним вкладом моє життя змінюється.', '')}`

export const AB_TEST_DOJIM_7D_REVIEW_QUOTE =
  '"Тааак, головне в голові думки поміняти — і таки визнати що я головна, а не мої думки/стан"'

function buildGoogleDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

export const AB_TEST_AUDIO_FILE_ID = '12Jj5yk0Qb13pKozSC6Ha_nFNcqlCTA17'
export const AB_TEST_AUDIO_URL = buildGoogleDriveDownloadUrl(AB_TEST_AUDIO_FILE_ID)

export type TelegramContentBlock =
  | { type: 'text'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'image'; assetKey: string; caption?: string }
  | { type: 'video'; assetKey: string; caption?: string }
  | { type: 'audio'; assetKey: string; caption?: string }
  | { type: 'pricing'; text: string }
  | { type: 'cta'; text: string }

export const telegramBlock = {
  text: (text: string): TelegramContentBlock => ({ type: 'text', text }),
  quote: (text: string): TelegramContentBlock => ({ type: 'quote', text }),
  image: (assetKey: string, caption?: string): TelegramContentBlock => ({
    type: 'image',
    assetKey,
    ...(caption ? { caption } : {}),
  }),
  video: (assetKey: string, caption?: string): TelegramContentBlock => ({
    type: 'video',
    assetKey,
    ...(caption ? { caption } : {}),
  }),
  audio: (assetKey: string, caption?: string): TelegramContentBlock => ({
    type: 'audio',
    assetKey,
    ...(caption ? { caption } : {}),
  }),
  pricing: (text: string): TelegramContentBlock => ({ type: 'pricing', text }),
  cta: (text: string): TelegramContentBlock => ({ type: 'cta', text }),
} as const

export const AB_TEST_VOICE_CAPTION_PROMPT =
  'Слухай голосове — розповім чому це відбувається і як мені це вдалось змінити.\n👇'
export const AB_TEST_VOICE_NOTE_HEADER = `Тест показав де ти застрягла. ${AB_TEST_VOICE_CAPTION_PROMPT.replace('\n', '')}`
export const AB_TEST_PRACTICE_PREVIEW_PROMPT = 'Хочеш подивитись як це проходить на практиці?'
export const AB_TEST_FINAL_CTA_PROMPT = 'Хочеш приєднатись до ФОКУСУ?'

export const AB_TEST_VOICE_NOTE_LINK_TEXT = '🎧 Прослухати'

export const AB_TEST_VOICE_NOTE_LINES = [
  '',
  AB_TEST_VOICE_NOTE_HEADER,
  AB_TEST_VOICE_NOTE_LINK_TEXT,
  '',
] as const
export const AB_TEST_RESULT_AUDIO_INTRO_TEXT =
  '**AB System** — це система з **5 елементів: СТАН, ЦІЛЬ, ВИБІР, РІШЕННЯ, ДІЯ**.\n\nСаме вони визначають чому одні люди отримують результат — а інші зупиняються на одному місці роками.\n\nТест показав де саме зупиняєшся ти. Коли це видно — стає зрозуміло що змінити і як іти далі.\n\n**Я знаю як допомогти тобі це пройти…**\n\nпрослухати голосове повідомлення 👇'
export const AB_TEST_RESULT_AUDIO_PROMPT_TEXT =
  AB_TEST_VOICE_CAPTION_PROMPT

export const AB_TEST_SHOW_INSIDE_CTA_TEXT = 'Показати практику'
export const AB_TEST_SHOW_INSIDE_CTA_MULTILINE_TEXT =
  'Показати\nяк проходить\nпрактика'

export const AB_TEST_FOCUS_CTA_TEXT = 'Хочу у ФОКУС →'
export const AB_TEST_FOCUS_CTA_RESULT_VALUE = ' Хочу у ФОКУС →'
export const AB_TEST_FOCUS_JOIN_CTA_TEXT = 'Приєднатись до ФОКУСУ →'
export const AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT =
  'Приєднатись до\nФОКУСУ →'
export const AB_TEST_FOCUS_PAY_CTA_TEXT = 'Оплатити ФОКУС →'
export const AB_TEST_FOCUS_CTA_MARKER = ''
export const AB_TEST_FOCUS_PAY_CTA_MARKER = ''
export const AB_TEST_FOCUS_PAYMENT_CTA_1M = 'Оплатити 1 місяць — 15 євро'
export const AB_TEST_FOCUS_PAYMENT_CTA_3M = 'Оплатити 3 місяці — 39 євро'
export const AB_TEST_FOCUS_PRICE_1M = '1 місяць — 15 євро'
export const AB_TEST_FOCUS_PRICE_3M = '3 місяці — 39 євро'
export const abTestPaymentsContent = {
  title: '💳 Focus payment',
  body: 'Оплата відкриває стабільний Focus-ритм, щоб рух не розсипався після рішення.',
  ctaMonthly: AB_TEST_FOCUS_PAYMENT_CTA_1M,
  ctaQuarterly: AB_TEST_FOCUS_PAYMENT_CTA_3M,
} as const
export const AB_TEST_FOCUS_PRICE_SUMMARY =
  `${AB_TEST_FOCUS_PRICE_1M} | ${AB_TEST_FOCUS_PRICE_3M}`
export const AB_TEST_FOCUS_TITLE = 'ФОКУС | Zoom-практики AB System'
export const AB_TEST_FOCUS_TITLE_STYLED = '*ФОКУС │ Zoom-практики AB System*'
export const AB_TEST_FOCUS_TITLE_PLAIN = 'ФОКУС │ Zoom-практики AB System'
export const AB_TEST_FOCUS_WEEKLY_TEXT =
  'ФОКУС — це живі Zoom-практики раз на тиждень.'
export const AB_TEST_FOCUS_WEEKLY_TEXT_BOLD =
  '**ФОКУС — це живі Zoom-практики раз на тиждень**.'
export const AB_TEST_FOCUS_REAL_SITUATION_HEADER =
  'Ти приходиш із реальною ситуацією:'
export const AB_TEST_FOCUS_REAL_SITUATION_LINES = [
  '— що відкладаєш,',
  '— яке рішення переносиш,',
  '— яка ціль не рухається.',
] as const
export const AB_TEST_FOCUS_REAL_SITUATION_INLINE =
  'Ти приходиш із реальною ситуацією: що відкладаєш, яке рішення переносиш, яка ціль не рухається.'
export const AB_TEST_FOCUS_TARIFF_HEADER = 'Тарифи:'
export const AB_TEST_FOCUS_TARIFF_HEADER_BOLD = '**Тарифи:**'
export const AB_TEST_FOCUS_REVIEW_SCREENSHOT_MARKER = '📸 **[СКРІН]**'
export const AB_TEST_FOCUS_RESULT_WORK_TEXT =
  'У ФОКУСІ ми працюємо саме з **тим що показав твій результат**. Наживо. На реальних ситуаціях.'

export const AB_TEST_FOCUS_BENEFIT_HEADER = 'Що ти отримуєш у ФОКУСІ:'
export const AB_TEST_FOCUS_BENEFIT_LINES = [
  '· Розуміння де саме зараз зупиняєшся',
  '· Причину через яку ситуація повторюється знову і знову',
  '· Один конкретний крок який допомагає іти далі',
  '· Можливість розібрати свою ситуацію наживо разом зі мною',
] as const

export const AB_TEST_FOCUS_INCLUDED_HEADER = 'Що входить у ФОКУС:'
export const AB_TEST_FOCUS_INCLUDED_LINES = [
  '· 4 живі Zoom-практики на місяць — розбір саме твоєї ситуації',
  '· Закритий Telegram-канал з підтримкою між зустрічами',
  '· Чат зі мною і дівчатами — не сама',
  '· Запис кожної Zoom-практики',
] as const

export const AB_TEST_FOCUS_PRACTICE_TEXT =
  '**Що відбувається у ФОКУСІ** — закритому просторі де ми працюємо через **AB System**.'
export const AB_TEST_FOCUS_HOW_IT_WORKS_TEXT =
  'Ти приходиш зі своєю **реальною ситуацією** — тим що давно відкладаєш або що не дає спокою.\n\nМи не розбираємо всю твою історію. Ми беремо одну ситуацію і дивимось що саме там відбувається.\n\nНаприкінці практики ти виходиш з одним кроком. **Не списком. Одним — але точним.**'
export const AB_TEST_FOCUS_BENEFITS_TEXT =
  `**${AB_TEST_FOCUS_BENEFIT_HEADER}**\n\n${AB_TEST_FOCUS_BENEFIT_LINES.join('\n')}`
export const AB_TEST_FOCUS_INCLUDED_TEXT =
  `**${AB_TEST_FOCUS_INCLUDED_HEADER}**\n\n${AB_TEST_FOCUS_INCLUDED_LINES.join('\n')}`
export const AB_TEST_FOCUS_PRICING_TEXT =
  `Почати можна з одного місяця участі.\n\nЗа цей час ти проходиш **4 живі практики** і можеш розібрати **кілька своїх ситуацій** через **AB System**.\n\n**${AB_TEST_FOCUS_PRICE_1M}**\n**${AB_TEST_FOCUS_PRICE_3M}**\n\n✅ **100% повернення грошей за 7 днів** — якщо результату немає\n\n${AB_TEST_FOCUS_CTA_MARKER}`
export const AB_TEST_FOCUS_PROOF_PRICING_TEXT =
  `Почати можна з **одного місяця**. Це **15 євро** — менше ніж одна консультація.\n\n**${AB_TEST_FOCUS_TITLE}**\n${AB_TEST_FOCUS_PRICE_SUMMARY}\n\n${AB_TEST_FOCUS_PAY_CTA_MARKER}`
export const AB_TEST_FOCUS_TEST_DRIVE_PITCH_BLOCKS = [
  telegramBlock.text(AB_TEST_FOCUS_BENEFIT_HEADER),
  ...AB_TEST_FOCUS_BENEFIT_LINES.map((line) =>
    telegramBlock.text(line.replace(/^·\s*/, ''))
  ),
] as const

export const AB_TEST_FOCUS_OPENING_LINES = [
  'Почати можна з одного місяця участі.',
  ...AB_TEST_VOICE_NOTE_LINES,
] as const

export const AB_TEST_FOCUS_PRACTICE_TITLE =
  'Що відбувається у ФОКУСІ — закритому просторі де ми працюємо через AB System.'

export const AB_TEST_FOCUS_PRACTICE_CORE_LINES = [
  'На практиці ми не розбираємо все життя одразу.',
  'Ми беремо одну ситуацію яка зараз найбільше тебе зупиняє.',
  '',
  'Спочатку знаходимо де саме ти зупиняєшся.',
  'Потім бачимо що саме це підтримує.',
  'Після цього визначаємо один конкретний крок який допомагає вийти з цього кола.',
  '',
  'Саме тому після практики ти йдеш не з новою інформацією — а з розумінням що робити далі саме тобі у твоїй ситуації.',
] as const

export const AB_TEST_FOCUS_PRACTICE_BENEFIT_LINES = [
  AB_TEST_FOCUS_BENEFIT_HEADER,
  ...AB_TEST_FOCUS_BENEFIT_LINES,
] as const

export const AB_TEST_FOCUS_PRACTICE_INCLUDED_LINES = [
  AB_TEST_FOCUS_INCLUDED_HEADER,
  ...AB_TEST_FOCUS_INCLUDED_LINES,
] as const

export const AB_TEST_FOCUS_PRACTICE_REVIEW_LINES = [
  AB_TEST_NEONILA_REVIEW_HEADER,
  AB_TEST_NEONILA_REVIEW_QUOTE,
] as const

export const AB_TEST_FOCUS_PRACTICE_WRAPUP_LINES = [
  'Ти приходиш зі своєю реальною ситуацією — тим що давно відкладаєш або що не дає спокою.',
  '',
  'Ми не розбираємо всю твою історію. Ми беремо одну ситуацію і дивимось що саме там відбувається.',
  '',
  'Наприкінці практики ти виходиш з одним кроком. Не списком. Одним — але точним.',
] as const

export const AB_TEST_FOCUS_PRACTICE_FULL_LINES = [
  ...AB_TEST_FOCUS_PRACTICE_CORE_LINES,
  '',
  ...AB_TEST_FOCUS_PRACTICE_BENEFIT_LINES,
  '',
  ...AB_TEST_FOCUS_PRACTICE_INCLUDED_LINES,
  '',
  ...AB_TEST_FOCUS_PRACTICE_WRAPUP_LINES,
  '',
  ...AB_TEST_FOCUS_PRACTICE_REVIEW_LINES,
] as const

export const AB_TEST_FOCUS_PRICE_LINES = [
  'За цей час ти проходиш 4 живі практики і можеш розібрати кілька своїх ситуацій через AB System.',
  '',
  AB_TEST_FOCUS_PRICE_1M,
  AB_TEST_FOCUS_PRICE_3M,
] as const

export const AB_TEST_FOCUS_PRICING_LINES = [
  ...AB_TEST_FOCUS_OPENING_LINES,
  '',
  ...AB_TEST_FOCUS_PRICE_LINES,
] as const

export const AB_TEST_FOCUS_TARIFF_BLOCKS = [
  telegramBlock.pricing(AB_TEST_FOCUS_PRICE_1M),
  telegramBlock.pricing(AB_TEST_FOCUS_PRICE_3M),
] as const

export const AB_TEST_FOCUS_CTA_BLOCK = telegramBlock.cta(AB_TEST_FOCUS_CTA_TEXT)

export const AB_TEST_FOCUS_PITCH_BLOCKS = [
  telegramBlock.text(AB_TEST_FOCUS_BENEFIT_HEADER),
  ...AB_TEST_FOCUS_BENEFIT_LINES.map((line) => telegramBlock.text(line)),
  telegramBlock.text(AB_TEST_FOCUS_INCLUDED_HEADER),
  ...AB_TEST_FOCUS_INCLUDED_LINES.map((line) => telegramBlock.text(line)),
] as const

export const AB_TEST_FOCUS_PITCH_LINES = [
  AB_TEST_FOCUS_BENEFIT_HEADER,
  ...AB_TEST_FOCUS_BENEFIT_LINES,
  '',
  AB_TEST_FOCUS_INCLUDED_HEADER,
  ...AB_TEST_FOCUS_INCLUDED_LINES,
  '',
  ...AB_TEST_FOCUS_PRICING_LINES,
] as const

export const AB_TEST_BOLD_LINES = new Set<string>([
  'Тримаєшся з останніх сил.',
  'Тест показав твою головну точку на зараз.',
  'Я знаю як допомогти тобі це пройти…',
  AB_TEST_FOCUS_BENEFIT_HEADER,
  AB_TEST_FOCUS_INCLUDED_HEADER,
  AB_TEST_VOICE_NOTE_HEADER,
  'Хочеш подивитись, як це проходить на практиці?',
  'Більше дій — не вихід.',
  'Коли рішення не прийняте всередині, дія стає важкою.',
  'Якщо ти відчуваєш, що відкладаєш важливе через нечіткість у цілі, заходь у ФОКУС.',
  ...AB_TEST_REVIEW_HEADERS,
])

export const AB_TEST_ACTION_REVIEW_1_EXTRA_LINES = [
  'Раз на тиждень — 2-3 години живого Zoom.',
  'Між зустрічами — закритий канал щоб не загубити те що відбулось.',
] as const

export const AB_TEST_ACTION_AUDIO_REVIEW_TEXT =
  `**${AB_TEST_KSENIIA_REVIEW_HEADER}**\n\n> ${AB_TEST_KSENIIA_REVIEW_QUOTE_1}\n\n${AB_TEST_FOCUS_REVIEW_SCREENSHOT_MARKER}\n\nПочати можна з одного місяця участі.\n\nЗа цей час ти проходиш **4 живі практики** і можеш розібрати **кілька своїх ситуацій** через **AB System**.\n\n**${AB_TEST_FOCUS_PRICE_1M}**\n**${AB_TEST_FOCUS_PRICE_3M}**\n\n${AB_TEST_ACTION_REVIEW_1_EXTRA_LINES.join('\n')}`

export function buildAbTestReviewText(header: string, quote: string): string {
  return `${AB_TEST_FOCUS_REVIEW_SCREENSHOT_MARKER}\n\n**${header}**\n\n> ${quote}`
}

export function buildAbTestFocusTariffSummaryText(): string {
  return AB_TEST_FOCUS_PRICE_SUMMARY
}

export type AbTestScreenshotKey =
  | 'state_review'
  | 'goal_review'
  | 'choice_review'
  | 'decision_review'
  | 'action_review_1'
  | 'action_review_2'
  | 'test_drive_result_review'
  | 'test_drive_inside_review'
  | 'test_drive_response_review'
  | 'dojim_7d_review'

const AB_TEST_SCREENSHOT_FILE_IDS: Record<AbTestScreenshotKey, string> = {
  state_review: '14tPpJxqTUOtQC12kwQsJKeXrcnarQsXK',
  goal_review: '1Pzdk83hFCUTWcDoXtRPOCRqtyp8mgJpu',
  choice_review: '1vt4AWMTZiI20NN28cLYnV77ffVLC_5IY',
  decision_review: '1aYFw1CKM7qFiTECP7x5R4MwPRHPcewpO',
  action_review_1: '1a6ItYLMKfeDCerSkWqO38PQZCgT4SPA2',
  action_review_2: '1DGvNsLvarDlI0X7QIl5WFHAhjDV6A6lc',
  test_drive_result_review: '1hyKSzIAcm9XdsNw7Pg6kureCPghJSQ3g',
  test_drive_inside_review: '1IWssR6WrKec89o81GGeBLsFS7feQAqfr',
  test_drive_response_review: '1lnNlDxxtQOYU2QlS3tdDpUYrqj5k1Cap',
  dojim_7d_review: '1ONOpTDz93r2RQG3-mtX-iWHlBvpdx7Vk',
}

export const AB_TEST_SCREENSHOT_URLS: Record<AbTestScreenshotKey, string> = Object.fromEntries(
  Object.entries(AB_TEST_SCREENSHOT_FILE_IDS).map(([key, fileId]) => [
    key,
    buildGoogleDriveDownloadUrl(fileId),
  ])
) as Record<AbTestScreenshotKey, string>

export function buildAbTestScreenshotMarker(key: AbTestScreenshotKey): string {
  return `📸 [СКРІН — ${key}]`
}
