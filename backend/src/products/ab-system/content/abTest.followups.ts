// backend/src/products/ab-system/content/abTest.followups.ts

import type { AbTestResultKey, TestDriveContentVersion } from './abTest.results.js'
import { interpolateFirstName } from './abTest.results.js'
import {
  AB_TEST_CONTINUE_BUTTON_TEXT,
  AB_TEST_OPEN_ABSYSTEM_AI_BUTTON_TEXT,
  AB_TEST_OPEN_ZOOM_BUTTON_TEXT,
  AB_TEST_SHOW_RESULT_BUTTON_TEXT,
  AB_TEST_DOJIM_7D_REVIEW_QUOTE,
  AB_TEST_FOCUS_CTA_TEXT,
  AB_TEST_FOCUS_PAY_CTA_TEXT,
  AB_TEST_FOCUS_PAYMENT_CTA_1M,
  AB_TEST_FOCUS_PRICE_1M,
  AB_TEST_FOCUS_PRICE_1Y,
  AB_TEST_FOCUS_PRICE_3M,
  AB_TEST_FOCUS_PRICE_SUMMARY,
  AB_TEST_FOCUS_TITLE,
  AB_TEST_SCREENSHOT_URLS,
  telegramBlock,
  type TelegramContentBlock,
} from './abTest.shared.js'
import { PAYMENT_REMINDER_FOLLOWUP_COPY } from '@/core/state-machine/paymentReminderFoundation.js'

export type FollowupCopy = {
  title: string
  body: string
  cta?: string
  blocks?: TelegramContentBlock[]
}

export type LifecycleReminderKey =
  | 'R1_TEST_24H'
  | 'R2_TEST_72H'
  | 'R3_PROGRESS_4H'
  | 'R4_PROGRESS_24H'
  | 'R9_PROGRESS_1D'
  | 'R5_RESULT_2H'
  | 'R6_RESULT_48H'
  | 'R7_OFFER_6H'
  | 'R8_OFFER_3D'
  | 'SUBSCRIPTION_EXPIRING_7D'
  | 'SUBSCRIPTION_EXPIRING_3D'
  | 'SUBSCRIPTION_EXPIRING_1D'
  | 'Z1_ZOOM_MON_1800'
  | 'Z2_ZOOM_MON_1855'

export type BranchFollowupCopy = {
  RESULT_FOLLOWUP_24H: FollowupCopy
  RESULT_FOLLOWUP_48H: FollowupCopy
  RESULT_FOLLOWUP_72H: FollowupCopy
  RESULT_DOJIM_24H: FollowupCopy
  RESULT_DOJIM_48H: FollowupCopy
  RESULT_DOJIM_72H: FollowupCopy
  RESULT_DOJIM_5D: FollowupCopy
  RESULT_DOJIM_7D: FollowupCopy
}

export type AbTestFollowupTimerId =
  | 'RESULT_FOLLOWUP_24H'
  | 'RESULT_FOLLOWUP_48H'
  | 'RESULT_FOLLOWUP_72H'
  | 'RESULT_DOJIM_24H'
  | 'RESULT_DOJIM_48H'
  | 'RESULT_DOJIM_72H'
  | 'RESULT_DOJIM_5D'
  | 'RESULT_DOJIM_7D'
  | 'DOJIM_0_IMMEDIATE'
  | 'PAYMENT_REMINDER_24H'
  | 'PAYMENT_REMINDER_48H'
  | 'PAYMENT_REMINDER_72H'
  | 'PAYMENT_REMINDER_5D'
  | 'PAYMENT_REMINDER_7D'
  | 'ZOOM_REMINDER_24H'
  | 'ZOOM_REMINDER_2H'
  | 'PLATFORM_INVITE_AFTER_ZOOM_1'
  | 'PLATFORM_INVITE_AFTER_ZOOM_2'
  | 'PLATFORM_INVITE_AFTER_ZOOM'

