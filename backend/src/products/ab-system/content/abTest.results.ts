//backend/src/products/ab-system/content/abTest.results.ts
import type { TelegramButton } from '@/core/flow-builder/flowTemplates.js'
import type { AbTestFollowupTimerId } from './abTest.followups.js'
import type { AbTestAnswerKey } from './abTest.questions.js'
import {
  AB_TEST_AUDIO_URL,
  AB_TEST_ACTION_PROOF_QUOTE,
  AB_TEST_CHOICE_PROOF_QUOTE,
  AB_TEST_DECISION_PROOF_QUOTE,
  AB_TEST_DOJIM_7D_REVIEW_QUOTE,
  AB_TEST_FOCUS_BENEFITS_TEXT,
  AB_TEST_FOCUS_CTA_BLOCK,
  AB_TEST_FOCUS_CTA_MARKER,
  AB_TEST_FOCUS_CTA_RESULT_VALUE,
  AB_TEST_FOCUS_CTA_TEXT,
  AB_TEST_FOCUS_HOW_IT_WORKS_TEXT,
  AB_TEST_FOCUS_INCLUDED_TEXT,
  AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT,
  AB_TEST_FOCUS_JOIN_CTA_TEXT,
  AB_TEST_FOCUS_PAYMENT_CTA_1M,
  AB_TEST_FOCUS_PAYMENT_CTA_3M,
  AB_TEST_FOCUS_PITCH_LINES,
  AB_TEST_FOCUS_PRACTICE_CORE_LINES,
  AB_TEST_FOCUS_PRACTICE_FULL_LINES,
  AB_TEST_FOCUS_PRACTICE_TEXT,
  AB_TEST_FOCUS_PRACTICE_TITLE,
  AB_TEST_FOCUS_PRICE_1M,
  AB_TEST_FOCUS_PRICE_3M,
  AB_TEST_FOCUS_PRICING_TEXT,
  AB_TEST_FOCUS_PROOF_PRICING_TEXT,
  AB_TEST_FOCUS_REAL_SITUATION_HEADER,
  AB_TEST_FOCUS_REAL_SITUATION_INLINE,
  AB_TEST_FOCUS_REAL_SITUATION_LINES,
  AB_TEST_FOCUS_RESULT_WORK_TEXT,
  AB_TEST_FOCUS_TARIFF_HEADER,
  AB_TEST_FOCUS_TARIFF_HEADER_BOLD,
  AB_TEST_FOCUS_TEST_DRIVE_PITCH_BLOCKS,
  AB_TEST_FOCUS_TITLE_PLAIN,
  AB_TEST_FOCUS_TITLE_STYLED,
  AB_TEST_FOCUS_WEEKLY_TEXT,
  AB_TEST_FOCUS_WEEKLY_TEXT_BOLD,
  AB_TEST_KSENIIA_REVIEW_QUOTE_1,
  AB_TEST_KSENIIA_REVIEW_QUOTE_2,
  AB_TEST_NATALIIA_PROOF_QUOTE,
  AB_TEST_NATALIIA_REVIEW_QUOTE,
  AB_TEST_NEONILA_REVIEW_QUOTE,
  AB_TEST_REVIEW_HEADERS,
  AB_TEST_RESULT_AUDIO_PROMPT_TEXT,
  AB_TEST_SCREENSHOT_URLS,
  AB_TEST_SHOW_INSIDE_CTA_MULTILINE_TEXT,
  AB_TEST_VALENTYNA_REVIEW_QUOTE,
  AB_TEST_VOICE_NOTE_LINES,
  AB_TEST_YELYZAVETA_REVIEW_QUOTE,
  abTestContent,
  buildAbTestFocusTariffSummaryText,
  buildAbTestReviewText,
  telegramBlock,
  type TelegramContentBlock,
} from './abTest.shared.js'

export type AbTestResultKey = AbTestAnswerKey

export type AbTestResultDefinition = {
  message_key:
    | 'TEST_RESULT_STATE'
    | 'TEST_RESULT_GOAL'
    | 'TEST_RESULT_CHOICE'
    | 'TEST_RESULT_DECISION'
    | 'TEST_RESULT_ACTION'
  title: string
  msg1: string
  msg1_story: string
  msg1_audio: string
  msg2_audio: string
  msg2_practice: string
  msg2_benefits: string
  msg2_included: string
  msg2_howItWorks: string
  msg2_review: string
  msg3_pricing: string
  msg2: string
  dojim1_recognition: string
  dojim2_price: string
  dojim3_case: string
  dojim4_objection: string
  dojim5_proof: string
  focus_cta: string
  payment_cta: string
  zoom_cta: string
  platform_cta: string
  analytics_hooks: readonly string[]
  blocks?: {
    intro: TelegramContentBlock[]
    practice: TelegramContentBlock[]
    review: TelegramContentBlock[]
    pricing: TelegramContentBlock[]
  }
}

export type TestDriveContentVersion = 'legacy' | 'v2'
export type TestDriveCode = 'A' | 'B' | 'V' | 'G' | 'D'

