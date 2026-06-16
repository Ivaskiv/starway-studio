// backend/src/products/ab-system/content/abTest.followups.ts

import type { AbTestResultKey, TestDriveContentVersion } from './abTest.results.js'
import { interpolateFirstName } from './abTest.results.js'
import {
  AB_TEST_CONTINUE_BUTTON_TEXT,
  AB_TEST_OPEN_ZOOM_BUTTON_TEXT,
  AB_TEST_DOJIM_7D_REVIEW_QUOTE,
  AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT,
  AB_TEST_FOCUS_CTA_BLOCK,
  AB_TEST_FOCUS_PAYMENT_CTA_1M,
  AB_TEST_FOCUS_PRICE_1M,
  AB_TEST_FOCUS_PRICE_3M,
  AB_TEST_FOCUS_PRICE_SUMMARY,
  AB_TEST_FOCUS_TARIFF_BLOCKS,
  AB_TEST_SCREENSHOT_URLS,
  buildAbTestScreenshotMarker,
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

const CTA_JOIN_FOCUS = AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT
const FOCUS_FOLLOWUP_TITLE = 'ФОКУС'
const CTA_START_TEST = 'Пройти тест'
const CTA_SHOW_RESULT = 'Показати результат'
const PLATFORM_CTA_TEXT = 'Перейти в ABSystem AI'

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

// SHARED fallback — використовується для 48H, 72H, 5D, 7D де персоналізація не критична
const DOJIM_24H: FollowupCopy = {
  title: FOCUS_FOLLOWUP_TITLE,
  body: [
    '{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.',
    'Більшість так і не доходить навіть до цього.',
    '',
    'Тест показав де ти зараз — взагалі без сил і нічого не хочеться. І в цьому стані ти все одно намагаєшся щось робити. І злишся що не виходить.',
    '',
    'Саме тому ти отримала цей результат. Це не вирок — це точка з якої починається зміна.',
    '',
    'У ФОКУСІ ми працюємо саме з тим що показав твій результат. Наживо. На реальних ситуаціях.',
    '',
    AB_TEST_FOCUS_PRICE_1M,
    AB_TEST_FOCUS_PRICE_3M,
  ].join('\n'),
  cta: CTA_JOIN_FOCUS,
  blocks: [
    telegramBlock.text('{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.'),
    telegramBlock.text('Більшість так і не доходить навіть до цього.'),
    telegramBlock.text('Тест показав де ти зараз — взагалі без сил і нічого не хочеться. І в цьому стані ти все одно намагаєшся щось робити. І злишся що не виходить.'),
    telegramBlock.text('Саме тому ти отримала цей результат. Це не вирок — це точка з якої починається зміна.'),
    telegramBlock.text('У ФОКУСІ ми працюємо саме з тим що показав твій результат. Наживо. На реальних ситуаціях.'),
    ...AB_TEST_FOCUS_TARIFF_BLOCKS,
    AB_TEST_FOCUS_CTA_BLOCK,
  ],
}

// Персоналізовані DOJIM_24H по сегментах
const DOJIM_24H_BY_SEGMENT: Record<AbTestResultKey, FollowupCopy> = {
  state: DOJIM_24H, // вже написаний про стан ("без сил")
  goal: {
    title: FOCUS_FOLLOWUP_TITLE,
    body: [
      '{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.',
      '',
      'Тест показав де ти зараз — хочеш змін, але не знаєш як саме хочеш жити. І від цього стоїш на місці ще більше.',
      '',
      'Це не слабкість. Ціль, яку ти не дозволяєш собі хотіти, — це і є точка входу.',
      '',
      'У ФОКУСІ ми знаходимо твій напрямок. Наживо. На реальних ситуаціях.',
      '',
      AB_TEST_FOCUS_PRICE_1M,
      AB_TEST_FOCUS_PRICE_3M,
    ].join('\n'),
    cta: CTA_JOIN_FOCUS,
    blocks: [
      telegramBlock.text('{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.'),
      telegramBlock.text('Тест показав де ти зараз — хочеш змін, але не знаєш як саме хочеш жити. І від цього стоїш на місці ще більше.'),
      telegramBlock.text('Це не слабкість. Ціль, яку ти не дозволяєш собі хотіти, — це і є точка входу.'),
      telegramBlock.text('У ФОКУСІ ми знаходимо твій напрямок. Наживо. На реальних ситуаціях.'),
      ...AB_TEST_FOCUS_TARIFF_BLOCKS,
      AB_TEST_FOCUS_CTA_BLOCK,
    ],
  },
  choice: {
    title: FOCUS_FOLLOWUP_TITLE,
    body: [
      '{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.',
      '',
      'Тест показав де ти зараз — варіанти є, але обрати один страшно. Бо вибір завжди щось залишає позаду.',
      '',
      'Справа не у варіантах. А у страху всередині. Як тільки побачиш що саме лякає — вибір стається сам.',
      '',
      'У ФОКУСІ ми дивимось саме на це. Наживо. На твоїй ситуації.',
      '',
      AB_TEST_FOCUS_PRICE_1M,
      AB_TEST_FOCUS_PRICE_3M,
    ].join('\n'),
    cta: CTA_JOIN_FOCUS,
    blocks: [
      telegramBlock.text('{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.'),
      telegramBlock.text('Тест показав де ти зараз — варіанти є, але обрати один страшно. Бо вибір завжди щось залишає позаду.'),
      telegramBlock.text('Справа не у варіантах. А у страху всередині. Як тільки побачиш що саме лякає — вибір стається сам.'),
      telegramBlock.text('У ФОКУСІ ми дивимось саме на це. Наживо. На твоїй ситуації.'),
      ...AB_TEST_FOCUS_TARIFF_BLOCKS,
      AB_TEST_FOCUS_CTA_BLOCK,
    ],
  },
  decision: {
    title: FOCUS_FOLLOWUP_TITLE,
    body: [
      '{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.',
      '',
      'Тест показав де ти зараз — ти вже все знаєш що треба зробити. Але між "вирішила" і "зробила" — пусто.',
      '',
      '"Я все розумію але не роблю" — це проходить. Не через силу волі, а через те що ти побачиш де саме зупиняєшся.',
      '',
      'У ФОКУСІ ми переходимо від "знаю" до реального кроку. Наживо.',
      '',
      AB_TEST_FOCUS_PRICE_1M,
      AB_TEST_FOCUS_PRICE_3M,
    ].join('\n'),
    cta: CTA_JOIN_FOCUS,
    blocks: [
      telegramBlock.text('{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.'),
      telegramBlock.text('Тест показав де ти зараз — ти вже все знаєш що треба зробити. Але між "вирішила" і "зробила" — пусто.'),
      telegramBlock.text('"Я все розумію але не роблю" — це проходить. Не через силу волі, а через те що ти побачиш де саме зупиняєшся.'),
      telegramBlock.text('У ФОКУСІ ми переходимо від "знаю" до реального кроку. Наживо.'),
      ...AB_TEST_FOCUS_TARIFF_BLOCKS,
      AB_TEST_FOCUS_CTA_BLOCK,
    ],
  },
  action: {
    title: FOCUS_FOLLOWUP_TITLE,
    body: [
      '{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.',
      '',
      'Тест показав де ти зараз — ти активна, робиш багато, але ходиш по колу. І самі дії вже не допомагають.',
      '',
      'Більше дій — не вихід. У ФОКУСІ ми дивимось де саме все розсипається — і замість нового списку ти виходиш з одним точним кроком.',
      '',
      AB_TEST_FOCUS_PRICE_1M,
      AB_TEST_FOCUS_PRICE_3M,
    ].join('\n'),
    cta: CTA_JOIN_FOCUS,
    blocks: [
      telegramBlock.text('{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.'),
      telegramBlock.text('Тест показав де ти зараз — ти активна, робиш багато, але ходиш по колу. І самі дії вже не допомагають.'),
      telegramBlock.text('Більше дій — не вихід. У ФОКУСІ ми дивимось де саме все розсипається — і замість нового списку ти виходиш з одним точним кроком.'),
      ...AB_TEST_FOCUS_TARIFF_BLOCKS,
      AB_TEST_FOCUS_CTA_BLOCK,
    ],
  },
}

const DOJIM_48H: FollowupCopy = {
  title: FOCUS_FOLLOWUP_TITLE,
  body: [
    '{firstName}.',
    '',
    'Скільки часу ти вже тримаєшся з останніх сил?',
    '',
    'Місяць? Пів року? Рік?',
    '',
    'І що змінилось за цей час?',
    '',
    'Якщо нічого не зміниться — де ти будеш через ще один рік?',
    'У тому самому місці. Просто ще більш втомлена.',
    '',
    'На практиці ми дивимось не на симптом. А на те що його створює.',
    '',
    AB_TEST_FOCUS_PRICE_SUMMARY,
  ].join('\n'),
  cta: CTA_JOIN_FOCUS,
  blocks: [
    telegramBlock.text('{firstName}.'),
    telegramBlock.text('Скільки часу ти вже тримаєшся з останніх сил?'),
    telegramBlock.text('Місяць? Пів року? Рік?'),
    telegramBlock.text('І що змінилось за цей час?'),
    telegramBlock.text('Якщо нічого не зміниться — де ти будеш через ще один рік? У тому самому місці. Просто ще більш втомлена.'),
    telegramBlock.text('На практиці ми дивимось не на симптом. А на те що його створює.'),
    ...AB_TEST_FOCUS_TARIFF_BLOCKS,
    AB_TEST_FOCUS_CTA_BLOCK,
  ],
}

const DOJIM_72H: FollowupCopy = {
  title: FOCUS_FOLLOWUP_TITLE,
  body: [
    '{firstName}.',
    '',
    'Юля тиждень не могла змусити себе взятися за справи. Зранку — як побита. Ввечері — нічого не хочеться.',
    '',
    'На практиці побачила що сама обирає як пройде її день — просто ніколи не думала про це так.',
    '',
    'Наступного ранку згадала це і поміняла пластинку в голові.',
    '',
    'Через тиждень написала що вперше за довгий час перестала прокидатися з думкою "як пережити цей день."',
    '',
    'Саме такі ситуації ми розбираємо на Zoom-практиках.',
    '',
    AB_TEST_FOCUS_PRICE_SUMMARY,
  ].join('\n'),
  cta: CTA_JOIN_FOCUS,
  blocks: [
    telegramBlock.text('{firstName}.'),
    telegramBlock.text('Юля тиждень не могла змусити себе взятися за справи. Зранку — як побита. Ввечері — нічого не хочеться.'),
    telegramBlock.text('На практиці побачила що сама обирає як пройде її день — просто ніколи не думала про це так.'),
    telegramBlock.text('Наступного ранку згадала це і поміняла пластинку в голові.'),
    telegramBlock.text('Через тиждень написала що вперше за довгий час перестала прокидатися з думкою "як пережити цей день."'),
    telegramBlock.text('Саме такі ситуації ми розбираємо на Zoom-практиках.'),
    ...AB_TEST_FOCUS_TARIFF_BLOCKS,
    AB_TEST_FOCUS_CTA_BLOCK,
  ],
}

function buildFocusFollowup(base: FollowupCopy): FollowupCopy {
  return {
    title: base.title,
    body: base.body,
    cta: base.cta,
    blocks: base.blocks,
  }
}

const DOJIM_5D: FollowupCopy = {
  title: FOCUS_FOLLOWUP_TITLE,
  body: `{firstName}. 

Можливо ти вже проходила щось схоже. Читала. Слухала. Пробувала.

Більшість наших учасниць приходили саме з думкою: "Я вже все це проходила."

Можливо тому ти досі тут і читаєш це повідомлення.

Різниця одна: там ти отримувала інформацію. Тут ми працюємо з твоєю конкретною ситуацією. Не загальні поради — а розбір саме того що тебе зупиняє.

Тому багато учасниць отримують відповідь вже на першій практиці.

${AB_TEST_FOCUS_PRICE_SUMMARY}`,
  cta: CTA_JOIN_FOCUS,
  blocks: [
    telegramBlock.text('{firstName}.'),
    telegramBlock.text('Можливо ти вже проходила щось схоже. Читала. Слухала. Пробувала.'),
    telegramBlock.text('Більшість наших учасниць приходили саме з думкою: "Я вже все це проходила."'),
    telegramBlock.text('Можливо тому ти досі тут і читаєш це повідомлення.'),
    telegramBlock.text('Різниця одна: там ти отримувала інформацію. Тут ми працюємо з твоєю конкретною ситуацією. Не загальні поради — а розбір саме того що тебе зупиняє.'),
    telegramBlock.text('Тому багато учасниць отримують відповідь вже на першій практиці.'),
    ...AB_TEST_FOCUS_TARIFF_BLOCKS,
    AB_TEST_FOCUS_CTA_BLOCK,
  ],
}

const DOJIM_7D: FollowupCopy = {
  title: FOCUS_FOLLOWUP_TITLE,
  body: `{firstName}.

Через тиждень після тесту більшість людей повертаються до звичного життя і відкладають це ще на кілька місяців.

Ти вже знаєш що тебе зупиняє. Це не так часто буває — що людина бачить це чесно.

Нижче відгук після першої практики.

${AB_TEST_DOJIM_7D_REVIEW_QUOTE}

${buildAbTestScreenshotMarker('dojim_7d_review')}

Почати можна з одного місяця. Це 15 євро — менше ніж одна консультація.

ФОКУС | Zoom-практики AB System
${AB_TEST_FOCUS_PRICE_SUMMARY}`,
  cta: CTA_JOIN_FOCUS,
  blocks: [
    telegramBlock.text('{firstName}.'),
    telegramBlock.text('Через тиждень після тесту більшість людей повертаються до звичного життя і відкладають це ще на кілька місяців.'),
    telegramBlock.text('Ти вже знаєш що тебе зупиняє. Це не так часто буває — що людина бачить це чесно.'),
    telegramBlock.text('Нижче відгук після першої практики.'),
    telegramBlock.quote(AB_TEST_DOJIM_7D_REVIEW_QUOTE),
    telegramBlock.image(AB_TEST_SCREENSHOT_URLS.dojim_7d_review),
    telegramBlock.text('Почати можна з одного місяця. Це 15 євро — менше ніж одна консультація.'),
    telegramBlock.pricing('ФОКУС | Zoom-практики AB System'),
    ...AB_TEST_FOCUS_TARIFF_BLOCKS,
    AB_TEST_FOCUS_CTA_BLOCK,
  ],
}

function buildBranchCopy(segment: AbTestResultKey): BranchFollowupCopy {
  const dojim24h = DOJIM_24H_BY_SEGMENT[segment]
  return {
    RESULT_FOLLOWUP_24H: buildFocusFollowup(dojim24h),
    RESULT_FOLLOWUP_48H: buildFocusFollowup(DOJIM_48H),
    RESULT_FOLLOWUP_72H: buildFocusFollowup(DOJIM_72H),
    RESULT_DOJIM_24H: buildFocusFollowup(dojim24h),
    RESULT_DOJIM_48H: buildFocusFollowup(DOJIM_48H),
    RESULT_DOJIM_72H: buildFocusFollowup(DOJIM_72H),
    RESULT_DOJIM_5D: buildFocusFollowup(DOJIM_5D),
    RESULT_DOJIM_7D: buildFocusFollowup(DOJIM_7D),
  }
}

export const AB_TEST_FOLLOWUPS: Record<AbTestResultKey, BranchFollowupCopy> = {
  state: buildBranchCopy('state'),
  goal: buildBranchCopy('goal'),
  choice: buildBranchCopy('choice'),
  decision: buildBranchCopy('decision'),
  action: buildBranchCopy('action'),
}

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
      body: interpolateFirstName(base.body, options.firstName),
      blocks: base.blocks?.map((block) =>
        interpolateTelegramBlock(block, options.firstName),
      ),
    }
  }

  const generic = GENERIC_FOLLOWUPS[timerId] ?? AB_TEST_FOLLOWUPS.action.RESULT_FOLLOWUP_24H
  return {
    ...generic,
    body: interpolateFirstName(generic.body, options.firstName),
    blocks: generic.blocks?.map((block) => interpolateTelegramBlock(block, options.firstName)),
  }
}

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
