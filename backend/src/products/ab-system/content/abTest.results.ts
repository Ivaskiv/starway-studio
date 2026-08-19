//backend/src/products/ab-system/content/abTest.results.ts
import type { AbTestAnswerKey } from './abTest.questions.js'
import {
  AB_TEST_AUDIO_URL,
  AB_TEST_ACTION_PROOF_QUOTE,
  AB_TEST_CHOICE_PROOF_QUOTE,
  AB_TEST_DECISION_PROOF_QUOTE,
  AB_TEST_DOJIM_7D_REVIEW_QUOTE,
  AB_TEST_FOCUS_BENEFITS_TEXT,
  AB_TEST_FOCUS_CTA_MARKER,
  AB_TEST_FOCUS_CTA_RESULT_VALUE,
  AB_TEST_FOCUS_HOW_IT_WORKS_TEXT,
  AB_TEST_FOCUS_INCLUDED_TEXT,
  AB_TEST_FOCUS_INCLUDED_STANDARD_TEXT,
  AB_TEST_FOCUS_PRACTICE_TEXT,
  AB_TEST_FOCUS_PRICING_TEXT,
  AB_TEST_FOCUS_PROOF_PRICING_TEXT,
  AB_TEST_FOCUS_RESULT_WORK_TEXT,
  AB_TEST_KSENIIA_REVIEW_QUOTE_1,
  AB_TEST_KSENIIA_REVIEW_QUOTE_2,
  AB_TEST_NATALIIA_PROOF_QUOTE,
  AB_TEST_NATALIIA_REVIEW_QUOTE,
  AB_TEST_NEONILA_REVIEW_QUOTE,
  AB_TEST_REVIEW_HEADERS,
  AB_TEST_RESULT_AUDIO_PROMPT_TEXT,
  AB_TEST_SCREENSHOT_URLS,
  AB_TEST_VALENTYNA_REVIEW_QUOTE,
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

function defineAbTestResultBase<
  T extends Record<AbTestResultKey, { msg1: string; msg1_story: string }>,
>(value: T): T {
  return value
}

const AB_TEST_RESULT_PRICING_TEXT = AB_TEST_FOCUS_PRICING_TEXT
const AB_TEST_RESULT_AUDIO_PROMPT = AB_TEST_RESULT_AUDIO_PROMPT_TEXT
const AB_TEST_RESULT_TARIFF_SUMMARY = buildAbTestFocusTariffSummaryText()
const AB_TEST_RESULT_CTA_VALUE = AB_TEST_FOCUS_CTA_RESULT_VALUE
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
    msg1:
      'Зараз ти живеш більше на автоматі. Робиш те, що треба, але це забирає занадто багато сил. Усередині накопичилася втома, і через це навіть те, що колись було простим, зараз здається важким.',
    msg1_story:
      'Я дуже добре знаю цей стан. Скільки б ти не обіцяла собі почати з понеділка чи взяти себе в руки — нічого не виходить. Бо коли сил майже немає, проблема не в дисципліні. Проблема в тому, що немає з чого ці сили взяти.',

    title: 'СТАН',

    msg1_audio:
      'Мене звати Надя.\nЯ вже три роки допомагаю дівчатам  вибратися зі стану, який ти зараз побачила у своєму результаті. Хочу поділитися тим, що зрозуміла за цей час. Думаю, тобі це зараз буде дуже вчасно.\nПослухай голосове. 👇',
    msg2_audio:
      'Все не зміниться за один день. Але коли ти розумієш, звідки насправді починаються твої проблеми, рішення стають зовсім іншими. І життя потроху перестає повторювати один і той самий сценарій.',
    msg2_practice:
      '**ФОКУС** — це зустріч раз на тиждень.\nТи приходиш зі **своєю ситуацією**. Такою, яка є зараз. Якщо немає сил, якщо все заплуталося, якщо не знаєш, що робити далі — цього достатньо.\nМи беремо **одну твою ситуацію і разом розбираємося**, чому вона ніяк не вирішується.',
    msg2_benefits:
      '**На кожному Zoom ми:**\n• розбираємо одну твою ситуацію;\n• знаходимо, чому вона повторюється;\n• дивимося, що зараз заважає її вирішити;\n• визначаємо твій наступний крок.',
    msg2_included:
      '**У ФОКУС ти отримуєш:**\n**• 4 живі Zoom-розбори  щомісяця;**\n**• закритий Telegram-чат;**\n**• мою підтримку і підтримку учасниць;**\n**• записи всіх Zoom-розборів.**\nТобі не потрібно чекати наступної зустрічі, якщо з\'явилося запитання або складна ситуація. Ти завжди можеш написати в чат.',
    msg2_howItWorks: AB_TEST_FOCUS_HOW_IT_WORKS_TEXT,
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
    msg1:
      '{firstName}, Ти хочеш змін, але не розумієш, з чого почати. Начебто варіантів багато, але жоден не здається правильним. Через це рішення відкладаються, а життя ніби стоїть на місці.',
    msg1_story:
      'Насправді відповідь у тебе вже є. Просто зараз її не так легко почути.\nЯ теж колись постійно сумнівалася. Прислухалася до чужих порад, шукала правильне рішення, а своє відчуття відкладала. І тільки з часом зрозуміла, наскільки це віддаляє від себе.',

    title: 'ЦІЛЬ',

    msg1_audio:
      'Мене звати Надя.\nОстанні три роки я працюю з жінками, які проходять через схожі ситуації. Хочу коротко розповісти, що я побачила за цей час і чому багато хто знову і знову стикається з одними й тими самими ситуаціями.\nПослухай голосове. 👇',
    msg2_audio:
      'За один день життя не змінюється.\nАле коли ти починаєш розуміти, чому знову опиняєшся в одній і тій самій ситуації, стає набагато легше приймати зовсім інші рішення.',
    msg2_practice:
      'ФОКУС — це раз на тиждень живий Zoom-розбір.\nТи приходиш зі **своєю ситуацією**. Не потрібно мати готові відповіді.\nМи розбираємося, чому ти зараз не бачиш виходу, і знаходимо, з чого почати.',
    msg2_benefits:
      'На кожному  Zoom-розборі ти:\n• розбираєш одну свою ситуацію;\n• починаєш розуміти, чому вона ніяк не вирішується;\n• бачиш, що робити далі;\n• йдеш із чітким наступним кроком.',
    msg2_included:
      AB_TEST_FOCUS_INCLUDED_STANDARD_TEXT,
    msg2_howItWorks: AB_TEST_FOCUS_HOW_IT_WORKS_TEXT,
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
    msg1:
      '{firstName}, ось твій результат.\nТи ніби знаєш, які є варіанти. Але щойно потрібно обрати один, з\'являється страх помилитися. І саме він найчастіше зупиняє.',
    msg1_story:
      'Я теж довго не могла зробити вибір. Постійно все зважувала, змінювала рішення, сумнівалася.\nА потім зрозуміла, що насправді мене зупиняє. Після цього приймати рішення стало набагато легше.',

    title: 'ВИБІР',

    msg1_audio:
      'Мене звати Надя.\nЗа останні три роки я побачила, що багато жінок приходять із різними історіями. Але причина, через яку вони роками не можуть вирішити свою проблему, часто одна й та сама.\nПослухай голосове. Там поясню, що я маю на увазі. 👇',
    msg2_audio:
      'Я не обіцяю швидких змін.\nАле коли бачиш, чому приймаєш саме такі рішення, багато що стає на свої місця. І тоді з\'являється можливість діяти по-іншому',
    msg2_practice:
      'ФОКУС — це раз на тиждень живий Zoom-розбір.\nТи приходиш зі **своєю ситуацією**. Якщо зараз кружляєш між варіантами — ми не будемо говорити, що тобі обрати.\nМи разом розбираємося, чому так важко прийняти рішення, і знаходимо, з чого почати.',
    msg2_benefits:
      'На кожному Zoom-розборі ти:\n• розбираєш одну свою ситуацію;\n• починаєш розуміти, чому так важко зробити вибір;\n• бачиш, що робити далі;\n• йдеш із чітким наступним кроком.',
    msg2_included:
      AB_TEST_FOCUS_INCLUDED_STANDARD_TEXT,
    msg2_howItWorks: AB_TEST_FOCUS_HOW_IT_WORKS_TEXT,
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
    msg1:
      '{firstName}, ось твій результат.\nТи вже знаєш, яке рішення хочеш прийняти. Але щоразу в останній момент відкладаєш його. І так повторюється знову і знову.',
    msg1_story:
      '«Я все розумію, але не роблю» — це була я. Роками.\nЗдавалося, що ще трохи — і я нарешті почну. Але це «ще трохи» повторювалося знову і знову. Усе змінилося, коли я зрозуміла, що мене насправді зупиняє.',

    title: 'РІШЕННЯ',

    msg1_audio:
      'Мене звати Надя.\nЗа останні три роки я побачила, що найважче — не прийняти рішення. Найважче — зробити перший крок після нього.\nПослухай голосове. Там розповім, чому так відбувається. 👇',
    msg2_audio:
      'Я не обіцяю швидких змін.\nАле коли стає зрозуміло, чому ти постійно відкладаєш, нарешті з\'являються сили зробити те, що давно хотіла.',
    msg2_practice:
      'ФОКУС — це раз на тиждень живий Zoom-розбір.\nТи приходиш зі **своєю ситуацією**. Якщо вже давно все вирішила, але ніяк не можеш зробити перший крок — ми не будемо тебе підганяти.\nМи разом розбираємося, що саме тебе зараз зупиняє.',
    msg2_benefits:
      'На кожному Zoom-розборі ти:\n• розбираєш одну свою ситуацію;\n• починаєш розуміти, що зупиняє тебе перед першим кроком;\n• бачиш, що робити далі;\n• йдеш із чітким наступним кроком.',
    msg2_included:
      AB_TEST_FOCUS_INCLUDED_STANDARD_TEXT,
    msg2_howItWorks: AB_TEST_FOCUS_HOW_IT_WORKS_TEXT,
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
    msg1:
      '{firstName}, ось твій результат.\nТи не сидиш без діла. Постійно щось вирішуєш, плануєш, робиш. Але результат зовсім не такий, якого очікувала.',
    msg1_story:
      'Я теж довго намагалася вирішити все одразу. Робила більше, брала нові задачі, шукала інші підходи.\nАле справа була не в кількості дій. Потрібно було зрозуміти, куди саме спрямувати увагу.',

    title: 'ДІЯ',

    msg1_audio:
      'Мене звати Надя.\nОстанні три роки я працюю з жінками, які хочуть змін, але втомилися постійно бігти й не бачити результату.\nУ голосовому розповім, що я помітила за цей час. 👇',
    msg2_audio:
      'Я не обіцяю, що все зміниться за один день.\nАле коли стає зрозуміло, чому твої дії не приводять до бажаного результату, можна перестати просто робити більше і почати рухатися в потрібному напрямку.',
    msg2_practice:
      'ФОКУС — це раз на тиждень живий Zoom-розбір.\nТи приходиш зі своєю реальною ситуацією. Якщо зараз робиш багато, але результату немає — ми не додаємо тобі ще більше завдань.\nМи розбираємося, чому те, що ти вже робиш, не приводить туди, куди хочеться.',
    msg2_benefits:
      'На кожному Zoom-розборі ти:\n• розбираєш одну свою ситуацію;\n• бачиш, чому твої дії зараз не дають потрібного результату;\n• знаходиш, що варто змінити в першу чергу;\n• йдеш із конкретним наступним кроком.',
    msg2_included:
      AB_TEST_FOCUS_INCLUDED_STANDARD_TEXT,
    msg2_howItWorks: AB_TEST_FOCUS_HOW_IT_WORKS_TEXT,
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
  const screenshotKey = resultKeyToScreenshotKey(resultKey)

  return {
    intro: [
      telegramBlock.text(result.msg1),
      telegramBlock.text(result.msg1_story),
      telegramBlock.text(result.msg2_audio),
      telegramBlock.text(result.msg1_audio),
      telegramBlock.audio(AB_TEST_AUDIO_URL),
    ],
    practice: [
      telegramBlock.text(result.msg2_practice),
      telegramBlock.text(result.msg2_benefits),
      telegramBlock.text(result.msg2_included),
    ],
    review: [
      telegramBlock.text(reviewHeader),
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

export { interpolateFirstName } from './abTest.results.utils.js'
export * from './abTest.results.test-drive.js'