export type TestDriveResultSurface = {
  title: string
  bodyLines: string[]
  blocks?: TelegramContentBlock[]
  buttons: TelegramButton[][]
}

export type TestDriveFollowupSurface = {
  bodyLines: string[]
}

function defineAbTestResultBase<
  T extends Record<AbTestResultKey, { msg1: string; msg1_story: string }>,
>(value: T): T {
  return value
}

export function interpolateFirstName(
  text: string,
  firstName?: string | null
): string {
  const normalizedName = String(firstName ?? '').trim()
  if (!normalizedName) {
    // Remove {firstName} plus any surrounding punctuation/spaces:
    // handles "**{firstName}, text**" → "**text**"
    // and "{firstName}, text" → "text"
    return text
      .replace(/\{firstName\}[,؛:—–\-\s]*/g, '')
      .replace(/[\s,؛:—–\-]*\{firstName\}/g, '')
      .trim()
  }

  return text.replace(/\{firstName\}/g, normalizedName)
}

const AB_TEST_RESULT_DAILY_PRACTICE_TEXT = AB_TEST_FOCUS_PRACTICE_TEXT
const AB_TEST_RESULT_BENEFITS_TEXT = AB_TEST_FOCUS_BENEFITS_TEXT
const AB_TEST_RESULT_INCLUDED_TEXT = AB_TEST_FOCUS_INCLUDED_TEXT
const AB_TEST_RESULT_HOW_IT_WORKS_TEXT = AB_TEST_FOCUS_HOW_IT_WORKS_TEXT
const AB_TEST_RESULT_PRICING_TEXT = AB_TEST_FOCUS_PRICING_TEXT
const AB_TEST_RESULT_BRIDGE_TEXT =
  'Я не можу пообіцяти що все зміниться за один день. Але коли людина бачить що насправді створює її ситуацію — вона перестає ходити по колу.'
const AB_TEST_RESULT_NADYA_INTRO_TEXT =
  'Мене звати Надя. Вже 3 роки я допомагаю дівчатам виходити з цього кола. Я знаю як допомогти тобі це пройти — послухай 👇'
const AB_TEST_RESULT_AUDIO_PROMPT = AB_TEST_RESULT_AUDIO_PROMPT_TEXT
const AB_TEST_RESULT_TARIFF_SUMMARY = buildAbTestFocusTariffSummaryText()
const AB_TEST_RESULT_CTA_VALUE = AB_TEST_FOCUS_CTA_RESULT_VALUE
const TEST_DRIVE_V2_ROLLOUT_AT = new Date(
  process.env.AB_TEST_TEST_DRIVE_V2_ROLLOUT_AT ?? '2026-06-05T00:00:00.000Z'
)
const SOCIAL_PROOF_LINES = [
  'Neonila: "Я вперше побачила, де саме зупиняю себе. Це було дуже практично."',
  'Nataliia: "Мені зайшло, що все розкладається по кроках, без зайвого тиску."',
  'Valentyna: "Замість хаосу з’явився один зрозумілий наступний крок."',
]
const TEST_DRIVE_INSIDE_STORIES: Record<
  TestDriveCode,
  { title: string; bodyLines: string[] }
> = {
  A: {
    title: 'Всередині це виглядає так: стан → крок',
    bodyLines: [
      'Ми не тиснемо на «зроби ще більше».',
      'Спершу дивимось, у якому стані ти зараз заходиш у дію.',
      'Потім зводимо все до одного маленького кроку, який реально зробити сьогодні.',
      ...AB_TEST_VOICE_NOTE_LINES,
    ],
  },
  B: {
    title: 'Всередині це виглядає так: ціль → ясність',
    bodyLines: [
      'Ми розбираємо не красиву ціль, а ту, яку ти справді тягнеш всередині.',
      'В результаті лишається одна ясна лінія руху без зайвого шуму.',
      'Саме так ціль перестає розтікатися і починає тримати дію.',
      ...AB_TEST_VOICE_NOTE_LINES,
    ],
  },
  V: {
    title: 'Всередині це виглядає так: вибір → фокус',
    bodyLines: [
      'Ми не розводимо тебе по багатьох варіантах.',
      'Показуємо, що саме ти боїшся втратити, коли обираєш.',
      'І допомагаємо лишити один напрямок, який не розпадається на півдорозі.',
      ...AB_TEST_VOICE_NOTE_LINES,
    ],
  },
  G: {
    title: 'Всередині це виглядає так: рішення → фіксація',
    bodyLines: [
      'Тут усе про момент, коли «я вже знаю» перетворюється на «я роблю».',
      'Ми збираємо рішення так, щоб воно не розвалювалось після першої ж паузи.',
      'У результаті з’являється не обіцянка собі, а конкретний наступний крок.',
      ...AB_TEST_VOICE_NOTE_LINES,
    ],
  },
  D: {
    title: 'Всередині це виглядає так: дія → ритм',
    bodyLines: [
      'Ми переводимо дію з разового ривка в повторюваний ритм.',
      'Щоб ти не починала з нуля щоразу, коли день стає складнішим.',
      'Саме ритм робить результат стабільним, а не випадковим.',
      ...AB_TEST_VOICE_NOTE_LINES,
    ],
  },
}
const TEST_DRIVE_RESULT_CODE_MAP: Record<AbTestResultKey, TestDriveCode> = {
  state: 'A',
  goal: 'B',
  choice: 'V',
  decision: 'G',
  action: 'D',
}

