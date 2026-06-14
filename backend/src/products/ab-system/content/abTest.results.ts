//backend/src/products/ab-system/content/abTest.results.ts
import { abTestContent } from './abTest.content.js'
import type { AbTestAnswerKey } from './abTest.questions.js'
import {
  AB_TEST_ACTION_AUDIO_REVIEW_TEXT,
  AB_TEST_ACTION_PROOF_QUOTE,
  AB_TEST_AUDIO_URL,
  AB_TEST_CHOICE_PROOF_QUOTE,
  AB_TEST_DECISION_PROOF_QUOTE,
  AB_TEST_DOJIM_7D_REVIEW_QUOTE,
  AB_TEST_FOCUS_CTA_BLOCK,
  AB_TEST_FOCUS_CTA_MARKER,
  AB_TEST_FOCUS_CTA_RESULT_VALUE,
  AB_TEST_FOCUS_HOW_IT_WORKS_TEXT,
  AB_TEST_FOCUS_INCLUDED_TEXT,
  AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT,
  AB_TEST_FOCUS_PAYMENT_CTA_1M,
  AB_TEST_FOCUS_PAYMENT_CTA_3M,
  AB_TEST_FOCUS_PRICE_1M,
  AB_TEST_FOCUS_PRICE_3M,
  AB_TEST_FOCUS_PROOF_PRICING_TEXT,
  AB_TEST_FOCUS_PRACTICE_TEXT,
  AB_TEST_FOCUS_PRICING_TEXT,
  AB_TEST_FOCUS_REAL_SITUATION_HEADER,
  AB_TEST_FOCUS_REAL_SITUATION_INLINE,
  AB_TEST_FOCUS_REAL_SITUATION_LINES,
  AB_TEST_FOCUS_RESULT_WORK_TEXT,
  AB_TEST_FOCUS_TARIFF_HEADER,
  AB_TEST_FOCUS_TARIFF_HEADER_BOLD,
  AB_TEST_FOCUS_TITLE_PLAIN,
  AB_TEST_FOCUS_TITLE_STYLED,
  AB_TEST_FOCUS_WEEKLY_TEXT,
  AB_TEST_FOCUS_WEEKLY_TEXT_BOLD,
  AB_TEST_FOCUS_BENEFITS_TEXT,
  AB_TEST_KSENIIA_REVIEW_HEADER,
  AB_TEST_KSENIIA_REVIEW_QUOTE_1,
  AB_TEST_KSENIIA_REVIEW_QUOTE_2,
  AB_TEST_NEONILA_REVIEW_HEADER,
  AB_TEST_NEONILA_REVIEW_QUOTE,
  AB_TEST_NATALIIA_PROOF_QUOTE,
  AB_TEST_NATALIIA_REVIEW_HEADER,
  AB_TEST_NATALIIA_REVIEW_QUOTE,
  AB_TEST_SCREENSHOT_URLS,
  AB_TEST_VALENTYNA_REVIEW_HEADER,
  AB_TEST_VALENTYNA_REVIEW_QUOTE,
  AB_TEST_YELYZAVETA_REVIEW_HEADER,
  AB_TEST_YELYZAVETA_REVIEW_QUOTE,
  AB_TEST_RESULT_AUDIO_INTRO_TEXT,
  AB_TEST_RESULT_AUDIO_PROMPT_TEXT,
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
    proof: TelegramContentBlock[]
  }
}

function defineAbTestResultBase<T extends Record<AbTestResultKey, { msg1: string }>>(
  value: T
): T {
  return value
}

export function interpolateFirstName(
  text: string,
  firstName?: string | null
): string {
  const normalizedName = String(firstName ?? '').trim()
  if (!normalizedName) {
    return text.replace(/\{firstName\}/g, '').replace(/^[\s,؛:—–-]+/, '')
  }

  return text.replace(/\{firstName\}/g, normalizedName)
}