const CTA_JOIN_FOCUS = AB_TEST_FOCUS_CTA_TEXT
const FOCUS_FOLLOWUP_TITLE = 'ФОКУС'
const CTA_START_TEST = 'Пройти тест'
const CTA_SHOW_RESULT = AB_TEST_SHOW_RESULT_BUTTON_TEXT
const PLATFORM_CTA_TEXT = AB_TEST_OPEN_ABSYSTEM_AI_BUTTON_TEXT

const DOJIM_72H_ZOOM_CASES_TEXT = 'Саме такі ситуації ми розбираємо на Zoom-розборах.'
const DOJIM_7D_PRICING_TITLE = AB_TEST_FOCUS_TITLE

function buildSubscriptionReminder(days: 7 | 3 | 1, title: string, cta: string): FollowupCopy {
  return {
    title,
    body: `TODO: текст нагадування про поновлення, вікно ${days} ${days === 3 ? 'дні' : 'днів'}`,
    cta,
  }
}

// Правило: суміжні text-блоки → один text, розділені '  '.
// pricing / quote / image / audio / cta — завжди окремими блоками.
function mergeTextBlocks(blocks: TelegramContentBlock[]): TelegramContentBlock[] {
  const result: TelegramContentBlock[] = []
  const pending: string[] = []

  function flushText() {
    if (pending.length === 0) return
    result.push(telegramBlock.text(pending.join('  ')))
    pending.length = 0
  }

  for (const block of blocks) {
    if (block.type === 'text') {
      pending.push(block.text)
    } else {
      flushText()
      result.push(block)
    }
  }
  flushText()
  return result
}

function interpolateTelegramBlock(
  block: TelegramContentBlock,
  firstName?: string | null,
): TelegramContentBlock {
  if (
    block.type === 'text' ||
    block.type === 'quote' ||
    block.type === 'pricing' ||
    block.type === 'cta'
  ) {
    return { ...block, text: interpolateFirstName(block.text, firstName) }
  }

  if (
    (block.type === 'image' || block.type === 'video' || block.type === 'audio') &&
    block.caption
  ) {
    return { ...block, caption: interpolateFirstName(block.caption, firstName) }
  }

  return block
}

function stripStandaloneFirstNamePrefix(
  value: string,
  firstName?: string | null,
): string {
  const normalizedName = String(firstName ?? '').trim()
  if (!normalizedName) {
    return value
      .replace(/^\{firstName\}\.\s* */u, '')
      .replace(/^[.,؛:—–-]\s+/u, '')
  }

  const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return value
    .replace(/^\{firstName\}\.\s* */u, '')
    .replace(new RegExp(`^${escapedName}\\.\\s*`, 'u'), '')
}

function joinDojimParagraphs(paragraphs: string[]): string {
  return paragraphs.join('\n\n')
}

function buildFocusFooterBlocks(): TelegramContentBlock[] {
  return [
    telegramBlock.text(buildFocusFooterText()),
  ]
}

function buildFocusFooterText(): string {
  return `${AB_TEST_FOCUS_TITLE}.\n\n${AB_TEST_FOCUS_PRICE_1M}.\n${AB_TEST_FOCUS_PRICE_3M}.\n${AB_TEST_FOCUS_PRICE_1Y}.`
}

// ─── ЄДИНИЙ спільний builder для 24H / 48H / 72H / 5D ────────────────────────
// Замінює 3 окремі функції (buildDojim24hFollowup, buildSimpleFollowup,
// buildDojim5dFollowup). Різниця між хвилями — лише в тексті параграфів
// і форматі ціни (двома окремими рядками для 24H, одним summary для решти).
// body і blocks генеруються з ОДНОГО джерела — дублювання архітектурно
// неможливе.
function buildFollowup(
  paragraphs: string[],
  _priceMode: 'dual' | 'summary' = 'summary',
): FollowupCopy {
  const mainText = joinDojimParagraphs(paragraphs)
  const footerText = buildFocusFooterText()

  return {
    title: FOCUS_FOLLOWUP_TITLE,
    body: `${mainText}\n\n${footerText}`,
    cta: CTA_JOIN_FOCUS,
    blocks: [telegramBlock.text(`${mainText}\n\n${footerText}`)],
  }
}