function buildResultReviewText(header: string, quote: string): string {
  return buildAbTestReviewText(header, quote)
}

function buildDojimRecognitionText(params: {
  body: string
  resolution: string
}): string {
  return `**Впізнавання**\n\n{firstName}, ти вже зробила перший крок — **пройшла тест** і **відповіла собі чесно**.\n\nБільшість так і не доходить навіть до цього.\n\n${params.body}\n\nСаме тому ти отримала цей результат. **Це не вирок** — це точка ${params.resolution}.\n\n${AB_TEST_FOCUS_RESULT_WORK_TEXT}\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`
}

function buildDojimPriceText(params: {
  question: string
  duration?: string
  outcome: string
  rootCause: string
}): string {
  const durationBlock = params.duration ? `\n\n${params.duration}` : ''

  return `**Ціна бездіяльності**\n\n{firstName}.\n\n**${params.question}**${durationBlock}\n\n**І що змінилось за цей час?**\n\nЯкщо нічого не зміниться — де ти будеш через ще один рік?\n**${params.outcome}**\n\nНа практиці ми дивимось не на симптом. А на **${params.rootCause}**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`
}

function buildDojimCaseText(params: { lead: string; body: string[] }): string {
  return `**Кейс**\n\n{firstName}.\n\n${params.lead}\n\n${params.body.join('\n\n')}\n\nСаме такі ситуації ми розбираємо на **Zoom-практиках**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`
}

function buildDojimObjectionText(params: {
  opening: string
  differentiation: string
  outcome: string
}): string {
  return `**Заперечення**\n\n{firstName}.\n\n${params.opening}\n\nБільшість наших учасниць приходили саме з думкою: **"Я вже все це проходила."**\n\nМожливо тому ти досі тут і читаєш це повідомлення.\n\n**Різниця одна:** ${params.differentiation}\n\nТому **${params.outcome}**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`
}

function buildDojimProofText(proofQuote: string): string {
  return `**Доказ**\n\n{firstName}.\n\nЧерез тиждень після тесту більшість людей повертаються до звичного життя і відкладають це ще на кілька місяців.\n\n**Ти вже знаєш що тебе зупиняє.** Це не так часто буває — що людина бачить це чесно.\n\nНижче відгук після першої практики.\n\n📸 **[СКРІН]**\n\n> ${proofQuote}\n\n${AB_TEST_FOCUS_PROOF_PRICING_TEXT}`
}

