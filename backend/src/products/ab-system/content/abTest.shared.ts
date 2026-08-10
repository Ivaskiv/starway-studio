//backend/src/products/ab-system/content/abTest.shared.ts

export const AB_TEST_START_BUTTON_TEXT = 'ПОЧАТИ ТЕСТ'
export const AB_TEST_CONTINUE_BUTTON_TEXT = 'ПРОДОВЖИТИ ТЕСТ'
export const AB_TEST_CONTINUE_SHORT_BUTTON_TEXT = 'ПРОДОВЖИТИ'
export const AB_TEST_SHOW_RESULT_BUTTON_TEXT = 'ПОКАЗАТИ РЕЗУЛЬТАТ'
export const AB_TEST_MY_RESULT_BUTTON_TEXT = 'ПЕРЕГЛЯНУТИ РЕЗУЛЬТАТ'
export const AB_TEST_RESTART_BUTTON_TEXT = 'ПОЧАТИ ТЕСТ ЗАНОВО'
export const AB_TEST_RETAKE_BUTTON_TEXT = 'ПРОЙТИ ТЕСТ ЩЕ РАЗ'
export const AB_TEST_OPEN_FOCUS_BUTTON_TEXT = 'СПРОБУВАТИ ПЕРШИЙ МІСЯЦЬ'
export const AB_TEST_CHOOSE_ZOOM_BUTTON_TEXT = 'ОБРАТИ ZOOM'
export const AB_TEST_PAY_1M_BUTTON_TEXT = 'ОПЛАТИТИ 1 МІСЯЦЬ'
export const AB_TEST_PAY_3M_BUTTON_TEXT = 'ОПЛАТИТИ 3 МІСЯЦІ'
export const AB_TEST_JOIN_CHANNEL_BUTTON_TEXT = 'ПЕРЕЙТИ В КАНАЛ'
export const AB_TEST_OPEN_ZOOM_BUTTON_TEXT = 'ВІДКРИТИ ZOOM'
export const AB_TEST_OPEN_PLATFORM_BUTTON_TEXT = 'ВІДКРИТИ ПЛАТФОРМУ'
export const AB_TEST_OPEN_ABSYSTEM_AI_BUTTON_TEXT = 'ПЕРЕЙТИ В ABSYSTEM AI'
export const AB_TEST_FOCUS_CALENDAR_BUTTON_TEXT = 'КАЛЕНДАР ZOOM-РОЗБОРІВ'
export const AB_TEST_FOCUS_AI_BUTTON_TEXT = 'ABSYSTEM AI'
export const AB_TEST_NEXT_ZOOM_BUTTON_TEXT = 'НАСТУПНИЙ ZOOM'
export const AB_TEST_FOCUS_MENU_BUTTON_TEXT = 'МЕНЮ ФОКУС'
export const AB_TEST_AI_MENTOR_MENU_BUTTON_TEXT = 'AI MENTOR МЕНЮ'
export const AB_TEST_AI_MENTOR_PLAN_BUTTON_TEXT = 'Мій план дій'
export const AB_TEST_FOCUS_ACTIVE_MENU_TEXT = 'Доступ до ФОКУС активний. Обери наступну дію в меню.'
export const AB_TEST_ZOOM_MEMBER_MENU_TEXT = 'Ти в Zoom-групі. Ось меню та дата найближчої Zoom-зустрічі'
export const AB_TEST_AI_MENTOR_MENU_TEXT = 'Переходимо в AI Mentor режим. Обери, з чого почнемо.'
export const AB_TEST_MAGIC_LINK_INTRO_TEXT = 'Ось твоє магічне посилання для входу без пароля.'
export const AB_TEST_MAGIC_LINK_EXPIRY_TEXT = 'Відкрий його на цьому або іншому пристрої — воно діє 15 хвилин.'
export const AB_TEST_NO_RESULT_YET_TEXT = 'Результат не знайдено. Спробуй пройти тест заново.'