// ─── 7D лишається окремим — реальна відмінність структури (quote + image) ───

function buildDojim7dReviewBlocks(paragraphs: string[], quoteText: string): TelegramContentBlock[] {
  const introText = joinDojimParagraphs(paragraphs)
  return mergeTextBlocks([
    telegramBlock.text(introText),
    telegramBlock.quote(quoteText),
    telegramBlock.image(AB_TEST_SCREENSHOT_URLS.dojim_7d_review),
    ...buildFocusFooterBlocks(),
  ])
}

function buildDojim7dFollowup(options: { paragraphs: string[]; quoteText: string }): FollowupCopy {
  const mainText = joinDojimParagraphs(options.paragraphs)
  return {
    title: DOJIM_7D_PRICING_TITLE,
    body: `${mainText}\n\n${options.quoteText}\n\n${buildFocusFooterText()}`,
    cta: AB_TEST_FOCUS_PAY_CTA_TEXT,
    blocks: buildDojim7dReviewBlocks(options.paragraphs, options.quoteText),
  }
}

// ─── DOJIM 24H — сегментовані ────────────────────────────────────────────────

const DOJIM_24H_BY_SEGMENT: Record<AbTestResultKey, FollowupCopy> = {
  state: buildFollowup([
    '{firstName}, ти вже побачила свій результат у тесті.',
    'Ти впізнала цей стан: сил мало, ранок починається важко, а до вечора нічого суттєво не змінюється.',
    'Саме з цього ми починаємо у ФОКУСІ.',
    'Ти приходиш зі своєю реальною ситуацією. Ми дивимось, чому ти починаєш, але потім зупиняєшся, чому знову відкладаєш те, що для тебе важливо, і що забирає сили без результату.',
  ], 'dual'),
  goal: buildFollowup([
    '{firstName}.',
    'Після тесту дуже легко повернутися до звичних справ.',
    'Але питання, з яким ти живеш, нікуди не зникає.',
    'Ти ніби й хочеш змін, але вже не розумієш, чого хочеш насправді. Де твої бажання, а де просто звичка, чужі очікування чи слово «треба».',
    'Саме це ми і розбираємо на Zoom-розборах.',
    'Дивимося, чому ти перестала чути себе і як знову почати собі довіряти.',
  ], 'dual'),
  choice: buildFollowup([
    '{firstName}.',
    'Після тесту легко сказати собі: «Ще трохи подумаю».',
    'Порадитися ще з кимось. Почекати. Зібрати ще більше інформації.',
    'Але проходить тиждень. Потім ще один. А рішення так і залишається рішенням «на потім».',
    'На наших зустрічах ми не говоримо, що тобі обрати.',
    'Ми дивимося, чому ти відкладаєш рішення, хоча вже давно знаєш усі свої варіанти.',
    'Дуже часто вже після першої зустрічі людина перестає шукати ще одну пораду і просто приймає своє рішення.',
  ], 'dual'),
  decision: buildFollowup([
    '{firstName}.',
    'Після тесту легко подумати: «Повернуся до цього пізніше».',
    'Але те, що ти давно хочеш зробити, нікуди не зникає.',
    'Ти вже не раз казала собі: «Почну з понеділка». «Зроблю, коли буде більше часу». «Ще трохи — і буду готова».',
    'Але минає час, а ти знову відкладаєш те, що давно вирішила зробити.',
    'На наших зустрічах ми не складаємо плани й не мотивуємо.',
    'Ми дивимося, чому між «вирішила» і «зробила» щоразу з\'являється пауза.',
  ], 'dual'),
  action: buildFollowup([
    '{firstName}.',
    'Можливо, після тесту ти подумала: «Треба просто робити ще більше».',
    'Але якщо чесно, ти й так робиш багато.',
    'Читаєш. Плануєш. Починаєш. Намагашся.',
    'І все одно ловиш себе на думці: «Чому нічого не змінюється?»',
    'На наших зустрічах ми не шукаємо тобі ще одну дію.',
    'Ми дивимося, чому все, що ти вже робиш, не дає того результату, якого ти чекаєш.',
  ], 'dual'),
}