// ── Блок 4: СТАН ─────────────────────────────────────────────
const AB_TEST_RESULTS_BASE = defineAbTestResultBase({
  state: {
    message_key: 'TEST_RESULT_STATE',
    msg1: '{firstName}, ось твій результат. Ти тримаєшся з останніх сил. Зараз навіть прості речі забирають більше сил ніж повинні. Тривога, втома, нічого не хочеться — але все одно намагаєшся.',
    msg1_story:
      'Я сама так жила. І знаю що скільки не намагайся з цього стану — воно не змінюється. Не тому що ти недостатньо стараєшся. А тому що неможливо кудись йти коли немає сил навіть почати.',

    title: 'СТАН',

    msg1_audio: AB_TEST_RESULT_NADYA_INTRO_TEXT,
    msg2_audio: AB_TEST_RESULT_AUDIO_PROMPT,
    msg2_practice: AB_TEST_RESULT_DAILY_PRACTICE_TEXT,
    msg2_benefits: AB_TEST_RESULT_BENEFITS_TEXT,
    msg2_included: AB_TEST_RESULT_INCLUDED_TEXT,
    msg2_howItWorks: AB_TEST_RESULT_HOW_IT_WORKS_TEXT,
    msg2_review: buildResultReviewText(
      AB_TEST_REVIEW_HEADERS.state,
      AB_TEST_NEONILA_REVIEW_QUOTE
    ),
    msg3_pricing: AB_TEST_RESULT_PRICING_TEXT,

    dojim1_recognition: buildDojimRecognitionText({
      body: 'Тест показав де ти зараз — **взагалі без сил** і **нічого не хочеться**. І в цьому стані ти все одно намагаєшся щось робити. І злишся що не виходить.',
      resolution: 'з якої починається зміна',
    }),

    dojim2_price: buildDojimPriceText({
      question: 'Скільки часу ти вже тримаєшся з останніх сил?',
      duration: 'Місяць? Пів року? Рік?',
      outcome: 'У тому самому місці. Просто ще більш втомлена.',
      rootCause: 'те що його створює',
    }),

    dojim3_case: buildDojimCaseText({
      lead: '**Юля** тиждень не могла змусити себе взятися за справи. Зранку — як побита. Ввечері — нічого не хочеться.',
      body: [
        'На практиці побачила що **сама обирає як пройде її день** — просто ніколи не думала про це так.',
        '**Наступного ранку** згадала це і **поміняла пластинку в голові**.',
        'Через тиждень написала що **вперше за довгий час** перестала прокидатися з думкою **"як пережити цей день."**',
      ],
    }),

    dojim4_objection: buildDojimObjectionText({
      opening:
        'Можливо ти **вже проходила щось схоже**. Читала. Слухала. Пробувала.',
      differentiation:
        'там ти отримувала інформацію. Тут ми **працюємо з твоєю конкретною ситуацією**. Не загальні поради — а розбір саме того що тебе зупиняє.',
      outcome: 'багато учасниць отримують відповідь вже на першій практиці',
    }),

    dojim5_proof: buildDojimProofText(AB_TEST_DOJIM_7D_REVIEW_QUOTE),

    focus_cta: AB_TEST_RESULT_CTA_VALUE,
    payment_cta: abTestContent.buttons.payFocus1m,
    zoom_cta: abTestContent.buttons.openZoom,
    platform_cta: abTestContent.buttons.openPlatform,
    analytics_hooks: [
      'result_distribution',
      'result_to_focus_ctr',
      'time_to_purchase',
    ],
  },

  goal: {
    message_key: 'TEST_RESULT_GOAL',
    msg1: '{firstName}, ось твій результат. Ти хочеш змін — але куди саме іти, не відчуваєш. Це не відсутність бажань. Це момент коли власний голос перекрили чужі очікування або старі цілі що вже не твої.',
    msg1_story:
      'Насправді ти знаєш чого хочеш. Просто ще не дозволила собі це почути. Я теж так жила — поки не навчилась чути себе а не чужі голоси навколо.',

    title: 'ЦІЛЬ',

    msg1_audio: AB_TEST_RESULT_NADYA_INTRO_TEXT,
    msg2_audio: AB_TEST_RESULT_AUDIO_PROMPT,
    msg2_practice: AB_TEST_RESULT_DAILY_PRACTICE_TEXT,
    msg2_benefits: AB_TEST_RESULT_BENEFITS_TEXT,
    msg2_included: AB_TEST_RESULT_INCLUDED_TEXT,
    msg2_howItWorks: AB_TEST_RESULT_HOW_IT_WORKS_TEXT,
    msg2_review: buildResultReviewText(
      AB_TEST_REVIEW_HEADERS.goal,
      AB_TEST_NATALIIA_REVIEW_QUOTE
    ),
    msg3_pricing: AB_TEST_RESULT_PRICING_TEXT,

    dojim1_recognition: buildDojimRecognitionText({
      body: 'Тест показав де ти зараз — **хочеш змін але не знаєш як хочеш жити**. Лишити як є — не хочеш. Але й куди іти — не знаєш. І від цього стоїш на місці ще більше.',
      resolution: "де ясність нарешті з'явиться",
    }),

    dojim2_price: buildDojimPriceText({
      question: 'Скільки часу ти вже живеш з відчуттям що йдеш не туди?',
      duration: 'Місяць? Рік? Кілька років?',
      outcome: 'У тому самому місці. Просто ще більш розгублена.',
      rootCause: 'те що його створює',
    }),

    dojim3_case: buildDojimCaseText({
      lead: '**Наталія** прийшла з відчуттям що давно хоче щось змінити — але не може пояснити навіщо і куди.',
      body: [
        'На практиці побачила що **насправді хоче** — і **дозволила собі це визнати**.',
        '**Наступного дня** написала рієлтору і почала шукати будинки.',
        'Каже: **"Я так включилась — побачила скільки можливостей втрачаю просто через якісь свої блоки і думки в голові."**',
      ],
    }),

    dojim4_objection: buildDojimObjectionText({
      opening:
        'Може ти **вже писала списки бажань**. Проходила курси. Питала себе чого хочеш.',
      differentiation:
        'там ти отримувала інформацію. Тут ми **працюємо з твоєю конкретною ситуацією** — і **ти нарешті чуєш себе а не чужі поради**.',
      outcome: 'багато учасниць отримують ясність вже на першій практиці',
    }),

    dojim5_proof: buildDojimProofText(AB_TEST_NATALIIA_PROOF_QUOTE),

    focus_cta: AB_TEST_RESULT_CTA_VALUE,
    payment_cta: abTestContent.buttons.payFocus1m,
    zoom_cta: abTestContent.buttons.openZoom,
    platform_cta: abTestContent.buttons.openPlatform,
    analytics_hooks: [
      'result_distribution',
      'result_to_focus_ctr',
      'focus_payment_conversion',
    ],
  },

  choice: {
    message_key: 'TEST_RESULT_CHOICE',
    msg1: '{firstName}, ось твій результат. Варіанти є. Ти думаєш, порівнюєш, зважуєш — і все одно не обираєш. Справа не у варіантах. Справа у страху що стоїть за ними.',
    msg1_story:
      'Я теж довго кружляла в одних і тих самих варіантах. Поки не знайшла де насправді затик. Як тільки побачила що саме лякає — вибір стався сам.',

    title: 'ВИБІР',

    msg1_audio: AB_TEST_RESULT_NADYA_INTRO_TEXT,
    msg2_audio: AB_TEST_RESULT_AUDIO_PROMPT,
    msg2_practice: AB_TEST_RESULT_DAILY_PRACTICE_TEXT,
    msg2_benefits: AB_TEST_RESULT_BENEFITS_TEXT,
    msg2_included: AB_TEST_RESULT_INCLUDED_TEXT,
    msg2_howItWorks: AB_TEST_RESULT_HOW_IT_WORKS_TEXT,
    msg2_review: buildResultReviewText(
      AB_TEST_REVIEW_HEADERS.choice,
      AB_TEST_VALENTYNA_REVIEW_QUOTE
    ),
    msg3_pricing: AB_TEST_RESULT_PRICING_TEXT,

    dojim1_recognition: buildDojimRecognitionText({
      body: 'Тест показав де ти зараз — **варіанти є але страшно зробити неправильно**. І ти знову відкладаєш. І знову думаєш. І знову нічого.',
      resolution: 'де вибір нарешті відбудеться',
    }),

    dojim2_price: buildDojimPriceText({
      question: 'Скільки часу ти вже боїшся зробити неправильно?',
      outcome:
        'Там само. Тільки варіантів стане більше — а рішення все одно не буде.',
      rootCause: 'страх що за ними стоїть',
    }),

    dojim3_case: buildDojimCaseText({
      lead: '**Валентина** довго не могла обрати — залишити роботу чи ні.',
      body: [
        'Казала: **"Боюсь втратити ілюзорну стабільну роботу. Страшно вийти за межи звичного. Страшно ризикнути."**',
        'На практиці побачила що тримається не за роботу — а за **страх що скажуть інші**.',
        '**Як тільки побачила це — вибір стався сам.**',
        'Каже: **"Початок — з чесності з собою."**',
      ],
    }),

    dojim4_objection: buildDojimObjectionText({
      opening: 'Може ти **вже питала подруг**. Шукала знаки. Читала про це.',
      differentiation:
        'подруги кажуть що обрати. Тут ми **дивимось чого ти насправді боїшся втратити** — і **вибір відбувається сам**. Без тиску.',
      outcome: 'багато учасниць роблять вибір вже на першій практиці',
    }),

    dojim5_proof: buildDojimProofText(AB_TEST_CHOICE_PROOF_QUOTE),

    focus_cta: AB_TEST_RESULT_CTA_VALUE,
    payment_cta: abTestContent.buttons.payFocus1m,
    zoom_cta: abTestContent.buttons.openZoom,
    platform_cta: abTestContent.buttons.openPlatform,
    analytics_hooks: [
      'result_distribution',
      'CTA_conversion_rate',
      'question_dropoff_rate',
    ],
  },

  decision: {
    message_key: 'TEST_RESULT_DECISION',
    msg1: '{firstName}, ось твій результат. Ти вже вирішила. Давно. Але щоразу в останній момент щось зупиняє. Це не слабкість і не відсутність волі.',
    msg1_story:
      '«Я все розумію але не роблю» — це була я. Роками. Рішення без внутрішнього «так» не тримається — воно зупиняється перед першим кроком. І знаю як це проходить.',

    title: 'РІШЕННЯ',

    msg1_audio: AB_TEST_RESULT_NADYA_INTRO_TEXT,
    msg2_audio: AB_TEST_RESULT_AUDIO_PROMPT,
    msg2_practice: AB_TEST_RESULT_DAILY_PRACTICE_TEXT,
    msg2_benefits: AB_TEST_RESULT_BENEFITS_TEXT,
    msg2_included: AB_TEST_RESULT_INCLUDED_TEXT,
    msg2_howItWorks: AB_TEST_RESULT_HOW_IT_WORKS_TEXT,
    msg2_review: buildResultReviewText(
      AB_TEST_REVIEW_HEADERS.decision,
      AB_TEST_YELYZAVETA_REVIEW_QUOTE
    ),
    msg3_pricing: AB_TEST_RESULT_PRICING_TEXT,

    dojim1_recognition: buildDojimRecognitionText({
      body: 'Тест показав де ти зараз — **між "вирішила" і "зробила" щось тримає**. Знову починаєш. Знову переносиш. Знову питаєш себе що зі мною не так.',
      resolution: 'де рішення нарешті стане дією',
    }),

    dojim2_price: buildDojimPriceText({
      question: 'Скільки часу ти вже знаєш що треба зробити — але не робиш?',
      duration: 'Місяць? Пів року? Рік?',
      outcome:
        'У тому самому місці. З тим самим рішенням яке так і не стало дією.',
      rootCause: 'те що заважає його прийняти до кінця',
    }),

    dojim3_case: buildDojimCaseText({
      lead: '**Єлизавета** знала що треба змінити роботу — вже рік.',
      body: [
        'Казала собі: **"Я все розумію але не роблю. Що зі мною не так?"**',
        'На практиці побачила що **рішення вже прийняте** — але **кожного разу тихенько замінялось на "почекати ще трошки."**',
        '**Після практики** вперше зробила конкретний крок. Не тому що стало легше. А тому що **побачила що саме її тримало**.',
      ],
    }),

    dojim4_objection: buildDojimObjectionText({
      opening: 'Може ти **вже читала про це**. Слухала подкасти. Знаєш теорію.',
      differentiation:
        'знати і зробити — це різні речи. Тут ми **знаходимо що саме тебе тримає між "вирішила" і "зробила"** — і **перший крок відбувається ще під час практики**.',
      outcome: 'багато учасниць виходять з практики вже з конкретним кроком',
    }),

    dojim5_proof: buildDojimProofText(AB_TEST_DECISION_PROOF_QUOTE),

    focus_cta: AB_TEST_RESULT_CTA_VALUE,
    payment_cta: abTestContent.buttons.payFocus1m,
    zoom_cta: abTestContent.buttons.openZoom,
    platform_cta: abTestContent.buttons.openPlatform,
    analytics_hooks: [
      'result_distribution',
      'CTA_conversion_rate',
      'payment_abandonment_rate',
    ],
  },

  action: {
    message_key: 'TEST_RESULT_ACTION',
    msg1: '{firstName}, ось твій результат. Ти робиш. Багато і постійно. Але відчуття що крутишся на місці — не минає. Більше дій — не вихід.',
    msg1_story:
      'Одна точна дія дає більше ніж десять хаотичних. Я сама так кружляла — поки не зрозуміла де справжня точка входу.',

    title: 'ДІЯ',

    msg1_audio: AB_TEST_RESULT_NADYA_INTRO_TEXT,
    msg2_audio: AB_TEST_RESULT_AUDIO_PROMPT,
    msg2_practice: AB_TEST_RESULT_DAILY_PRACTICE_TEXT,
    msg2_benefits: AB_TEST_RESULT_BENEFITS_TEXT,
    msg2_included: AB_TEST_RESULT_INCLUDED_TEXT,
    msg2_howItWorks: AB_TEST_RESULT_HOW_IT_WORKS_TEXT,
    msg2_review: buildResultReviewText(
      AB_TEST_REVIEW_HEADERS.action,
      AB_TEST_KSENIIA_REVIEW_QUOTE_2
    ),
    msg3_pricing: AB_TEST_RESULT_PRICING_TEXT,

    dojim1_recognition: buildDojimRecognitionText({
      body: 'Тест показав де ти зараз — **робиш багато але ходиш по колу**. І сама не розумієш чому нічого не змінюється. І берешся за нове. І знову по колу.',
      resolution: 'де твої дії нарешті почнуть вести до результату',
    }),

    dojim2_price: buildDojimPriceText({
      question: 'Скільки часу ти вже робиш багато — але воно нікуди не веде?',
      duration: 'Місяць? Пів року? Рік?',
      outcome:
        'Там само. Тільки ще більш втомлена від дій які нічого не дають.',
      rootCause: 'те чому вони не ведуть до результату',
    }),

    dojim3_case: buildDojimCaseText({
      lead: '**Ксенія** робила багато — контент, навчання, нові проєкти. Але **відчуття що ходить по колу** не минало.',
      body: [
        'На практиці побачила що **кожна її дія починається з нуля** — без розуміння куди веде.',
        '**Після практики** вперше зробила одну дію — але точну. Ту що насправді мала сенс.',
        `Каже: **${AB_TEST_KSENIIA_REVIEW_QUOTE_1}**`,
      ],
    }),

    dojim4_objection: buildDojimObjectionText({
      opening:
        'Може ти **вже брала нові курси**. Читала книги про продуктивність. Пробувала нові підходи.',
      differentiation:
        'більше дій — не вихід. Тут ми **знаходимо де саме все розсипається** — і замість списку нових дій **ти виходиш з одним кроком**. Але точним. Тим що нарешті веде до результату.',
      outcome:
        'багато учасниць після першої практики вперше відчувають що бачать результат, а не просто зайняті',
    }),

    dojim5_proof: buildDojimProofText(AB_TEST_ACTION_PROOF_QUOTE),

    focus_cta: AB_TEST_RESULT_CTA_VALUE,
    payment_cta: abTestContent.buttons.payFocus1m,
    zoom_cta: abTestContent.buttons.openZoom,
    platform_cta: abTestContent.buttons.openPlatform,
    analytics_hooks: [
      'result_distribution',
      'CTA_conversion_rate',
      'return_after_message_rate',
    ],
  },
} as const)

