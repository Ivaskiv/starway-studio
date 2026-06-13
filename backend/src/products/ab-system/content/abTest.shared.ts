//backend/src/products/ab-system/content/abTest.shared.ts
export const AB_TEST_NEONILA_REVIEW_HEADER = 'Неоніла написала після практики:'
export const AB_TEST_VALENTYNA_REVIEW_HEADER = 'Валентина написала після практики:'
export const AB_TEST_YELYZAVETA_REVIEW_HEADER = 'Єлизавета написала після роботи зі мною:'
export const AB_TEST_KSENIIA_REVIEW_HEADER = 'Ксенія написала після роботи зі мною:'

export const AB_TEST_REVIEW_HEADERS = [
  AB_TEST_NEONILA_REVIEW_HEADER,
  AB_TEST_VALENTYNA_REVIEW_HEADER,
  AB_TEST_YELYZAVETA_REVIEW_HEADER,
  AB_TEST_KSENIIA_REVIEW_HEADER,
] as const

export const AB_TEST_NEONILA_REVIEW_QUOTE =
  '"Зранку стала як побита. А потім згадала як Надя казала — що це я обираю як пройде мій день. Поміняла пластинку в голові і всьо заграло новими барвами."'
export const AB_TEST_VALENTYNA_REVIEW_QUOTE =
  '"Зрозуміла що я тут для того щоб змінити щось. А початок — з чесного зізнання собі."'
export const AB_TEST_YELYZAVETA_REVIEW_QUOTE =
  '"Вона веде мене до реалізації себе, показує як це — діяти, приймати рішення, не відкладати."'
export const AB_TEST_KSENIIA_REVIEW_QUOTE_1 =
  '"Я не шукаю дешевших шляхів — я шукаю результат. І вкладаю не в навчання, а вкладаю в себе."'
export const AB_TEST_KSENIIA_REVIEW_QUOTE_2 =
  '"Запуск 3.0 — оголошую старт 20 березня. Проводжу 2 Zoom зустрічі. Прийняла рішення — 3 дні взагалі не їм солодкого і не купую додому нічого."'

export const AB_TEST_DOJIM_7D_REVIEW_QUOTE =
  '"Тааак, головне в голові думки поміняти — і таки визнати що я головна, а не мої думки/стан"'

export const AB_TEST_AUDIO_URL =
  'https://drive.google.com/file/d/12Jj5yk0Qb13pKozSC6Ha_nFNcqlCTA17/view?usp=drive_link'

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

export const AB_TEST_VOICE_NOTE_HEADER = 'Тест показав де ти застрягла. Слухай голосове — розповім чому це відбувається і як мені це вдалось змінити.👇'

export const AB_TEST_VOICE_NOTE_LINK_TEXT = '🎧 Прослухати'

export const AB_TEST_VOICE_NOTE_BLOCK = telegramBlock.audio(
  AB_TEST_AUDIO_URL,
  AB_TEST_VOICE_NOTE_HEADER
)

export const AB_TEST_VOICE_NOTE_LINES = [
  '',
  AB_TEST_VOICE_NOTE_HEADER,
  AB_TEST_VOICE_NOTE_LINK_TEXT,
  '',
] as const

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

export const AB_TEST_FOCUS_OPENING_LINES = [
  'Почати можна з одного місяця участі.',
  ...AB_TEST_VOICE_NOTE_LINES,
] as const

export const AB_TEST_FOCUS_PRACTICE_TITLE =
  'Що відбувається у ФОКУСІ — закритому просторі де ми працюємо через AB System.'

export const AB_TEST_SHOW_INSIDE_CTA_TEXT = 'Показати практику'
export const AB_TEST_SHOW_INSIDE_CTA_MARKER = `[КНОПКА: ${AB_TEST_SHOW_INSIDE_CTA_TEXT}]`

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
  '1 місяць — 15 євро',
  '3 місяці — 39 євро',
] as const

export const AB_TEST_FOCUS_PRICING_LINES = [
  ...AB_TEST_FOCUS_OPENING_LINES,
  '',
  ...AB_TEST_FOCUS_PRICE_LINES,
] as const

export const AB_TEST_FOCUS_TARIFF_BLOCKS = [
  telegramBlock.pricing('1 місяць — 15 євро'),
  telegramBlock.pricing('3 місяці — 39 євро'),
] as const

export const AB_TEST_FOCUS_CTA_BLOCK = telegramBlock.cta('Хочу у ФОКУС →')

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
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  ])
) as Record<AbTestScreenshotKey, string>

export function buildAbTestScreenshotMarker(key: AbTestScreenshotKey): string {
  return `📸 [СКРІН — ${key}]`
}