// ─── DOJIM 48H ───────────────────────────────────────────────────────────────

const DOJIM_48H_BY_SEGMENT: Record<AbTestResultKey, FollowupCopy> = {
  state: buildFollowup([
    '{firstName}.',
    'Скільки часу ти вже кажеш собі: «ще трохи, і стане легше»?',
    'Місяць? Пів року? Рік?',
    'Але проходить час — і ти знову в тому самому місці: прокидаєшся без сил, відкладаєш те, що важливо, змушуєш себе робити навіть прості речі і чекаєш, коли нарешті з’явиться енергія щось змінювати.',
    'У ФОКУСІ ми розбираємо, чому так відбувається і що саме забирає твої сили.',
    'Живі Zoom-розбори щотижня.',
  ]),
  goal: buildFollowup([
    '{firstName}.',
    'Скільки часу ти вже відкладаєш питання: «А чого хочу саме я?»',
    'Місяць? Рік? Кілька років?',
    'Щодня ти вирішуєш десятки справ. Працюєш. Дбаєш про інших. Закриваєш те, що треба.',
    'А на питання «А як хочу жити я?» знову не вистачає часу.',
    'Коли ти востаннє приймала рішення тому, що цього хотіла ти?',
    'Саме з цього ми починаємо на Zoom-розборі.',
    'Ми дивимося, чому ти перестала чути себе і як повернутися до своїх бажань.',
  ]),
  choice: buildFollowup([
    '{firstName}.',
    'Ти помічала, як одна й та сама думка може крутитися в голові тижнями?',
    'І весь цей час здається, що ще трохи — і рішення прийде саме.',
    'Але минає час, а нічого не змінюється.',
    'На наших зустрічах ми дивимося, чому так відбувається і що не дає тобі нарешті зробити свій вибір.',
  ]),
  decision: buildFollowup([
    '{firstName}.',
    'Ти вже давно знаєш, яке рішення хочеш прийняти.',
    'Але щоразу знаходиться причина відкласти його ще на трохи.',
    'І поки ти чекаєш правильного моменту, нічого не змінюється.',
    'На наших зустрічах ми говоримо не про те, яке рішення правильне.',
    'Ми дивимося, чому те, що ти вже давно для себе вирішила, так і не стає дією.',
  ]),
  action: buildFollowup([
    '{firstName}.',
    'Бувало таке, що наприкінці дня ти втомлена, але не можеш сказати, що сьогодні стало ближче до того, чого ти хочеш?',
    'Так минає день.',
    'Потім ще один.',
    'І в якийсь момент з\'являється думка: «Я ж постійно щось роблю. Чому нічого не змінюється?»',
    'Саме це ми розбираємо на наших Zoom-зустрічах.',
    'Не додаємо нові справи.',
    'Дивимося, чому ті дії, які вже є, не приводять до потрібного результату.',
  ]),
}

// ─── DOJIM 72H ───────────────────────────────────────────────────────────────

const DOJIM_72H_BY_SEGMENT: Record<AbTestResultKey, FollowupCopy> = {
  state: buildFollowup([
    '{firstName}.',
    'Юля згадувала наш Zoom-розбір і практику утримання стану.',
    'Написала мені: «вирівняла стан, сьогодні хочу прописати цілі щодо своєї безпеки та сім\'ї».',
    'Ось такі реальні ситуації ми розбираємо на Zoom-розборах.',
  ]),
  goal: buildFollowup([
    'Наталія написала мені після Zoom-розбору:',
    '«Моя ціль-бачення сформувалася вчора. Я так включилася — одразу почала шукати будинки, навіть написала рієлтору».',
    'Саме заради таких моментів ми й зустрічаємося на Zoom.',
  ]),
  choice: buildFollowup([
    'Валентина написала мені після нашої зустрічі:',
    '«Боюся втрати ілюзорну стабільну роботу, багато думаю про оцінку мене іншими людьми, страшно вийти за межі звичного, страшно ризикнути.»',
  ]),
  decision: buildFollowup([
    'Єлизавета написала мені:',
    '«Ми з Надею працюємо разом трохи менше ніж півроку — з березня. За цей час я бачу, як змінююсь просто на очах. Завдяки її підтримці та присутності я стала впевненішою в собі, навчилася помічати свої внутрішні зміни, свої реакції, а не боротися з собою, як робила це раніше.»',
  ]),
  action: buildFollowup([
    'Ксенія написала мені список того, що змінила:',
    '«1. Запуск 3.0 — оголошую старт 20.03. 2. Не оголошую про набір — проводжу 2 zoom зустрічі і веду в роботу. 3. Солодощі — 3 дні взагалі не їм солодкого. І прийняла рішення — не купляю додому нічого.»',
  ]),
}