export const AB_TEST_RESULTS = AB_TEST_RESULTS_BASE as unknown as Record<
  AbTestResultKey,
  AbTestResultDefinition
>

for (const key of Object.keys(AB_TEST_RESULTS) as AbTestResultKey[]) {
  const result = AB_TEST_RESULTS[key]

  result.msg2 = [
    result.msg2_practice,
    result.msg2_benefits,
    result.msg2_included,
    result.msg2_howItWorks,
    result.msg2_review,
    result.msg3_pricing,
  ].join('\n\n')

  result.blocks = buildAbTestResultBlocks(key, result)
}

function buildAbTestResultBlocks(
  resultKey: AbTestResultKey,
  result: AbTestResultDefinition
): NonNullable<AbTestResultDefinition['blocks']> {
  const reviewHeader = extractReviewHeader(result.msg2_review)
  const reviewQuote = extractReviewQuote(result.msg2_review)
  const screenshotKey = resultKeyToScreenshotKey(resultKey)

  return {
    intro: [
      telegramBlock.text(result.msg1),
      telegramBlock.text(result.msg1_story),
      telegramBlock.text(AB_TEST_RESULT_BRIDGE_TEXT),
      telegramBlock.text(AB_TEST_RESULT_NADYA_INTRO_TEXT),
      telegramBlock.audio(AB_TEST_AUDIO_URL),
    ],
    practice: [
      telegramBlock.text(result.msg2_practice),
      telegramBlock.text(result.msg2_benefits),
      telegramBlock.text(result.msg2_included),
      telegramBlock.text(result.msg2_howItWorks),
    ],
    review: [
      // text + quote рендеряться одним повідомленням через splitReviewSequence:
      // [text(header), quote(quote)] → renderTelegramContentBlocks → join('\n\n')
      // Результат: "Єлизавета написала...\n\n<blockquote>Завдяки...</blockquote>"
      telegramBlock.text(reviewHeader),
      telegramBlock.quote(reviewQuote),
      telegramBlock.image(AB_TEST_SCREENSHOT_URLS[screenshotKey]),
    ],
    pricing: [telegramBlock.text(result.msg3_pricing)],
  }
}