export const abTestContent = {
  meta: {
    productId: 'absystem',
    funnelId: 'ab_test',
  },
  buttons: {
    startTest: AB_TEST_START_BUTTON_TEXT,
    continueTest: AB_TEST_CONTINUE_BUTTON_TEXT,
    restoreProgress: AB_TEST_CONTINUE_SHORT_BUTTON_TEXT,
    showResult: AB_TEST_SHOW_RESULT_BUTTON_TEXT,
    myResult: AB_TEST_MY_RESULT_BUTTON_TEXT,
    restart: AB_TEST_RESTART_BUTTON_TEXT,
    retake: AB_TEST_RETAKE_BUTTON_TEXT,
    openFocus: AB_TEST_OPEN_FOCUS_BUTTON_TEXT,
    payFocus1m: AB_TEST_PAY_1M_BUTTON_TEXT,
    payFocus3m: AB_TEST_PAY_3M_BUTTON_TEXT,
    joinChannel: AB_TEST_JOIN_CHANNEL_BUTTON_TEXT,
    openZoom: AB_TEST_OPEN_ZOOM_BUTTON_TEXT,
    openPlatform: AB_TEST_OPEN_PLATFORM_BUTTON_TEXT,
    openAbsystemAi: AB_TEST_OPEN_ABSYSTEM_AI_BUTTON_TEXT,
    focusCalendar: AB_TEST_FOCUS_CALENDAR_BUTTON_TEXT,
    focusAi: AB_TEST_FOCUS_AI_BUTTON_TEXT,
    nextZoom: AB_TEST_NEXT_ZOOM_BUTTON_TEXT,
    focusMenu: AB_TEST_FOCUS_MENU_BUTTON_TEXT,
    aiMentorMenu: AB_TEST_AI_MENTOR_MENU_BUTTON_TEXT,
    aiMentorPlan: AB_TEST_AI_MENTOR_PLAN_BUTTON_TEXT,
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

export const AB_TEST_REVIEW_HEADERS = {
  state:
    'Хочу показати тобі повідомлення від Неоніли.\nКоли вона прийшла у ФОКУС, її стан був дуже схожий на той, який зараз показав твій тест.',
  goal:
    'Коли Неоніла прийшла у ФОКУС, їй теж було непросто зрозуміти, куди рухатися далі.\nОсь що вона написала після Zoom-розбору.',
  choice:
    'Коли Валентина прийшла у ФОКУС, їй теж було важко зробити вибір.\nОсь що вона написала після Zoom-розбору.',
  decision:
    'Мені дуже відгукнувся цей відгук Єлизавети.',
  action:
    'Ксенія теж прийшла з відчуттям, що багато робить, але результат не змінюється.\nОсь що вона написала після Zoom-розбору.',
} as const

export const AB_TEST_REVIEW_HEADER_VALUES = Object.values(AB_TEST_REVIEW_HEADERS)

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

function buildPublicDeliverableUrl(relativePath: string): string {
  const base = (
    process.env.PUBLIC_API_URL?.trim()
    || process.env.APP_URL?.trim()
    || process.env.TELEGRAM_WEBHOOK_URL?.trim()
  )?.replace(/\/$/, '')
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`

  return base ? `${base}${normalizedPath}` : normalizedPath
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
export const AB_TEST_VOICE_NOTE_HEADER = `Тест показав твою головну точку на зараз. ${AB_TEST_VOICE_CAPTION_PROMPT.replace('\n', '')}`
export const AB_TEST_PRACTICE_PREVIEW_PROMPT = 'Хочеш подивитись, як це виглядає зсередини?'
export const AB_TEST_FINAL_CTA_PROMPT = 'Хочеш спробувати перший місяць у ФОКУСІ?'

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

export const AB_TEST_SHOW_INSIDE_CTA_TEXT = 'ЗАГЛЯНУТИ'
export const AB_TEST_BOOK_ZOOM_CTA_TEXT = 'ЗАПИСАТИСЯ НА ZOOM'
export const AB_TEST_SHOW_INSIDE_CTA_MULTILINE_TEXT =
  'Показати\nяк проходить\nпрактика'

export const AB_TEST_FOCUS_CTA_TEXT = 'ХОЧУ У ФОКУС →'
export const AB_TEST_FOCUS_CTA_RESULT_VALUE = 'СПРОБУВАТИ ПЕРШИЙ МІСЯЦЬ →'
export const AB_TEST_FOCUS_JOIN_CTA_TEXT = 'СПРОБУВАТИ ПЕРШИЙ МІСЯЦЬ →'
export const AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT =
  'СПРОБУВАТИ\nПЕРШИЙ МІСЯЦЬ →'
export const AB_TEST_FOCUS_PAY_CTA_TEXT = 'ОПЛАТИТИ ФОКУС →'
export const AB_TEST_FOCUS_CTA_MARKER = ''
export const AB_TEST_FOCUS_PAY_CTA_MARKER = ''
const FOCUS_TITLE_PARTS = {
  brand: 'ФОКУС',
  subtitle: 'живі Zoom-розбори AB System',
} as const

const FOCUS_WEEKLY_CORE_TEXT = 'раз на тиждень живий Zoom-розбір'

const FOCUS_REAL_SITUATION_ITEMS = [
  'що відкладаєш',
  'яке рішення переносиш',
  'яка ціль не рухається.',
] as const

const FOCUS_INCLUDED_ITEMS = [
  '4 живі Zoom-розбори щомісяця',
  'Закритий Telegram-чат',
  'Мою підтримку і підтримку учасниць між Zoom-розборами',
  'Записи всіх Zoom-розборів',
] as const

const FOCUS_PRICE_COPY = {
  oneMonth: '1 місяць — 33 €',
  threeMonths: '3 місяці — 69 € (23 € / місяць)',
  oneYear: '1 рік — 229 € (19 € / місяць)',
  paymentCta1m: 'ОПЛАТИТИ 1 МІСЯЦЬ — 33 €',
  paymentCta3m: 'ОПЛАТИТИ 3 МІСЯЦІ — 69 €',
  resultOfferLine1m: '• 1 місяць — 4 живі Zoom-розбори — 33 €.',
} as const

const FOCUS_PRICE_LINES = [
  FOCUS_PRICE_COPY.oneMonth,
  FOCUS_PRICE_COPY.threeMonths,
  FOCUS_PRICE_COPY.oneYear,
] as const

function formatFocusTitle(separator: '|' | '│'): string {
  return `${FOCUS_TITLE_PARTS.brand} ${separator} ${FOCUS_TITLE_PARTS.subtitle}`
}

function formatFocusListItems(
  items: readonly string[],
  marker: string,
): string[] {
  return items.map((item) => `${marker} ${item}`)
}

export const AB_TEST_FOCUS_PAYMENT_CTA_1M = FOCUS_PRICE_COPY.paymentCta1m
export const AB_TEST_FOCUS_PAYMENT_CTA_3M = FOCUS_PRICE_COPY.paymentCta3m
export const AB_TEST_FOCUS_PRICE_1M = FOCUS_PRICE_COPY.oneMonth
export const AB_TEST_FOCUS_PRICE_3M = FOCUS_PRICE_COPY.threeMonths
export const AB_TEST_FOCUS_PRICE_1Y = FOCUS_PRICE_COPY.oneYear
export const abTestPaymentsContent = {
  title: '💳 Focus payment',
  body: 'Оплата відкриває стабільний Focus-ритм, щоб рух не розсипався після рішення.',
  ctaMonthly: AB_TEST_FOCUS_PAYMENT_CTA_1M,
  ctaQuarterly: AB_TEST_FOCUS_PAYMENT_CTA_3M,
} as const
export const AB_TEST_FOCUS_PRICE_SUMMARY =
  FOCUS_PRICE_LINES.join(' | ')
export const AB_TEST_FOCUS_TITLE = formatFocusTitle('|')
export const AB_TEST_FOCUS_TITLE_STYLED = `*${formatFocusTitle('│')}*`
export const AB_TEST_FOCUS_TITLE_PLAIN = formatFocusTitle('│')
export const AB_TEST_FOCUS_WEEKLY_TEXT =
  `${FOCUS_TITLE_PARTS.brand} — це ${FOCUS_WEEKLY_CORE_TEXT}.`
export const AB_TEST_FOCUS_WEEKLY_TEXT_BOLD =
  `**${FOCUS_TITLE_PARTS.brand} — це ${FOCUS_WEEKLY_CORE_TEXT}**.`
export const AB_TEST_FOCUS_REAL_SITUATION_HEADER =
  'Ти приходиш із реальною ситуацією:'
export const AB_TEST_FOCUS_REAL_SITUATION_LINES = formatFocusListItems(FOCUS_REAL_SITUATION_ITEMS, '—') as readonly string[]
export const AB_TEST_FOCUS_REAL_SITUATION_INLINE =
  `${AB_TEST_FOCUS_REAL_SITUATION_HEADER} ${FOCUS_REAL_SITUATION_ITEMS.join(', ')}`
export const AB_TEST_FOCUS_TARIFF_HEADER = 'Тарифи:'
export const AB_TEST_FOCUS_TARIFF_HEADER_BOLD = '**Тарифи:**'
export const AB_TEST_FOCUS_REVIEW_SCREENSHOT_MARKER = '📸 **[СКРІН]**'
export const AB_TEST_FOCUS_RESULT_WORK_TEXT =
  'У ФОКУСІ ми працюємо з твоєю реальною ситуацією наживо — на Zoom-розборах.'

export const AB_TEST_FOCUS_BENEFIT_HEADER = 'Що ти отримуєш у ФОКУСІ:'
export const AB_TEST_FOCUS_BENEFIT_LINES = [
  '· Розуміння де саме зараз зупиняєшся',
  '· Причину через яку ситуація повторюється знову і знову',
  '· Один конкретний крок який допомагає іти далі',
  '· Можливість розібрати свою ситуацію наживо разом зі мною',
] as const

export const AB_TEST_FOCUS_INCLUDED_HEADER = 'Що входить у ФОКУС:'
export const AB_TEST_FOCUS_INCLUDED_LINES = formatFocusListItems(FOCUS_INCLUDED_ITEMS, '·') as readonly string[]

export const AB_TEST_FOCUS_PRACTICE_TEXT =
  '**Що відбувається у ФОКУСІ** — закритому просторі де ми працюємо через **AB System**.'
export const AB_TEST_FOCUS_HOW_IT_WORKS_TEXT =
  'Ти приходиш зі своєю **реальною ситуацією** — тим що давно відкладаєш або що не дає спокою.\n\nМи не розбираємо всю твою історію. Ми беремо одну ситуацію і дивимось що саме там відбувається.\n\nНаприкінці практики ти виходиш з одним кроком. **Не списком. Одним — але точним.**'
export const AB_TEST_FOCUS_BENEFITS_TEXT =
  `**${AB_TEST_FOCUS_BENEFIT_HEADER}**\n\n${AB_TEST_FOCUS_BENEFIT_LINES.join('\n')}`
export const AB_TEST_FOCUS_INCLUDED_TEXT =
  `**${AB_TEST_FOCUS_INCLUDED_HEADER}**\n\n${AB_TEST_FOCUS_INCLUDED_LINES.join('\n')}`
export const AB_TEST_FOCUS_INCLUDED_STANDARD_TEXT =
  `У ФОКУС ти отримуєш:\n${formatFocusListItems(FOCUS_INCLUDED_ITEMS, '•').join('\n')}\nЯкщо між Zoom-розборами виникне питання або складна ситуація, ти завжди можеш написати в чат.`
export const AB_TEST_FOCUS_PRICING_TEXT =
  `Найближчий Zoom-розбір уже цього тижня.\n${FOCUS_PRICE_COPY.resultOfferLine1m}\n• 3 місяці — 69 € (23 € на місяць).\n• 1 рік — 229 € (19 € на місяць).\n↩ Якщо після першого Zoom-розбору зрозумієш, що тобі не підходить, я поверну гроші.`
export const AB_TEST_FOCUS_PROOF_PRICING_TEXT =
  `**${AB_TEST_FOCUS_TITLE}**\n${FOCUS_PRICE_LINES.join('\n')}\n\n${AB_TEST_FOCUS_PAY_CTA_MARKER}`
export const AB_TEST_FOCUS_TEST_DRIVE_PITCH_BLOCKS = [
  telegramBlock.text(AB_TEST_FOCUS_BENEFIT_HEADER),
  ...AB_TEST_FOCUS_BENEFIT_LINES.map((line) =>
    telegramBlock.text(line.replace(/^·\s*/, ''))
  ),
] as const

export const AB_TEST_FOCUS_OPENING_LINES = [
  'Почати можна з першого місяця участі — 33 €.',
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
  AB_TEST_REVIEW_HEADERS.state,
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
  'За місяць ти отримуєш 4 живі Zoom-розбори, закритий Telegram-чат, підтримку та записи всіх Zoom-розборів.',
  '',
  ...FOCUS_PRICE_LINES,
] as const

export const AB_TEST_FOCUS_PRICING_LINES = [
  ...AB_TEST_FOCUS_OPENING_LINES,
  '',
  ...AB_TEST_FOCUS_PRICE_LINES,
] as const

export const AB_TEST_FOCUS_TARIFF_BLOCKS = [
  ...FOCUS_PRICE_LINES.map((line) => telegramBlock.pricing(line)),
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
  ...AB_TEST_REVIEW_HEADER_VALUES,
])

export const AB_TEST_ACTION_REVIEW_1_EXTRA_LINES = [
  'Раз на тиждень — живий Zoom-розбір.',
  'Між зустрічами — закритий Telegram-чат, підтримка та записи Zoom-розборів.',
] as const

export const AB_TEST_ACTION_AUDIO_REVIEW_TEXT =
  `**${AB_TEST_REVIEW_HEADERS.action}**\n\n> ${AB_TEST_KSENIIA_REVIEW_QUOTE_1}\n\n${AB_TEST_FOCUS_REVIEW_SCREENSHOT_MARKER}\n\nПочати можна з першого місяця участі.\n\nЗа місяць ти отримуєш **4 живі Zoom-розбори**, закритий Telegram-чат, підтримку та записи всіх Zoom-розборів.\n\n**${AB_TEST_FOCUS_PRICE_1M}**\n**${AB_TEST_FOCUS_PRICE_3M}**\n**${AB_TEST_FOCUS_PRICE_1Y}**\n\n${AB_TEST_ACTION_REVIEW_1_EXTRA_LINES.join('\n')}`

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

export const AB_TEST_SCREENSHOT_URLS: Record<AbTestScreenshotKey, string> = {
  state_review: buildPublicDeliverableUrl('/deliverables/focus-review-state.png'),
  goal_review: buildPublicDeliverableUrl('/deliverables/focus-review-goal.png'),
  choice_review: buildPublicDeliverableUrl('/deliverables/focus-review-choice.png'),
  decision_review: buildPublicDeliverableUrl('/deliverables/focus-review-decision.png'),
  action_review_1: buildPublicDeliverableUrl('/deliverables/focus-review-action.png'),
  action_review_2: buildGoogleDriveDownloadUrl('1DGvNsLvarDlI0X7QIl5WFHAhjDV6A6lc'),
  test_drive_result_review: buildGoogleDriveDownloadUrl('1hyKSzIAcm9XdsNw7Pg6kureCPghJSQ3g'),
  test_drive_inside_review: buildGoogleDriveDownloadUrl('1IWssR6WrKec89o81GGeBLsFS7feQAqfr'),
  test_drive_response_review: buildGoogleDriveDownloadUrl('1lnNlDxxtQOYU2QlS3tdDpUYrqj5k1Cap'),
  dojim_7d_review: buildGoogleDriveDownloadUrl('1ONOpTDz93r2RQG3-mtX-iWHlBvpdx7Vk'),
}

export function buildAbTestScreenshotMarker(key: AbTestScreenshotKey): string {
  return `📸 [СКРІН — ${key}]`
}