// ─── DOJIM 5D ────────────────────────────────────────────────────────────────

const DOJIM_5D_BY_SEGMENT: Record<AbTestResultKey, FollowupCopy> = {
  state: buildFollowup([
    '{firstName}.',
    'Можливо, ти вже багато чого пробувала.',
    'Читала книги. Дивилась відео. Слухала інших експертів. Навіть щось починала робити.',
    'Але потім знову поверталась до того самого питання: «Чому я знаю, що треба робити, але все одно не можу змінити ситуацію?»',
    'У ФОКУСІ ми працюємо з твоєю реальною ситуацією.',
    'Ми розбираємо, чому ти знову відкладаєш важливе, чому починаєш і кидаєш, чому багато думаєш, але так і не переходиш до дії.',
    'Тому вже після першого Zoom-розбору багато хто бачить те, чого раніше не помічав.',
  ]),
  goal: buildFollowup([
    '{firstName}.',
    'Ти вже не раз сідала і думала: «Чого я хочу?»',
    'Писала списки. Дивилася відео. Купувала курси. Намагалася розібратися сама.',
    'А потім закривала все і жила далі, бо відповіді так і не з\'явилося.',
    'На наших зустрічах ми починаємо з того, що зараз відбувається у твоєму житті.',
    'І дуже часто вже під час першої розмови людина говорить: «Тепер я хоча б розумію, з чого почати».',
  ]),
  choice: buildFollowup([
    '{firstName}.',
    'Можливо, ти вже говорила про це з подругою.',
    'Питала її думку. Шукала знаки. Чекала, що хтось підкаже, як буде правильно.',
    'Але чужа відповідь так і не стала твоєю.',
    'На наших зустрічах ніхто не говорить, що тобі обрати.',
    'Ми дивимося, чому ти весь час сумніваєшся у власному виборі.',
    'Дуже часто вже після першої зустрічі людина перестає шукати підтвердження ззовні й починає більше довіряти собі.',
  ]),
  decision: buildFollowup([
    '{firstName}.',
    'Можливо, ти вже читала про це.',
    'Дивилася відео. Слухала подкасти. Ловила себе на думці: «Я це вже знаю».',
    'Але знати — не означає зробити.',
    'На наших зустрічах ми не розповідаємо ще одну теорію.',
    'Ми дивимося, чому те, що ти вже давно для себе вирішила, щоразу відкладається на потім.',
    'Дуже часто вже після першої зустрічі людина говорить: «Тепер розумію, чому весь цей час не могла це зробити».',
  ]),
  action: buildFollowup([
    '{firstName}.',
    'Ти вже купувала курси.',
    'Читала книги. Шукала нові способи стати продуктивнішою.',
    'І в якийсь момент з\'явилася думка: «Я це все вже знаю».',
    'Але знати більше не допомогло.',
    'На наших зустрічах ми дивимося, чому твої дії не дають того результату, якого ти очікуєш.',
    'Так ти починаєш бачити, що саме варто змінити.',
  ]),
}

// ─── DOJIM 7D ────────────────────────────────────────────────────────────────

const AB_TEST_DOJIM_7D_REVIEW_QUOTE_GOAL =
  '"Моя ціль-бачення сформувалася вчора. Я так включилася — одразу почала шукати будинки, навіть написала рієлтору."'