function extractReviewHeader(text: string): string {
  // Пропускаємо рядки-маркери скріну, беремо перший рядок з текстом після них
  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('📸')) continue
    // Прибираємо markdown bold **...**
    return trimmed.replace(/^\*\*(.*)\*\*$/, '$1').trim()
  }
  return ''
}

function extractReviewQuote(text: string): string {
  const match = text.match(/>\s*"([\s\S]+?)"/)
  return match?.[1] ?? ''
}

function resultKeyToScreenshotKey(
  resultKey: AbTestResultKey
): keyof typeof AB_TEST_SCREENSHOT_URLS {
  switch (resultKey) {
    case 'state':
      return 'state_review'
    case 'goal':
      return 'goal_review'
    case 'choice':
      return 'choice_review'
    case 'decision':
      return 'decision_review'
    case 'action':
      return 'action_review_1'
  }
}

export function getAbTestResultDefinition(
  resultKey: AbTestResultKey
): AbTestResultDefinition {
  return AB_TEST_RESULTS[resultKey]
}

export const testDriveContent = {
  rolloutAt: TEST_DRIVE_V2_ROLLOUT_AT,
  socialProof: SOCIAL_PROOF_LINES,
  insideStories: TEST_DRIVE_INSIDE_STORIES,
  resultCodeMap: TEST_DRIVE_RESULT_CODE_MAP,
} as const