const AB_TEST_RESULT_DAILY_PRACTICE_TEXT = AB_TEST_FOCUS_PRACTICE_TEXT
const AB_TEST_RESULT_BENEFITS_TEXT = AB_TEST_FOCUS_BENEFITS_TEXT
const AB_TEST_RESULT_INCLUDED_TEXT = AB_TEST_FOCUS_INCLUDED_TEXT
const AB_TEST_RESULT_HOW_IT_WORKS_TEXT = AB_TEST_FOCUS_HOW_IT_WORKS_TEXT
const AB_TEST_RESULT_PRICING_TEXT = AB_TEST_FOCUS_PRICING_TEXT
const AB_TEST_RESULT_AUDIO_TEXT = AB_TEST_RESULT_AUDIO_INTRO_TEXT
const AB_TEST_RESULT_AUDIO_PROMPT = AB_TEST_RESULT_AUDIO_PROMPT_TEXT
const AB_TEST_RESULT_TARIFF_SUMMARY = buildAbTestFocusTariffSummaryText()
const AB_TEST_RESULT_CTA_VALUE = AB_TEST_FOCUS_CTA_RESULT_VALUE

function buildResultReviewText(header: string, quote: string): string {
  return buildAbTestReviewText(header, quote)
}

// ── Блок 4: СТАН ─────────────────────────────────────────────
const AB_TEST_RESULTS_BASE = defineAbTestResultBase({
    state: {
      message_key: 'TEST_RESULT_STATE',
      title: 'СТАН',

      msg1: '**{firstName}, ось твій результат.**\n\n**Тримаєшся з останніх сил.**\n\nЗараз навіть прості речи забирають більше сил ніж повинні. Через це відкладається те що для тебе важливо.\n\nТривога, втома, нічого не хочеться — але все одно намагаєшся. Бо треба. Бо інакше взагалі нічого не буде.\n\nЯ сама так жила. І знаю що скільки не намагайся з цього стану — воно не змінюється. Не тому що ти недостатньо стараєшся. А тому що неможливо кудись іти коли немає сил навіть почати.\n\nМене звати **Надя**. Вже **3 роки** я допомагаю жінкам виходити з цього кола через систему **AB System**.',

      msg1_audio: AB_TEST_RESULT_AUDIO_TEXT,
      msg2_audio: AB_TEST_RESULT_AUDIO_PROMPT,
      msg2_practice: AB_TEST_RESULT_DAILY_PRACTICE_TEXT,
      msg2_benefits: AB_TEST_RESULT_BENEFITS_TEXT,
      msg2_included: AB_TEST_RESULT_INCLUDED_TEXT,
      msg2_howItWorks: AB_TEST_RESULT_HOW_IT_WORKS_TEXT,
      msg2_review: buildResultReviewText(
        AB_TEST_NEONILA_REVIEW_HEADER,
        AB_TEST_NEONILA_REVIEW_QUOTE,
      ),
      msg3_pricing: AB_TEST_RESULT_PRICING_TEXT,

      dojim1_recognition:
        `**Впізнавання**\n\n{firstName}, ти вже зробила перший крок — **пройшла тест** і **відповіла собі чесно**.\n\nБільшість так і не доходить навіть до цього.\n\nТест показав де ти зараз — **взагалі без сил** і **нічого не хочеться**. І в цьому стані ти все одно намагаєшся щось робити. І злишся що не виходить.\n\nСаме тому ти отримала цей результат. **Це не вирок** — це точка з якої починається зміна.\n\n${AB_TEST_FOCUS_RESULT_WORK_TEXT}\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim2_price:
        `**Ціна бездіяльності**\n\n{firstName}.\n\n**Скільки часу ти вже тримаєшся з останніх сил?**\n\nМісяць? Пів року? Рік?\n\n**І що змінилось за цей час?**\n\nЯкщо нічого не зміниться — де ти будеш через ще один рік?\n**У тому самому місці. Просто ще більш втомлена.**\n\nНа практиці ми дивимось не на симптом. А на **те що його створює**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim3_case:
        `**Кейс**\n\n{firstName}.\n\n**Юля** тиждень не могла змусити себе взятися за справи. Зранку — як побита. Ввечері — нічого не хочеться.\n\nНа практиці побачила що **сама обирає як пройде її день** — просто ніколи не думала про це так.\n\n**Наступного ранку** згадала це і **поміняла пластинку в голові**.\n\nЧерез тиждень написала що **вперше за довгий час** перестала прокидатися з думкою **"як пережити цей день."**\n\nСаме такі ситуації ми розбираємо на **Zoom-практиках**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim4_objection:
        `**Заперечення**\n\n{firstName}.\n\nМожливо ти **вже проходила щось схоже**. Читала. Слухала. Пробувала.\n\nБільшість наших учасниць приходили саме з думкою: **"Я вже все це проходила."**\n\nМожливо тому ти досі тут і читаєш це повідомлення.\n\n**Різниця одна:** там ти отримувала інформацію. Тут ми **працюємо з твоєю конкретною ситуацією**. Не загальні поради — а розбір саме того що тебе зупиняє.\n\nТому **багато учасниць отримують відповідь вже на першій практиці**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim5_proof:
        `**Доказ**\n\n{firstName}.\n\nЧерез тиждень після тесту більшість людей повертаються до звичного життя і відкладають це ще на кілька місяців.\n\n**Ти вже знаєш що тебе зупиняє.** Це не так часто буває — що людина бачить це чесно.\n\nНижче відгук після першої практики.\n\n📸 **[СКРІН]**\n\n> ${AB_TEST_DOJIM_7D_REVIEW_QUOTE}\n\n${AB_TEST_FOCUS_PROOF_PRICING_TEXT}`,

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
      title: 'ЦІЛЬ',

      msg1: '**{firstName}, ось твій результат.**\n\n**Хочеш змін — але не знаєш як саме хочеш жити.** І від цього стоїш на місці ще більше.\n\n**Лишити як є — не хочеш.** Але й куди іти — не знаєш. І це відчуття що стоїш на роздоріжжі може тривати роками.\n\nНасправді ти знаєш чого хочеш. Просто десь по дорозі перестала собі це дозволяти. Або перестала вірити що це реально саме для тебе.\n\nМене звати **Надя**. Вже **3 роки** я допомагаю жінкам знаходити свій напрямок через систему **AB System**.',

      msg1_audio: AB_TEST_RESULT_AUDIO_TEXT,
      msg2_audio: AB_TEST_RESULT_AUDIO_PROMPT,
      msg2_practice: AB_TEST_RESULT_DAILY_PRACTICE_TEXT,
      msg2_benefits: AB_TEST_RESULT_BENEFITS_TEXT,
      msg2_included: AB_TEST_RESULT_INCLUDED_TEXT,
      msg2_howItWorks: AB_TEST_RESULT_HOW_IT_WORKS_TEXT,
      msg2_review: buildResultReviewText(
        AB_TEST_NATALIIA_REVIEW_HEADER,
        AB_TEST_NATALIIA_REVIEW_QUOTE,
      ),
      msg3_pricing: AB_TEST_RESULT_PRICING_TEXT,

      dojim1_recognition:
        `**Впізнавання**\n\n{firstName}, ти вже зробила перший крок — **пройшла тест** і **відповіла собі чесно**.\n\nБільшість так і не доходить навіть до цього.\n\nТест показав де ти зараз — **хочеш змін але не знаєш як хочеш жити**. Лишити як є — не хочеш. Але й куди іти — не знаєш. І від цього стоїш на місці ще більше.\n\nСаме тому ти отримала цей результат. **Це не вирок** — це точка де ясність нарешті з'явиться.\n\n${AB_TEST_FOCUS_RESULT_WORK_TEXT}\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim2_price:
        `**Ціна бездіяльності**\n\n{firstName}.\n\n**Скільки часу ти вже живеш з відчуттям що йдеш не туди?**\n\nМісяць? Рік? Кілька років?\n\n**І що змінилось за цей час?**\n\nЯкщо нічого не зміниться — де ти будеш через ще один рік?\n**У тому самому місці. Просто ще більш розгублена.**\n\nНа практиці ми дивимось не на симптом. А на **те що його створює**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim3_case:
        `**Кейс**\n\n{firstName}.\n\n**Наталія** прийшла з відчуттям що давно хоче щось змінити — але не може пояснити навіщо і куди.\n\nНа практиці побачила що **насправді хоче** — і **дозволила собі це визнати**.\n\n**Наступного дня** написала рієлтору і почала шукати будинки.\n\nКаже: **"Я так включилась — побачила скільки можливостей втрачаю просто через якісь свої блоки і думки в голові."**\n\nСаме такі ситуації ми розбираємо на **Zoom-практиках**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim4_objection:
        `**Заперечення**\n\n{firstName}.\n\nМоже ти **вже писала списки бажань**. Проходила курси. Питала себе чого хочеш.\n\nБільшість наших учасниць приходили саме з думкою: **"Я вже все це проходила."**\n\nМожливо тому ти досі тут і читаєш це повідомлення.\n\n**Різниця одна:** там ти отримувала інформацію. Тут ми **працюємо з твоєю конкретною ситуацією** — і **ти нарешті чуєш себе а не чужі поради**.\n\nТому **багато учасниць отримують ясність вже на першій практиці**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim5_proof:
        `**Доказ**\n\n{firstName}.\n\nЧерез тиждень після тесту більшість людей повертаються до звичного життя і відкладають це ще на кілька місяців.\n\n**Ти вже знаєш що тебе зупиняє.** Це не так часто буває — що людина бачить це чесно.\n\nНижче відгук після першої практики.\n\n📸 **[СКРІН]**\n\n> ${AB_TEST_NATALIIA_PROOF_QUOTE}\n\n${AB_TEST_FOCUS_PROOF_PRICING_TEXT}`,

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
      title: 'ВИБІР',

      msg1: '**{firstName}, ось твій результат.**\n\n**Варіанти є. Ти розумієш що треба обрати. Але обрати один — страшно.**\n\nБо вибір завжди щось залишає позаду. І страшно помилитись. Тому думаєш, порівнюєш, чекаєш ще трошки. І так роками.\n\nПоки шукаєш правильний варіант — життя йде. Іноді роками.\n\nЯ теж довго кружляла в одних і тих самих варіантах. Поки не зрозуміла що справа не у варіантах — а у страху всередині. Як тільки побачила що саме лякає — вибір стався сам.\n\nМене звати **Надя**. Вже **3 роки** я допомагаю жінкам робити вибір через систему **AB System**.',

      msg1_audio: AB_TEST_RESULT_AUDIO_TEXT,
      msg2_audio: AB_TEST_RESULT_AUDIO_PROMPT,
      msg2_practice: AB_TEST_RESULT_DAILY_PRACTICE_TEXT,
      msg2_benefits: AB_TEST_RESULT_BENEFITS_TEXT,
      msg2_included: AB_TEST_RESULT_INCLUDED_TEXT,
      msg2_howItWorks: AB_TEST_RESULT_HOW_IT_WORKS_TEXT,
      msg2_review: buildResultReviewText(
        AB_TEST_VALENTYNA_REVIEW_HEADER,
        AB_TEST_VALENTYNA_REVIEW_QUOTE,
      ),
      msg3_pricing: AB_TEST_RESULT_PRICING_TEXT,

      dojim1_recognition:
        `**Впізнавання**\n\n{firstName}, ти вже зробила перший крок — **пройшла тест** і **відповіла собі чесно**.\n\nБільшість так і не доходить навіть до цього.\n\nТест показав де ти зараз — **варіанти є але страшно зробити неправильно**. І ти знову відкладаєш. І знову думаєш. І знову нічого.\n\nСаме тому ти отримала цей результат. **Це не вирок** — це точка де вибір нарешті відбудеться.\n\n${AB_TEST_FOCUS_RESULT_WORK_TEXT}\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim2_price:
        `**Ціна бездіяльності**\n\n{firstName}.\n\n**Скільки часу ти вже боїшся зробити неправильно?**\n\nІ що змінилось поки чекала правильного моменту?\n\nЯкщо нічого не зміниться — де ти будеш через ще один рік?\n**Там само. Тільки варіантів стане більше — а рішення все одно не буде.**\n\nНа практиці ми дивимось не на варіанти. А на **страх що за ними стоїть**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim3_case:
        `**Кейс**\n\n{firstName}.\n\n**Валентина** довго не могла обрати — залишити роботу чи ні.\n\nКазала: **"Боюсь втратити ілюзорну стабільну роботу. Страшно вийти за межи звичного. Страшно ризикнути."**\n\nНа практиці побачила що тримається не за роботу — а за **страх що скажуть інші**.\n\n**Як тільки побачила це — вибір стався сам.**\n\nКаже: **"Початок — з чесності з собою."**\n\nСаме такі ситуації ми розбираємо на **Zoom-практиках**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim4_objection:
        `**Заперечення**\n\n{firstName}.\n\nМоже ти **вже питала подруг**. Шукала знаки. Читала про це.\n\nБільшість наших учасниць приходили саме з думкою: **"Я вже все це проходила."**\n\nМожливо тому ти досі тут і читаєш це повідомлення.\n\n**Різниця одна:** подруги кажуть що обрати. Тут ми **дивимось чого ти насправді боїшся втратити** — і **вибір відбувається сам**. Без тиску.\n\nТому **багато учасниць роблять вибір вже на першій практиці**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim5_proof:
        `**Доказ**\n\n{firstName}.\n\nЧерез тиждень після тесту більшість людей повертаються до звичного життя і відкладають це ще на кілька місяців.\n\n**Ти вже знаєш що тебе зупиняє.** Це не так часто буває — що людина бачить це чесно.\n\nНижче відгук після першої практики.\n\n📸 **[СКРІН]**\n\n> ${AB_TEST_CHOICE_PROOF_QUOTE}\n\n${AB_TEST_FOCUS_PROOF_PRICING_TEXT}`,

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
      title: 'РІШЕННЯ',

      msg1: '**{firstName}, ось твій результат.**\n\n**Ти вже все розумієш. Навіть знаєш що треба зробити. Але між "вирішила" і "зробила" — пусто.** І ти сама не розумієш чому.\n\nІ так може бути роками. Знову починаєш. Знову переносиш. Знову питаєш себе що зі мною не так.\n\nІ найболючіше — що **ти вже давно знаєш відповідь**. Знаєш що треба зробити. Просто щоразу щось зупиняє в останній момент.\n\n**"Я все розумію але не роблю"** — це було про мене. Роками. Я сама з цього виходила. І знаю що це проходить.\n\nМене звати **Надя**. Вже **3 роки** я допомагаю жінкам переходити від **"знаю але не роблю"** до реальних кроків через систему **AB System**.',

      msg1_audio: AB_TEST_RESULT_AUDIO_TEXT,
      msg2_audio: AB_TEST_RESULT_AUDIO_PROMPT,
      msg2_practice: AB_TEST_RESULT_DAILY_PRACTICE_TEXT,
      msg2_benefits: AB_TEST_RESULT_BENEFITS_TEXT,
      msg2_included: AB_TEST_RESULT_INCLUDED_TEXT,
      msg2_howItWorks: AB_TEST_RESULT_HOW_IT_WORKS_TEXT,
      msg2_review: buildResultReviewText(
        AB_TEST_YELYZAVETA_REVIEW_HEADER,
        AB_TEST_YELYZAVETA_REVIEW_QUOTE,
      ),
      msg3_pricing: AB_TEST_RESULT_PRICING_TEXT,

      dojim1_recognition:
        `**Впізнавання**\n\n{firstName}, ти вже зробила перший крок — **пройшла тест** і **відповіла собі чесно**.\n\nБільшість так і не доходить навіть до цього.\n\nТест показав де ти зараз — **між "вирішила" і "зробила" щось тримає**. Знову починаєш. Знову переносиш. Знову питаєш себе що зі мною не так.\n\nСаме тому ти отримала цей результат. **Це не вирок** — це точка де рішення нарешті стане дією.\n\n${AB_TEST_FOCUS_RESULT_WORK_TEXT}\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim2_price:
        `**Ціна бездіяльності**\n\n{firstName}.\n\n**Скільки часу ти вже знаєш що треба зробити — але не робиш?**\n\nМісяць? Пів року? Рік?\n\n**І що змінилось за цей час?**\n\nЯкщо нічого не зміниться — де ти будеш через ще один рік?\n**У тому самому місці. З тим самим рішенням яке так і не стало дією.**\n\nНа практиці ми дивимось не на рішення. А на **те що заважає його прийняти до кінця**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim3_case:
        `**Кейс**\n\n{firstName}.\n\n**Єлизавета** знала що треба змінити роботу — вже рік.\n\nКазала собі: **"Я все розумію але не роблю. Що зі мною не так?"**\n\nНа практиці побачила що **рішення вже прийняте** — але **кожного разу тихенько замінялось на "почекати ще трошки."**\n\n**Після практики** вперше зробила конкретний крок. Не тому що стало легше. А тому що **побачила що саме її тримало**.\n\nСаме такі ситуації ми розбираємо на **Zoom-практиках**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim4_objection:
        `**Заперечення**\n\n{firstName}.\n\nМоже ти **вже читала про це**. Слухала подкасти. Знаєш теорію.\n\nБільшість наших учасниць приходили саме з думкою: **"Я вже все це проходила."**\n\nМожливо тому ти досі тут і читаєш це повідомлення.\n\n**Різниця одна:** знати і зробити — це різні речи. Тут ми **знаходимо що саме тебе тримає між "вирішила" і "зробила"** — і **перший крок відбувається ще під час практики**.\n\nТому **багато учасниць виходять з практики вже з конкретним кроком**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim5_proof:
        `**Доказ**\n\n{firstName}.\n\nЧерез тиждень після тесту більшість людей повертаються до звичного життя і відкладають це ще на кілька місяців.\n\n**Ти вже знаєш що тебе зупиняє.** Це не так часто буває — що людина бачить це чесно.\n\nНижче відгук після першої практики.\n\n📸 **[СКРІН]**\n\n> ${AB_TEST_DECISION_PROOF_QUOTE}\n\n${AB_TEST_FOCUS_PROOF_PRICING_TEXT}`,

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
      title: 'ДІЯ',

      msg1: '**{firstName}, ось твій результат.**\n\n**Ти активна. Робиш багато. Але ходиш по колу — і сама не розумієш чому нічого не змінюється.**\n\nЦе виснажує більше ніж взагалі нічого не робити. Робиш — але **відчуття що все це нікуди не веде**. І **злість на себе що знову те саме**.\n\nЯ знаю це відчуття. Багато дій — але злюся що нічого не виходить. Поки не зрозуміла **звідки починати**.\n\n**Більше дій — не вихід.** Для цього є ФОКУС.\nТи приходиш з тим що робиш але що нікуди не веде. Ми дивимось де саме все розсипається — і замість списку нових дій ти виходиш з одним кроком. Але точним.',

      msg1_audio: AB_TEST_ACTION_AUDIO_REVIEW_TEXT,
      msg2_audio: AB_TEST_RESULT_AUDIO_PROMPT,
      msg2_practice: AB_TEST_RESULT_DAILY_PRACTICE_TEXT,
      msg2_benefits: AB_TEST_RESULT_BENEFITS_TEXT,
      msg2_included: AB_TEST_RESULT_INCLUDED_TEXT,
      msg2_howItWorks: AB_TEST_RESULT_HOW_IT_WORKS_TEXT,
      msg2_review: buildResultReviewText(
        AB_TEST_KSENIIA_REVIEW_HEADER,
        AB_TEST_KSENIIA_REVIEW_QUOTE_2,
      ),
      msg3_pricing: AB_TEST_RESULT_PRICING_TEXT,

      dojim1_recognition:
        `**Впізнавання**\n\n{firstName}, ти вже зробила перший крок — **пройшла тест** і **відповіла собі чесно**.\n\nБільшість так і не доходить навіть до цього.\n\nТест показав де ти зараз — **робиш багато але ходиш по колу**. І сама не розумієш чому нічого не змінюється. І берешся за нове. І знову по колу.\n\nСаме тому ти отримала цей результат. **Це не вирок** — це точка де твої дії нарешті почнуть вести до результату.\n\n${AB_TEST_FOCUS_RESULT_WORK_TEXT}\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim2_price:
        `**Ціна бездіяльності**\n\n{firstName}.\n\n**Скільки часу ти вже робиш багато — але воно нікуди не веде?**\n\nМісяць? Пів року? Рік?\n\n**І що змінилось за цей час?**\n\nЯкщо нічого не зміниться — де ти будеш через ще один рік?\n**Там само. Тільки ще більш втомлена від дій які нічого не дають.**\n\nНа практиці ми дивимось не на дії. А на **те чому вони не ведуть до результату**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim3_case:
        `**Кейс**\n\n{firstName}.\n\n**Ксенія** робила багато — контент, навчання, нові проєкти. Але **відчуття що ходить по колу** не минало.\n\nНа практиці побачила що **кожна її дія починається з нуля** — без розуміння куди веде.\n\n**Після практики** вперше зробила одну дію — але точну. Ту що насправді мала сенс.\n\nКаже: **${AB_TEST_KSENIIA_REVIEW_QUOTE_1}**\n\nСаме такі ситуації ми розбираємо на **Zoom-практиках**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim4_objection:
        `**Заперечення**\n\n{firstName}.\n\nМоже ти **вже брала нові курси**. Читала книги про продуктивність. Пробувала нові підходи.\n\nБільшість наших учасниць приходили саме з думкою: **"Я вже все це проходила."**\n\nМожливо тому ти досі тут і читаєш це повідомлення.\n\n**Різниця одна:** більше дій — не вихід. Тут ми **знаходимо де саме все розсипається** — і замість списку нових дій **ти виходиш з одним кроком**. Але точним. Тим що нарешті веде до результату.\n\nТому **багато учасниць після першої практики вперше відчувають що бачать результат, а не просто зайняті**.\n\n**${AB_TEST_RESULT_TARIFF_SUMMARY}**\n\n${AB_TEST_FOCUS_CTA_MARKER}`,

      dojim5_proof:
        `**Доказ**\n\n{firstName}.\n\nЧерез тиждень після тесту більшість людей повертаються до звичного життя і відкладають це ще на кілька місяців.\n\n**Ти вже знаєш що тебе зупиняє.** Це не так часто буває — що людина бачить це чесно.\n\nНижче відгук після першої практики.\n\n📸 **[СКРІН]**\n\n> ${AB_TEST_ACTION_PROOF_QUOTE}\n\n${AB_TEST_FOCUS_PROOF_PRICING_TEXT}`,

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
  result: AbTestResultDefinition,
): NonNullable<AbTestResultDefinition['blocks']> {
  const reviewHeader = extractReviewHeader(result.msg2_review)
  const reviewQuote = extractReviewQuote(result.msg2_review)
  const screenshotKey = resultKeyToScreenshotKey(resultKey)

  return {
    intro: [
      telegramBlock.text(result.msg1),
      telegramBlock.audio(AB_TEST_AUDIO_URL, 'Я знаю як допомогти тобі це пройти…'),
    ],
    practice: [
      telegramBlock.text(result.msg2_practice),
      telegramBlock.text(result.msg2_benefits),
      telegramBlock.text(result.msg2_included),
      telegramBlock.text(result.msg2_howItWorks),
      telegramBlock.text(reviewHeader),
      telegramBlock.image(AB_TEST_SCREENSHOT_URLS[screenshotKey]),
      telegramBlock.quote(reviewQuote),
    ],
    proof: [
      telegramBlock.text(result.msg3_pricing),
    ],
  }
}

function extractReviewHeader(text: string): string {
  const firstLine = text.split('\n').find((line) => line.trim())
  return firstLine?.replace(/^📸 \*\*\[СКРІН\]\*\*\s*/i, '').trim() ?? ''
}

function extractReviewQuote(text: string): string {
  const match = text.match(/>\s*"([\s\S]+?)"/)
  return match?.[1] ?? ''
}

function resultKeyToScreenshotKey(
  resultKey: AbTestResultKey,
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
    telegramBlock.text('У ФОКУСІ ми раз на тиждень працюємо з такими ситуаціями наживо.'),
    telegramBlock.text('Ти приходиш із реальною темою: що відкладаєш, яке рішення переносиш, яка ціль не рухається, який крок можна зробити цього тижня.'),
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
    telegramBlock.text(AB_TEST_FOCUS_TITLE_PLAIN),
    telegramBlock.text(AB_TEST_FOCUS_WEEKLY_TEXT),
    telegramBlock.text(AB_TEST_FOCUS_REAL_SITUATION_INLINE),
    telegramBlock.text(AB_TEST_FOCUS_TARIFF_HEADER),
    telegramBlock.pricing(AB_TEST_FOCUS_PRICE_1M),
    telegramBlock.pricing(AB_TEST_FOCUS_PRICE_3M),
  ],
} as const