const AB_TEST_DOJIM_7D_REVIEW_QUOTE_CHOICE =
  '"Боялася втратити ілюзорну стабільну роботу, страшно було вийти за межі звичного. А початок — з чесності з собою."'
const AB_TEST_DOJIM_7D_REVIEW_QUOTE_DECISION =
  '"Вона веде мене до реалізації себе, показує, як це — діяти, приймати рішення, не відкладати й не сумніватися у власних кроках."'
const AB_TEST_DOJIM_7D_REVIEW_QUOTE_ACTION =
  '"Я не шукаю дешевших шляхів — я шукаю результат. І вкладаю не в навчання, а вкладаю в себе. Бо з кожним вкладом моє життя змінюється."'

const DOJIM_7D_BY_SEGMENT: Record<AbTestResultKey, FollowupCopy> = {
  state: buildDojim7dFollowup({
    paragraphs: [
      '{firstName}.',
      'Після тесту легко повернутися до своїх справ і знову відкласти те, що давно хочеться змінити.',
      'Але ти вже зупинилась і чесно подивилась: що зараз відбувається і чому так складно щось змінити.',
      'Нижче залишаю відгук Неоніли після першого Zoom-розбору.',
      'У ФОКУСІ ми розбираємо саме такі моменти — коли ти розумієш, що хочеш змін, але знову повертаєшся до старих думок, звичок і реакцій.',
    ],
    quoteText: AB_TEST_DOJIM_7D_REVIEW_QUOTE,
  }),
  goal: buildDojim7dFollowup({
    paragraphs: [
      '{firstName}.',
      'Після тесту легко повернутися до своїх справ і сказати собі: «Подумаю про це потім».',
      'Але питання «Чого я хочу насправді?» від цього не зникає.',
      'Хочу показати тобі повідомлення Наталії після нашої зустрічі.',
      'Якщо відчуваєш, що тобі теж час розібратися зі своєю ситуацією — приєднуйся.',
    ],
    quoteText: AB_TEST_DOJIM_7D_REVIEW_QUOTE_GOAL,
  }),
  choice: buildDojim7dFollowup({
    paragraphs: [
      '{firstName}.',
      'Після тесту легко сказати собі: «Подумаю про це пізніше».',
      'І повернутися до звичних справ.',
      'Але якщо ти дочитала до цього повідомлення, значить питання вибору досі з тобою.',
      'Хочу показати тобі повідомлення Валентини після нашої зустрічі.',
      'Якщо впізнала себе в словах Валентини — буду рада бачити тебе на зустрічі.',
    ],
    quoteText: AB_TEST_DOJIM_7D_REVIEW_QUOTE_CHOICE,
  }),
  decision: buildDojim7dFollowup({
    paragraphs: [
      '{firstName}.',
      'Після тесту легко сказати собі: «Повернуся до цього пізніше».',
      'Але якщо ти читаєш це повідомлення, значить питання, яке показав тест, досі з тобою.',
      'Хочу показати тобі повідомлення Єлизавети після наших зустрічей.',
      'Якщо впізнала себе в цих словах — приєднуйся.',
    ],
    quoteText: AB_TEST_DOJIM_7D_REVIEW_QUOTE_DECISION,
  }),
  action: buildDojim7dFollowup({
    paragraphs: [
      '{firstName}.',
      'Ти вже багато робиш.',
      'Вкладаєш час. Вчишся. Пробуєш нове.',
      'Але в якийсь момент виникає питання: «Чому я стільки вкладаю, а результат не такий, якого хочу?»',
      'Хочу показати тобі повідомлення Ксенії після нашої зустрічі.',
    ],
    quoteText: AB_TEST_DOJIM_7D_REVIEW_QUOTE_ACTION,
  }),
}

// ─── Builder ─────────────────────────────────────────────────────────────────