function normalizeStartedAt(startedAt?: string | null): number | null {
  if (!startedAt) return null
  const time = Date.parse(startedAt)
  return Number.isFinite(time) ? time : null
}

export function resolveTestDriveVersion(
  startedAt?: string | null
): TestDriveContentVersion {
  const normalized = normalizeStartedAt(startedAt)
  if (normalized === null) return 'legacy'
  return normalized >= TEST_DRIVE_V2_ROLLOUT_AT.getTime() ? 'v2' : 'legacy'
}

export function resolveTestDriveCode(
  resultKey?: AbTestResultKey | null
): TestDriveCode | null {
  if (!resultKey) return null
  return TEST_DRIVE_RESULT_CODE_MAP[resultKey] ?? null
}

export function getTestDriveResultSurface(input: {
  resultKey?: AbTestResultKey | null
  startedAt?: string | null
}): TestDriveResultSurface | null {
  if (resolveTestDriveVersion(input.startedAt) !== 'v2') return null
  const code = resolveTestDriveCode(input.resultKey)
  if (!code) return null

  return {
    title: AB_TEST_FOCUS_PRACTICE_TITLE,
    bodyLines: [
      ...AB_TEST_FOCUS_PRACTICE_FULL_LINES,
      '',
      '📸 [СКРІН — test_drive_result_review]',
      '',
      ...AB_TEST_FOCUS_PITCH_LINES,
    ],
    blocks: [
      telegramBlock.text(AB_TEST_FOCUS_PRACTICE_TITLE),
      ...AB_TEST_FOCUS_PRACTICE_CORE_LINES.filter(Boolean).map((line) =>
        telegramBlock.text(line)
      ),
      telegramBlock.image(AB_TEST_SCREENSHOT_URLS.test_drive_result_review),
      ...AB_TEST_FOCUS_TEST_DRIVE_PITCH_BLOCKS,
    ],
    buttons: [
      [
        {
          text: AB_TEST_SHOW_INSIDE_CTA_MULTILINE_TEXT,
          callback_data: 'ab_test:test_drive',
        },
      ],
    ],
  }
}

