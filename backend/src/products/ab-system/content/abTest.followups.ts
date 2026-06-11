// backend/src/products/ab-system/content/abTest.followups.ts

import type { AbTestResultKey } from './abTest.results.js'
import { interpolateFirstName } from './abTest.results.js'
import { buildAbTestScreenshotMarker } from './abTest.shared.js'
import type { TestDriveContentVersion } from './testDrive.content.js'
import { PAYMENT_REMINDER_FOLLOWUP_COPY } from '@/core/state-machine/paymentReminderFoundation.js'

export type FollowupCopy = {
  title: string
  body: string
  cta?: string
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

const CTA_JOIN_FOCUS = 'Приєднатись до\nФОКУСУ →'

const DOJIM_24H: FollowupCopy = {
  title: 'ФОКУС',
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
    '1 місяць — 15 євро',
    '3 місяці — 39 євро',
  ].join('\n'),
  cta: CTA_JOIN_FOCUS,
}

const DOJIM_48H: FollowupCopy = {
  title: 'ФОКУС',
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
    '1 місяць — 15 євро | 3 місяці — 39 євро',
  ].join('\n'),
  cta: CTA_JOIN_FOCUS,
}

const DOJIM_72H: FollowupCopy = {
  title: 'ФОКУС',
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
    '1 місяць — 15 євро | 3 місяці — 39 євро',
  ].join('\n'),
  cta: CTA_JOIN_FOCUS,
}

function buildBranchCopy(): BranchFollowupCopy {
  return {
    RESULT_FOLLOWUP_24H: {
      title: 'ФОКУС',
      body: `{firstName}, ти вже зробила перший крок — пройшла тест і відповіла собі чесно.

Більшість так і не доходить навіть до цього.

Тест показав де ти зараз — взагалі без сил і нічого не хочеться. І в цьому стані ти все одно намагаєшся щось робити. І злишся що не виходить.

Саме тому ти отримала цей результат. Це не вирок — це точка з якої починається зміна.

У ФОКУСІ ми працюємо саме з тим що показав твій результат. Наживо. На реальних ситуаціях.

1 місяць — 15 євро | 3 місяці — 39 євро`,
      cta: CTA_JOIN_FOCUS,
    },

    RESULT_FOLLOWUP_48H: {
      title: 'ФОКУС',
      body: `{firstName}.

Скільки часу ти вже тримаєшся з останніх сил?

Місяць? Пів року? Рік?

І що змінилось за цей час?

Якщо нічого не зміниться — де ти будеш через ще один рік?
У тому самому місці. Просто ще більш втомлена.

На практиці ми дивимось не на симптом. А на те що його створює.

1 місяць — 15 євро | 3 місяці — 39 євро`,
      cta: CTA_JOIN_FOCUS,
    },

    RESULT_FOLLOWUP_72H: {
      title: 'ФОКУС',
      body: `{firstName}.

Юля тиждень не могла змусити себе взятися за справи. Зранку — як побита. Ввечері — нічого не хочеться.

На практиці побачила що сама обирає як пройде її день — просто ніколи не думала про це так.

Наступного ранку згадала це і поміняла пластинку в голові.

Через тиждень написала що вперше за довгий час перестала прокидатися з думкою "як пережити цей день."

Саме такі ситуації ми розбираємо на Zoom-практиках.

1 місяць — 15 євро | 3 місяці — 39 євро`,
      cta: CTA_JOIN_FOCUS,
    },

    RESULT_DOJIM_24H: DOJIM_24H,
    RESULT_DOJIM_48H: DOJIM_48H,
    RESULT_DOJIM_72H: DOJIM_72H,

    RESULT_DOJIM_5D: {
      title: 'ФОКУС',
      body: `{firstName}. 

Можливо ти вже проходила щось схоже. Читала. Слухала. Пробувала.

Більшість наших учасниць приходили саме з думкою: "Я вже все це проходила."

Можливо тому ти досі тут і читаєш це повідомлення.

Різниця одна: там ти отримувала інформацію. Тут ми працюємо з твоєю конкретною ситуацією. Не загальні поради — а розбір саме того що тебе зупиняє.

Тому багато учасниць отримують відповідь вже на першій практиці.

1 місяць — 15 євро | 3 місяці — 39 євро`,
      cta: CTA_JOIN_FOCUS,
    },

    RESULT_DOJIM_7D: {
      title: 'ФОКУС',
      body: `{firstName}.

Через тиждень після тесту більшість людей повертаються до звичного життя і відкладають це ще на кілька місяців.

Ти вже знаєш що тебе зупиняє. Це не так часто буває — що людина бачить це чесно.

Нижче відгук після першої практики.

${buildAbTestScreenshotMarker('dojim_7d_review')}

Почати можна з одного місяця. Це 15 євро — менше ніж одна консультація.

ФОКУС | Zoom-практики AB System
1 місяць — 15 євро | 3 місяці — 39 євро`,
      cta: CTA_JOIN_FOCUS,
    },
  }
}

