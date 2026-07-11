// backend/src/products/ab-system/content/abTest.followups.ts

import type { AbTestResultKey, TestDriveContentVersion } from './abTest.results.js'
import { interpolateFirstName } from './abTest.results.js'
import {
  AB_TEST_CONTINUE_BUTTON_TEXT,
  AB_TEST_OPEN_ZOOM_BUTTON_TEXT,
  AB_TEST_DOJIM_7D_REVIEW_QUOTE,
  AB_TEST_FOCUS_CTA_TEXT,
  AB_TEST_FOCUS_PAYMENT_CTA_1M,
  AB_TEST_FOCUS_PRICE_1M,
  AB_TEST_FOCUS_PRICE_3M,
  AB_TEST_FOCUS_PRICE_SUMMARY,
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
const CTA_SHOW_RESULT = 'Показати результат'
const PLATFORM_CTA_TEXT = 'Перейти в ABSystem AI'

const DOJIM_72H_ZOOM_CASES_TEXT = 'Саме такі ситуації ми розбираємо на Zoom-практиках.'
const DOJIM_5D_ALREADY_TRIED_TEXT = 'Більшість наших учасниць приходили саме з думкою: «Я вже все це проходила.»'
const DOJIM_5D_STILL_READING_TEXT = 'Можливо тому ти досі тут і читаєш це повідомлення.'

const DOJIM_7D_ONE_MONTH_TEXT = 'Почати можна з **одного місяця**. Це **15 євро** — менше ніж одна консультація.'
const DOJIM_7D_PRICING_TITLE = 'ФОКУС | Zoom-практики AB System'
const DOJIM_7D_OPENING_TEXT =
  'Через тиждень після тесту більшість людей повертаються до звичного життя і відкладають це ще на кілька місяців.'
const DOJIM_7D_HONESTY_TEXT = 'Ти вже знаєш що тебе зупиняє. Це не так часто буває — що людина бачить це чесно.'
const DOJIM_7D_REVIEW_INTRO_TEXT = '**Нижче — відгук після першої практики.**'
const DOJIM_7D_GOAL_HONESTY_TEXT = '**Ти вже знаєш, що тебе зупиняє.**\nТак буває нечасто — щоб людина побачила це настільки чесно.'
const DOJIM_7D_GOAL_REVIEW_INTRO_TEXT = '**Нижче — відгук після першої практики.**'

// Правило: суміжні text-блоки → один text, розділені '\n\n'.
// pricing / quote / image / audio / cta — завжди окремими блоками.
function mergeTextBlocks(blocks: TelegramContentBlock[]): TelegramContentBlock[] {
  const result: TelegramContentBlock[] = []
  const pending: string[] = []

  function flushText() {
    if (pending.length === 0) return
    result.push(telegramBlock.text(pending.join('\n\n')))
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
    return value.replace(/^\{firstName\}\.\s*\n*/u, '')
  }

  const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return value
    .replace(/^\{firstName\}\.\s*\n*/u, '')
    .replace(new RegExp(`^${escapedName}\\.\\s*\\n*`, 'u'), '')
}

function buildFocusFooterBlocks(): TelegramContentBlock[] {
  return [
    telegramBlock.text(buildFocusFooterText()),
  ]
}

function buildFocusFooterText(): string {
  return `**${AB_TEST_FOCUS_PRICE_1M}**\n\n**${AB_TEST_FOCUS_PRICE_3M}**`
}

// ─── ЄДИНИЙ спільний builder для 24H / 48H / 72H / 5D ────────────────────────
// Замінює 3 окремі функції (buildDojim24hFollowup, buildSimpleFollowup,
// buildDojim5dFollowup). Різниця між хвилями — лише в тексті параграфів
// і форматі ціни (двома окремими рядками для 24H, одним summary для решти).
// body і blocks генеруються з ОДНОГО джерела — дублювання архітектурно
// неможливе.
function buildFollowup(
  paragraphs: string[],
  priceMode: 'dual' | 'summary' = 'summary',
): FollowupCopy {
  const mainText = paragraphs.join('\n\n')
  const priceLine = priceMode === 'dual'
    ? `${AB_TEST_FOCUS_PRICE_1M}\n${AB_TEST_FOCUS_PRICE_3M}`
    : AB_TEST_FOCUS_PRICE_SUMMARY

  return {
    title: FOCUS_FOLLOWUP_TITLE,
    body: `${mainText}\n\n${priceLine}`,
    cta: CTA_JOIN_FOCUS,
    blocks: mergeTextBlocks([telegramBlock.text(mainText), ...buildFocusFooterBlocks()]),
  }
}

function buildDojim5dText(options: {
  introText: string
  tamText: string
  tutText: string
  closingText: string
}): string {
  const alreadyParagraph = `${DOJIM_5D_ALREADY_TRIED_TEXT}\n\n${DOJIM_5D_STILL_READING_TEXT}`
  const differenceText = [
    '**Різниця одна:**',
    `**ТАМ:** ${options.tamText}`,
    `**ТУТ:** ${options.tutText}`,
  ].join('\n')

  return `{firstName}.\n\n${options.introText}\n\n${alreadyParagraph}\n\n${differenceText}\n\n${options.closingText}`
}

// ─── 7D лишається окремим — реальна відмінність структури (quote + image) ───

function buildDojim7dReviewBlocks(introText: string, quoteText: string, oneMonthText: string): TelegramContentBlock[] {
  return mergeTextBlocks([
    telegramBlock.text(introText),
    telegramBlock.quote(quoteText),
    telegramBlock.image(AB_TEST_SCREENSHOT_URLS.dojim_7d_review),
    telegramBlock.text(oneMonthText),
    ...buildFocusFooterBlocks(),
  ])
}

function buildDojim7dFollowup(options: { introText: string; quoteText: string }): FollowupCopy {
  return {
    title: FOCUS_FOLLOWUP_TITLE,
    body: `{firstName}.\n\n${options.introText}\n\n${options.quoteText}\n\n${DOJIM_7D_ONE_MONTH_TEXT}\n\n${buildFocusFooterText()}`,
    cta: CTA_JOIN_FOCUS,
    blocks: buildDojim7dReviewBlocks(`{firstName}.\n\n${options.introText}`, options.quoteText, DOJIM_7D_ONE_MONTH_TEXT),
  }
}

// ─── DOJIM 24H — сегментовані ────────────────────────────────────────────────

const DOJIM_24H_BY_SEGMENT: Record<AbTestResultKey, FollowupCopy> = {
  state: buildFollowup([
    '{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.\n\nБільшість так і не доходить навіть до цього.',
    'Тест показав де ти зараз — взагалі без сил і нічого не хочеться. І в цьому стані ти все одно намагаєшся щось робити. І злишся що не виходить.',
    'Саме тому ти отримала цей результат. Це не вирок — це точка з якої починається зміна.',
    'У ФОКУСІ ми працюємо саме з тим що показав твій результат. Наживо. На реальних ситуаціях.',
  ], 'dual'),
  goal: buildFollowup([
    '{firstName}, **ти вже зробила перший крок** — пройшла тест і відповіла собі чесно.',
    'Тест показав де ти зараз — **хочеш змін**, але не знаєш як саме хочеш жити. І від цього **стоїш на місці** ще більше.',
    'Це не слабкість. Ціль, яку ти не дозволяєш собі хотіти, — це і є точка входу.',
    'У **ФОКУСІ** ми знаходимо твій напрямок. Наживо. На реальних ситуаціях.',
  ], 'dual'),
  choice: buildFollowup([
    '{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.',
    'Тест показав де ти зараз — варіанти є, але обрати один страшно. Бо вибір завжди щось залишає позаду.',
    'Справа не у варіантах. А у страху всередині. Як тільки побачиш що саме лякає — вибір стається сам.',
    'У ФОКУСІ ми дивимось саме на це. Наживо. На твоїй ситуації.',
  ], 'dual'),
  decision: buildFollowup([
    '{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.',
    'Тест показав де ти зараз — ти вже все знаєш що треба зробити. Але між "вирішила" і "зробила" — пусто.',
    '"Я все розумію але не роблю" — це проходить. Не через силу волі, а через те що ти побачиш де саме зупиняєшся.',
    'У ФОКУСІ ми переходимо від "знаю" до реального кроку. Наживо.',
  ], 'dual'),
  action: buildFollowup([
    '{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.',
    'Тест показав де ти зараз — ти активна, робиш багато, але ходиш по колу. І самі дії вже не допомагають.',
    'Більше дій — не вихід. У ФОКУСІ ми дивимось де саме все розсипається — і замість нового списку ти виходиш з одним точним кроком.',
  ], 'dual'),
}

// ─── DOJIM 48H ───────────────────────────────────────────────────────────────

const DOJIM_48H_BY_SEGMENT: Record<AbTestResultKey, FollowupCopy> = {
  state: buildFollowup([
    '{firstName}.',
    'Скільки часу ти вже тримаєшся з останніх сил?',
    'Місяць? Пів року? Рік?',
    'І що змінилось за цей час?',
    'Якщо нічого не зміниться — де ти будеш через ще один рік?\nУ тому самому місці. Просто ще більш втомлена.',
    'На практиці ми дивимось не на симптом. А на те що його створює.',
  ]),
  goal: buildFollowup([
    '{firstName}.',
    '**Скільки часу ти вже живеш з відчуттям що йдеш не туди?**',
    'Місяць? Рік? Кілька років?',
    'І що змінилось за цей час?',
    'Якщо нічого не зміниться — де ти будеш через ще один рік?\nУ тому самому місці. Просто ще більш розгублена.',
    'На практиці ми дивимось не на симптом. А на те що його створює.',
  ]),
  choice: buildFollowup([
    '{firstName}.',
    'Скільки часу ти вже боїшся зробити неправильно?',
    'І що змінилось поки чекала правильного моменту?',
    'Якщо нічого не зміниться — де ти будеш через ще один рік?\nТам само. Тільки варіантів стане більше — а рішення все одно не буде.',
    'На практиці ми дивимось не на варіанти. А на страх що за ними стоїть.',
  ]),
  decision: buildFollowup([
    '{firstName}.',
    'Скільки часу ти вже знаєш що треба зробити — але не робиш?',
    'Місяць? Пів року? Рік?',
    'І що змінилось за цей час?',
    'Якщо нічого не зміниться — де ти будеш через ще один рік?\nУ тому самому місці. З тим самим рішенням яке так і не стало дією.',
    'На практиці ми дивимось не на рішення. А на те що заважає його\nприйняти до кінця.',
  ]),
  action: buildFollowup([
    '{firstName}.',
    'Скільки часу ти вже робиш багато — але воно нікуди не веде?',
    'Місяць? Пів року? Рік?',
    'І що змінилось за цей час?',
    'Якщо нічого не зміниться — де ти будеш через ще один рік?\nТам само. Тільки ще більш втомлена від дій які нічого не дають.',
    'На практиці ми дивимось не на дії. А на те чому вони не ведуть до\nрезультату.',
  ]),
}

// ─── DOJIM 72H ───────────────────────────────────────────────────────────────

const DOJIM_72H_BY_SEGMENT: Record<AbTestResultKey, FollowupCopy> = {
  state: buildFollowup([
    '{firstName}.',
    'Юля тиждень не могла змусити себе взятися за справи. Зранку — як побита. Ввечері — нічого не хочеться.',
    'На практиці побачила що сама обирає як пройде її день — просто ніколи не думала про це так.',
    'Наступного ранку згадала це і поміняла пластинку в голові.',
    'Через тиждень написала що вперше за довгий час перестала прокидатися з думкою "як пережити цей день."',
    DOJIM_72H_ZOOM_CASES_TEXT,
  ]),
  goal: buildFollowup([
    '{firstName}.',
    'Наталія прийшла з відчуттям що давно хоче щось змінити — але не\nможе пояснити навіщо і куди.',
    'На практиці побачила що насправді хоче — і дозволила собі це\nвизнати.',
    'Наступного дня написала рієлтору і почала шукати будинки.',
    'Каже: «Я так включилася — побачила скільки можливостей втрачаю\nпросто через якісь свої блоки і думки в голові.»',
    DOJIM_72H_ZOOM_CASES_TEXT,
  ]),
  choice: buildFollowup([
    '{firstName}.',
    'Валентина довго не могла обрати — залишити роботу чи ні.',
    'Казала: «Боюсь втратити ілюзорну стабільну роботу. Страшно вийти\nза межі звичного. Страшно ризикнути.»',
    'На практиці побачила що тримається не за роботу — а за страх що\nскажуть інші.',
    'Як тільки побачила це — вибір стався сам.',
    'Каже: «Початок — з чесності з собою.»',
    DOJIM_72H_ZOOM_CASES_TEXT,
  ]),
  decision: buildFollowup([
    '{firstName}.',
    'Єлизавета знала що треба змінити роботу — вже рік.',
    'Казала собі: «Я все розумію але не роблю. Що зі мною не так?»',
    'На практиці побачила що рішення вже прийняте — але кожного разу\nтихенько замінялось на «почекати ще трошки.»',
    'Після практики вперше зробила конкретний крок. Не тому що стало\nлегше. А тому що побачила що саме її тримало.',
    DOJIM_72H_ZOOM_CASES_TEXT,
  ]),
  action: buildFollowup([
    '{firstName}.',
    'Ксенія робила багато — контент, навчання, нові проєкти. Але відчуття що ходить по колу не минало.',
    'На практиці побачила що кожна її дія починається з нуля — без розуміння куди веде.',
    'Після практики вперше зробила одну дію — але точну. Ту що насправді мала сенс.',
    'Каже: «Я не шукаю дешевших шляхів — я шукаю результат. І вкладаю не в навчання, а вкладаю в себе.»',
    DOJIM_72H_ZOOM_CASES_TEXT,
  ]),
}

// ─── DOJIM 5D ────────────────────────────────────────────────────────────────

const DOJIM_5D_BY_SEGMENT: Record<AbTestResultKey, FollowupCopy> = {
  state: (() => {
    const text = buildDojim5dText({
      introText: 'Можливо ти вже проходила щось схоже. Читала. Слухала. Пробувала.',
      tamText: 'ти отримувала інформацію.',
      tutText: 'ми працюємо з твоєю конкретною ситуацією. Не загальні поради — а розбір саме того що тебе зупиняє.',
      closingText: 'Тому багато учасниць отримують відповідь вже на першій практиці.',
    })
    return {
      title: FOCUS_FOLLOWUP_TITLE,
      body: `${text}\n\n${AB_TEST_FOCUS_PRICE_SUMMARY}`,
      cta: CTA_JOIN_FOCUS,
      blocks: mergeTextBlocks([telegramBlock.text(text), ...buildFocusFooterBlocks()]),
    }
  })(),
  goal: (() => {
    const text = buildDojim5dText({
      introText: 'Може ти вже писала списки бажань. Проходила курси. Питала себе **ЧОГО ТИ ХОЧЕШ**.',
      tamText: 'ти отримувала інформацію.',
      tutText: 'ми працюємо з твоєю конкретною ситуацією — і ти нарешті чуєш себе, а не чужі поради.',
      closingText: 'Тому багато учасниць отримують ясність вже на першій практиці.',
    })
    return {
      title: FOCUS_FOLLOWUP_TITLE,
      body: `${text}\n\n${AB_TEST_FOCUS_PRICE_SUMMARY}`,
      cta: CTA_JOIN_FOCUS,
      blocks: mergeTextBlocks([telegramBlock.text(text), ...buildFocusFooterBlocks()]),
    }
  })(),
  choice: (() => {
    const text = buildDojim5dText({
      introText: 'Може ти вже питала подруг. Шукала знаки. Читала про це.',
      tamText: 'подруги казали, що обрати.',
      tutText: 'ми дивимось, чого ти насправді боїшся втратити — і вибір відбувається сам. Без тиску.',
      closingText: 'Тому багато учасниць роблять вибір вже на першій практиці.',
    })
    return {
      title: FOCUS_FOLLOWUP_TITLE,
      body: `${text}\n\n${AB_TEST_FOCUS_PRICE_SUMMARY}`,
      cta: CTA_JOIN_FOCUS,
      blocks: mergeTextBlocks([telegramBlock.text(text), ...buildFocusFooterBlocks()]),
    }
  })(),
  decision: (() => {
    const text = buildDojim5dText({
      introText: 'Може ти вже читала про це. Слухала подкасти. Знаєш теорію.',
      tamText: 'ти знала, що робити, але залишалась у теорії.',
      tutText: 'ми знаходимо, що саме тебе тримає між «вирішила» і «зробила» — і перший крок відбувається ще під час практики.',
      closingText: 'Тому багато учасниць виходять з практики вже з конкретним кроком.',
    })
    return {
      title: FOCUS_FOLLOWUP_TITLE,
      body: `${text}\n\n${AB_TEST_FOCUS_PRICE_SUMMARY}`,
      cta: CTA_JOIN_FOCUS,
      blocks: mergeTextBlocks([telegramBlock.text(text), ...buildFocusFooterBlocks()]),
    }
  })(),
  action: (() => {
    const text = buildDojim5dText({
      introText: 'Може ти вже брала нові курси. Читала книги про продуктивність.\nПробувала нові підходи.',
      tamText: 'ти додавала ще більше дій.',
      tutText: 'ми знаходимо, де саме все розсипається — і замість списку нових дій ти виходиш з одним кроком. Але точним. Тим, що нарешті веде до результату.',
      closingText: 'Тому багато учасниць після першої практики вперше відчувають, що бачать результат, а не просто зайняті.',
    })
    return {
      title: FOCUS_FOLLOWUP_TITLE,
      body: `${text}\n\n${AB_TEST_FOCUS_PRICE_SUMMARY}`,
      cta: CTA_JOIN_FOCUS,
      blocks: mergeTextBlocks([telegramBlock.text(text), ...buildFocusFooterBlocks()]),
    }
  })(),
}

// ─── DOJIM 7D ────────────────────────────────────────────────────────────────

const DOJIM_7D_STANDARD_INTRO = `${DOJIM_7D_OPENING_TEXT}\n\n${DOJIM_7D_HONESTY_TEXT}\n\n${DOJIM_7D_REVIEW_INTRO_TEXT}`
const DOJIM_7D_GOAL_INTRO = `${DOJIM_7D_OPENING_TEXT}\n\n${DOJIM_7D_GOAL_HONESTY_TEXT}\n\n${DOJIM_7D_GOAL_REVIEW_INTRO_TEXT}`

const AB_TEST_DOJIM_7D_REVIEW_QUOTE_GOAL =
  '"Моя ціль-бачення сформувалася вчора. Я так включилася — одразу почала шукати будинки, навіть написала рієлтору."'
const AB_TEST_DOJIM_7D_REVIEW_QUOTE_CHOICE =
  '"Боялась втратити ілюзорну стабільну роботу, страшно було вийти за межі звичного. А початок — з чесності з собою."'
const AB_TEST_DOJIM_7D_REVIEW_QUOTE_DECISION =
  '"Вона веде мене до реалізації себе, показує як це — діяти, приймати рішення, не відкладати, не сумніватися у власних кроках."'
const AB_TEST_DOJIM_7D_REVIEW_QUOTE_ACTION =
  '"Я не шукаю дешевших шляхів — я шукаю результат. І вкладаю не в навчання, а вкладаю в себе. Бо з кожним вкладом моє життя змінюється."'

// TODO(STEP B): dojim_7d_review screenshot однаковий для всіх сегментів,
// поки нема реальних Drive ID для goal/choice/decision/action
const DOJIM_7D_BY_SEGMENT: Record<AbTestResultKey, FollowupCopy> = {
  state: buildDojim7dFollowup({ introText: DOJIM_7D_STANDARD_INTRO, quoteText: AB_TEST_DOJIM_7D_REVIEW_QUOTE }),
  goal: buildDojim7dFollowup({ introText: DOJIM_7D_GOAL_INTRO, quoteText: AB_TEST_DOJIM_7D_REVIEW_QUOTE_GOAL }),
  choice: buildDojim7dFollowup({ introText: DOJIM_7D_STANDARD_INTRO, quoteText: AB_TEST_DOJIM_7D_REVIEW_QUOTE_CHOICE }),
  decision: buildDojim7dFollowup({ introText: DOJIM_7D_STANDARD_INTRO, quoteText: AB_TEST_DOJIM_7D_REVIEW_QUOTE_DECISION }),
  action: buildDojim7dFollowup({ introText: DOJIM_7D_STANDARD_INTRO, quoteText: AB_TEST_DOJIM_7D_REVIEW_QUOTE_ACTION }),
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
    body: 'Твій результат уже готовий.\n\nВідкрий його і переходь до наступного кроку у ФОКУС.',
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