export function getTestDriveInsideSurface(input: {
  resultKey?: AbTestResultKey | null
  startedAt?: string | null
}): TestDriveResultSurface | null {
  if (resolveTestDriveVersion(input.startedAt) !== 'v2') return null
  const code = resolveTestDriveCode(input.resultKey)
  if (!code) return null

  return {
    title: AB_TEST_FOCUS_PRACTICE_TITLE,
    bodyLines: [
      ...AB_TEST_FOCUS_PRACTICE_FULL_LINES,
      '',
      '📸 [СКРІН — test_drive_inside_review]',
      '',
      ...AB_TEST_FOCUS_PITCH_LINES,
    ],
    blocks: [
      telegramBlock.text(AB_TEST_FOCUS_PRACTICE_TITLE),
      ...AB_TEST_FOCUS_PRACTICE_CORE_LINES.filter(Boolean).map((line) =>
        telegramBlock.text(line)
      ),
      telegramBlock.image(AB_TEST_SCREENSHOT_URLS.test_drive_inside_review),
      ...AB_TEST_FOCUS_TEST_DRIVE_PITCH_BLOCKS,
    ],
    buttons: [
      [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
    ],
  }
}

export function getTestDriveInsideResponseSurface(input: {
  resultKey?: AbTestResultKey | null
}): TestDriveResultSurface | null {
  const code = resolveTestDriveCode(input.resultKey)
  if (!code) return null

  return {
    title: AB_TEST_FOCUS_PRACTICE_TITLE,
    bodyLines: [
      ...AB_TEST_FOCUS_PRACTICE_FULL_LINES,
      '',
      '📸 [СКРІН — test_drive_response_review]',
      '',
      ...AB_TEST_FOCUS_PITCH_LINES,
    ],
    blocks: [
      telegramBlock.text(AB_TEST_FOCUS_PRACTICE_TITLE),
      ...AB_TEST_FOCUS_PRACTICE_CORE_LINES.filter(Boolean).map((line) =>
        telegramBlock.text(line)
      ),
      telegramBlock.image(AB_TEST_SCREENSHOT_URLS.test_drive_response_review),
      ...AB_TEST_FOCUS_TEST_DRIVE_PITCH_BLOCKS,
    ],
    buttons: [
      [
        {
          text: AB_TEST_FOCUS_JOIN_CTA_TEXT,
          callback_data: 'open_focus_payment',
        },
      ],
    ],
  }
}

export function getTestDriveFollowupBodyLines(input: {
  timerId: AbTestFollowupTimerId
  resultKey?: AbTestResultKey | null
  version?: TestDriveContentVersion
}): string[] {
  void input
  return []
}

export const BLOCK9_POST_RESULT = {
  text: [
    'Тест показав твою головну точку на зараз.',
    '',
    'У ФОКУСІ ми раз на тиждень працюємо з такими ситуаціями наживо.',
    'Ти приходиш із реальною темою:',
    '— що відкладаєш;',
    '— яке рішення переносиш;',
    '— яка ціль не рухається;',
    '— який крок можна зробити цього тижня.',
    '',
    'ФОКУС — це перший платний вхід в AB System.',
  ].join('\n'),
  cta: AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT,
  callbackData: 'open_focus_payment',
  blocks: [
    telegramBlock.text('Тест показав твою головну точку на зараз.'),
    telegramBlock.text(
      'У ФОКУСІ ми раз на тиждень працюємо з такими ситуаціями наживо.'
    ),
    telegramBlock.text(
      'Ти приходиш із реальною темою: що відкладаєш, яке рішення переносиш, яка ціль не рухається, який крок можна зробити цього тижня.'
    ),
    telegramBlock.text('ФОКУС — це перший платний вхід в AB System.'),
    AB_TEST_FOCUS_CTA_BLOCK,
  ],
} as const

export const BLOCK10_FOCUS = {
  text: [
    AB_TEST_FOCUS_TITLE_STYLED,
    '',
    AB_TEST_FOCUS_WEEKLY_TEXT_BOLD,
    '',
    AB_TEST_FOCUS_REAL_SITUATION_HEADER,
    ...AB_TEST_FOCUS_REAL_SITUATION_LINES,
    '',
    AB_TEST_FOCUS_TARIFF_HEADER_BOLD,
    '',
    AB_TEST_FOCUS_PRICE_1M,
    AB_TEST_FOCUS_PRICE_3M,
  ].join('\n'),
  cta_1m: AB_TEST_FOCUS_PAYMENT_CTA_1M,
  cta_3m: AB_TEST_FOCUS_PAYMENT_CTA_3M,
  blocks: [
    // Весь текстовий опис ФОКУС — одне повідомлення.
    // **...** → <b>...</b> через renderInlineBoldMarkdown в рендерері.
    telegramBlock.text(
      `**${AB_TEST_FOCUS_TITLE_PLAIN}**\n\n` +
      `**${AB_TEST_FOCUS_WEEKLY_TEXT}**\n\n` +
      `${AB_TEST_FOCUS_REAL_SITUATION_INLINE}\n\n` +
      `**${AB_TEST_FOCUS_TARIFF_HEADER}**\n\n` +
      `${AB_TEST_FOCUS_PRICE_1M}\n${AB_TEST_FOCUS_PRICE_3M}`
    ),
  ],
} as const