export const AB_TEST_FOLLOWUPS: Record<AbTestResultKey, BranchFollowupCopy> = {
  state: buildBranchCopy(),
  goal: buildBranchCopy(),
  choice: buildBranchCopy(),
  decision: buildBranchCopy(),
  action: buildBranchCopy(),
}

const GENERIC_FOLLOWUPS: Partial<Record<AbTestFollowupTimerId, FollowupCopy>> = {
  DOJIM_0_IMMEDIATE: {
    title: 'ФОКУС',
    body: 'Твій результат уже готовий.\n\nВідкрий його і переходь до наступного кроку у ФОКУС.',
    cta: CTA_JOIN_FOCUS,
  },
  ...PAYMENT_REMINDER_FOLLOWUP_COPY,
  ZOOM_REMINDER_24H: {
    title: 'Zoom через добу',
    body: 'Завтра буде Zoom-практика у ФОКУСІ. Підготуй одну ситуацію: що ти давно хочеш зробити, але переносиш?',
    cta: 'Відкрити Zoom',
  },
  ZOOM_REMINDER_2H: {
    title: 'Zoom скоро почнеться',
    body: 'Сьогодні Zoom-практика у ФОКУСІ. Тема: чому відкладаєш те, що давно хочеш?',
    cta: 'Відкрити Zoom',
  },
  PLATFORM_INVITE_AFTER_ZOOM_1: {
    title: 'ABSystem AI',
    body: 'Між практиками важливо не загубити рух. ABSystem AI тримає фокус щодня між Zoom.',
    cta: 'Перейти в ABSystem AI',
  },
  PLATFORM_INVITE_AFTER_ZOOM_2: {
    title: 'ABSystem AI',
    body: 'ABSystem AI допомагає бачити, де рух зупиняється між практиками, і повертатись до кроку.',
    cta: 'Перейти в ABSystem AI',
  },
  PLATFORM_INVITE_AFTER_ZOOM: {
    title: 'ABSystem AI',
    body: 'ABSystem AI тримає твій фокус щодня між Zoom.',
    cta: 'Перейти в ABSystem AI',
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
    }
  }

  const generic = GENERIC_FOLLOWUPS[timerId] ?? AB_TEST_FOLLOWUPS.action.RESULT_FOLLOWUP_24H
  return {
    ...generic,
    body: interpolateFirstName(generic.body, options.firstName),
  }
}

export const AB_TEST_LIFECYCLE_REMINDERS: Record<LifecycleReminderKey, FollowupCopy> = {
  R1_TEST_24H: {
    title: 'Нагадування про тест',
    body: 'Минуло 24 години. Пройди короткий тест AB System, щоб зафіксувати наступний крок.',
    cta: 'Пройти тест',
  },
  R2_TEST_72H: {
    title: 'Тест досі чекає',
    body: 'Минуло 72 години. Якщо відкладати далі, стан не зміниться. Почни тест зараз.',
    cta: 'Пройти тест',
  },
  R3_PROGRESS_4H: {
    title: 'Повернись до тесту',
    body: 'Ти зупинилась у процесі. Повернись і закрий тест за 10 хвилин.',
    cta: 'Продовжити тест',
  },
  R4_PROGRESS_24H: {
    title: 'Тест не завершено',
    body: 'Минула 1 година з останньої активності в тесті. Дотисни до результату.',
    cta: 'Продовжити тест',
  },
  R9_PROGRESS_1D: {
    title: 'Тест не завершено',
    body: 'Минув 1 день з останньої активності в тесті. Дотисни до результату.',
    cta: 'Продовжити тест',
  },
  R5_RESULT_2H: {
    title: 'Результат готовий',
    body: 'Твій результат уже готовий. Переглянь його і переходь до наступного кроку.',
    cta: 'Показати результат',
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
    cta: 'Оплатити 1 місяць\n— 15 євро',
  },
  Z1_ZOOM_MON_1800: {
    title: 'Zoom сьогодні о 19:00',
    body: 'За годину Zoom-практика. Підготуй одну ситуацію, яку хочеш розібрати.',
    cta: 'Відкрити Zoom',
  },
  Z2_ZOOM_MON_1855: {
    title: 'Zoom стартує за 5 хвилин',
    body: 'Підключайся, щоб не пропустити практичну частину і свій наступний крок.',
    cta: 'Відкрити Zoom',
  },
}