function buildBranchCopy(segment: AbTestResultKey): BranchFollowupCopy {
  const dojim24h = DOJIM_24H_BY_SEGMENT[segment]
  return {
    RESULT_FOLLOWUP_24H: dojim24h,
    RESULT_FOLLOWUP_48H: DOJIM_48H_BY_SEGMENT[segment],
    RESULT_FOLLOWUP_72H: DOJIM_72H_BY_SEGMENT[segment],
    RESULT_DOJIM_24H: dojim24h,
    RESULT_DOJIM_48H: DOJIM_48H_BY_SEGMENT[segment],
    RESULT_DOJIM_72H: DOJIM_72H_BY_SEGMENT[segment],
    RESULT_DOJIM_5D: DOJIM_5D_BY_SEGMENT[segment],
    RESULT_DOJIM_7D: DOJIM_7D_BY_SEGMENT[segment],
  }
}

export const AB_TEST_FOLLOWUPS: Record<AbTestResultKey, BranchFollowupCopy> = {
  state: buildBranchCopy('state'),
  goal: buildBranchCopy('goal'),
  choice: buildBranchCopy('choice'),
  decision: buildBranchCopy('decision'),
  action: buildBranchCopy('action'),
}

// ─── Generic / system followups ──────────────────────────────────────────────

const GENERIC_FOLLOWUPS: Partial<Record<AbTestFollowupTimerId, FollowupCopy>> = {
  DOJIM_0_IMMEDIATE: {
    title: FOCUS_FOLLOWUP_TITLE,
    body: 'Твій результат уже готовий.  Відкрий його і переходь до наступного кроку у ФОКУС.',
    cta: CTA_JOIN_FOCUS,
  },
  ...PAYMENT_REMINDER_FOLLOWUP_COPY,
  ZOOM_REMINDER_24H: {
    title: 'Zoom через добу',
    body: 'Завтра буде Zoom-практика у ФОКУСІ. Підготуй одну ситуацію: що ти давно хочеш зробити, але переносиш?',
    cta: AB_TEST_OPEN_ZOOM_BUTTON_TEXT,
  },
  ZOOM_REMINDER_2H: {
    title: 'Zoom скоро почнеться',
    body: 'Сьогодні Zoom-практика у ФОКУСІ. Тема: чому відкладаєш те, що давно хочеш?',
    cta: AB_TEST_OPEN_ZOOM_BUTTON_TEXT,
  },
  PLATFORM_INVITE_AFTER_ZOOM_1: {
    title: 'ABSystem AI',
    body: 'Між практиками важливо не загубити рух. ABSystem AI тримає фокус щодня між Zoom.',
    cta: PLATFORM_CTA_TEXT,
  },
  PLATFORM_INVITE_AFTER_ZOOM_2: {
    title: 'ABSystem AI',
    body: 'ABSystem AI допомагає бачити, де рух зупиняється між практиками, і повертатись до кроку.',
    cta: PLATFORM_CTA_TEXT,
  },
  PLATFORM_INVITE_AFTER_ZOOM: {
    title: 'ABSystem AI',
    body: 'ABSystem AI тримає твій фокус щодня між Zoom.',
    cta: PLATFORM_CTA_TEXT,
  },
}

// ─── Public resolver ─────────────────────────────────────────────────────────

export function resolveAbTestFollowupCopy(
  timerId: AbTestFollowupTimerId,
  resultKey?: AbTestResultKey | null,
  version: TestDriveContentVersion = 'legacy',
  options: { firstName?: string | null } = {},
) {
  if (resultKey && timerId in AB_TEST_FOLLOWUPS[resultKey]) {
    const base = AB_TEST_FOLLOWUPS[resultKey][timerId as keyof BranchFollowupCopy]
    return {
      ...base,
      body: stripStandaloneFirstNamePrefix(
        interpolateFirstName(base.body, options.firstName),
        options.firstName,
      ),
      blocks: base.blocks?.map((block) => {
        const interpolated = interpolateTelegramBlock(block, options.firstName)
        if (
          interpolated.type === 'text' ||
          interpolated.type === 'quote' ||
          interpolated.type === 'pricing' ||
          interpolated.type === 'cta'
        ) {
          return { ...interpolated, text: stripStandaloneFirstNamePrefix(interpolated.text, options.firstName) }
        }
        return interpolated
      }),
    }
  }

  const generic = GENERIC_FOLLOWUPS[timerId] ?? AB_TEST_FOLLOWUPS.action.RESULT_FOLLOWUP_24H
  return {
    ...generic,
    body: stripStandaloneFirstNamePrefix(
      interpolateFirstName(generic.body, options.firstName),
      options.firstName,
    ),
    blocks: generic.blocks?.map((block) => {
      const interpolated = interpolateTelegramBlock(block, options.firstName)
      if (
        interpolated.type === 'text' ||
        interpolated.type === 'quote' ||
        interpolated.type === 'pricing' ||
        interpolated.type === 'cta'
      ) {
        return { ...interpolated, text: stripStandaloneFirstNamePrefix(interpolated.text, options.firstName) }
      }
      return interpolated
    }),
  }
}

// ─── Lifecycle reminders ─────────────────────────────────────────────────────

export const AB_TEST_LIFECYCLE_REMINDERS: Record<LifecycleReminderKey, FollowupCopy> = {
  R1_TEST_24H: {
    title: 'Нагадування про тест',
    body: 'Минуло 24 години. Пройди короткий тест AB System, щоб зафіксувати наступний крок.',
    cta: CTA_START_TEST,
  },
  R2_TEST_72H: {
    title: 'Тест досі чекає',
    body: 'Минуло 72 години. Якщо відкладати далі, стан не зміниться. Почни тест зараз.',
    cta: CTA_START_TEST,
  },
  R3_PROGRESS_4H: {
    title: 'Повернись до тесту',
    body: 'Ти зупинилась у процесі. Повернись і закрий тест за 10 хвилин.',
    cta: AB_TEST_CONTINUE_BUTTON_TEXT,
  },
  R4_PROGRESS_24H: {
    title: 'Тест не завершено',
    body: 'Минула 1 година з останньої активності в тесті. Дотисни до результату.',
    cta: AB_TEST_CONTINUE_BUTTON_TEXT,
  },
  R9_PROGRESS_1D: {
    title: 'Тест не завершено',
    body: 'Минув 1 день з останньої активності в тесті. Дотисни до результату.',
    cta: AB_TEST_CONTINUE_BUTTON_TEXT,
  },
  R5_RESULT_2H: {
    title: 'Результат готовий',
    body: 'Твій результат уже готовий. Переглянь його і переходь до наступного кроку.',
    cta: CTA_SHOW_RESULT,
  },
  R6_RESULT_48H: {
    title: 'Повернись до результату',
    body: 'Минуло 48 годин після тесту. Результат працює тільки коли переходиш до дії.',
    cta: CTA_JOIN_FOCUS,
  },
  R7_OFFER_6H: {
    title: 'ФОКУС уже доступний',
    body: 'Можеш зайти у ФОКУС у зручний момент і продовжити з того, що тобі потрібно зараз.',
    cta: CTA_JOIN_FOCUS,
  },
  R8_OFFER_3D: {
    title: 'ФОКУС чекає на тебе',
    body: 'Минуло 3 дні. Якщо готова рухатись далі з підтримкою, відкрий ФОКУС у зручний момент.',
    cta: AB_TEST_FOCUS_PAYMENT_CTA_1M,
  },
  SUBSCRIPTION_EXPIRING_7D: buildSubscriptionReminder(7, 'TODO', 'TODO'),
  SUBSCRIPTION_EXPIRING_3D: buildSubscriptionReminder(3, 'TODO', 'TODO'),
  SUBSCRIPTION_EXPIRING_1D: buildSubscriptionReminder(1, 'TODO', 'TODO'),
  Z1_ZOOM_MON_1800: {
    title: 'Zoom сьогодні о 19:00',
    body: 'За годину Zoom-практика. Підготуй одну ситуацію, яку хочеш розібрати.',
    cta: AB_TEST_OPEN_ZOOM_BUTTON_TEXT,
  },
  Z2_ZOOM_MON_1855: {
    title: 'Zoom стартує за 5 хвилин',
    body: 'Підключайся, щоб не пропустити практичну частину і свій наступний крок.',
    cta: AB_TEST_OPEN_ZOOM_BUTTON_TEXT,
  },
}
