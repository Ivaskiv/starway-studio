// backend/src/products/ab-system/content/abTest.followups.ts

import type { AbTestResultKey } from './abTest.results.js'
import { interpolateFirstName } from './abTest.results.js'
import {
  getTestDriveFollowupBodyLines,
  type TestDriveContentVersion,
} from './testDrive.content.js'

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

const CTA_JOIN_FOCUS = 'Приєднатись до ФОКУСУ →'

const DOJIM_24H: FollowupCopy = {
  title: 'ФОКУС',
  body: [
    '{firstName}, ти вже побачила свій результат у тесті.',
    'Тепер головне — не залишити це просто думкою.',
    'Бо часто так і буває: прочитала, впізнала себе, погодилась,',
    'і знову пішла у свій звичний день.',
    '',
    'Якщо хочеш розібрати свою ситуацію не в голові, а на практиці — заходь у ФОКУС.',
    '1 місяць — 15 євро',
    '3 місяці — 39 євро',
  ].join('\n'),
  cta: CTA_JOIN_FOCUS,
}

const DOJIM_48H: FollowupCopy = {
  title: 'ФОКУС',
  body: [
    '{firstName}, можна ще місяць думати про те, що ти давно хочеш зробити.',
    'А можна взяти одну ситуацію і нарешті подивитись чесно:',
    '— що ти відкладаєш;',
    '— чому переносиш;',
    '— яке рішення не приймаєш;',
    '— який крок реально зробити цього тижня.',
    '',
    'Саме для цього є ФОКУС.',
  ].join('\n'),
  cta: CTA_JOIN_FOCUS,
}

const DOJIM_72H: FollowupCopy = {
  title: 'ФОКУС',
  body: [
    '{firstName}, я не буду переконувати тебе «терміново змінювати життя».',
    'Але якщо є щось, що ти давно відкладаєш, воно саме не зникне.',
    'Його треба побачити. Розібрати. І довести до кроку.',
    '',
    'У ФОКУСІ ми це робимо на живих Zoom-практиках.',
  ].join('\n'),
  cta: CTA_JOIN_FOCUS,
}

function buildBranchCopy(): BranchFollowupCopy {
  return {
    RESULT_FOLLOWUP_24H: {
      title: 'ФОКУС',
      body: `{firstName}, ти вже побачила свій результат у тесті.

Тепер головне — не залишити це просто думкою.

Часто так:
прочитала, впізнала — і знову повернулась у звичний день.`,
      cta: CTA_JOIN_FOCUS,
    },

    RESULT_FOLLOWUP_48H: {
      title: 'ФОКУС',
      body: `{firstName}, можна ще місяць думати про те, що давно хочеш зробити.

А можна взяти одну ситуацію і нарешті подивитись чесно:
що відкладаєш;
чому переносиш;
який крок реально зробити.`,
      cta: CTA_JOIN_FOCUS,
    },

    RESULT_FOLLOWUP_72H: {
      title: 'ФОКУС',
      body: `{firstName}, я не буду переконувати «терміново змінювати життя».

Але якщо є щось, що давно відкладаєш — воно само не зникне.

Його треба побачити.
Розібрати.
Довести до кроку.

[ЦИТАТА УЧАСНИЦІ]`,
      cta: CTA_JOIN_FOCUS,
    },

    RESULT_DOJIM_24H: DOJIM_24H,
    RESULT_DOJIM_48H: DOJIM_48H,
    RESULT_DOJIM_72H: DOJIM_72H,

    RESULT_DOJIM_5D: {
      title: 'ФОКУС',
      body: `{firstName}, задай собі одне питання:

Те, що я відкладаю, само вирішиться за цей місяць?

Якщо чесна відповідь «ні» — не чекай ідеального моменту.`,
      cta: CTA_JOIN_FOCUS,
    },

    RESULT_DOJIM_7D: {
      title: 'ФОКУС',
      body: `{firstName}, останнє нагадування про ФОКУС.

Якщо пройшла тест і впізнала себе — тема вже є.

Можна залишити в голові.
А можна прийти і розібрати.

15 євро / 1 місяць | 39 євро / 3 місяці`,
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
    body: [
      '{firstName}, супер.',
      'Ось доступ у ФОКУС:',
      '',
      '1 місяць — 15 євро',
      '3 місяці — 39 євро',
      '',
      'Після оплати ти отримаєш посилання на закритий Telegram-канал',
      'і доступ до живих Zoom-практик.',
    ].join('\n'),
    cta: CTA_JOIN_FOCUS,
  },
  PAYMENT_REMINDER_24H: {
    title: 'ФОКУС',
    body: 'Якщо хочеш продовжити, контекст уже збережено.',
    cta: CTA_JOIN_FOCUS,
  },
  PAYMENT_REMINDER_48H: {
    title: 'ФОКУС',
    body: 'Повертаємось до рішення: що саме дає тобі зараз найбільше користі.',
    cta: CTA_JOIN_FOCUS,
  },
  PAYMENT_REMINDER_72H: {
    title: 'ФОКУС',
    body: 'Незавершений крок теж впливає на ритм. Можна мʼяко повернутись до нього.',
    cta: CTA_JOIN_FOCUS,
  },
  PAYMENT_REMINDER_5D: {
    title: 'ФОКУС',
    body: 'Пауза вже показує ціну відкладання. Повернутись можна одним кроком.',
    cta: CTA_JOIN_FOCUS,
  },
  PAYMENT_REMINDER_7D: {
    title: 'ФОКУС',
    body: 'Можна повернутись до збереженого прогресу і свого темпу.',
    cta: CTA_JOIN_FOCUS,
  },
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
    const extraBodyLines = getTestDriveFollowupBodyLines({
      timerId,
      resultKey,
      version,
    })

    if (!extraBodyLines.length) {
      return {
        ...base,
        body: interpolateFirstName(base.body, options.firstName),
      }
    }

    return {
      ...base,
      body: interpolateFirstName([base.body, ...extraBodyLines].join('\n'), options.firstName),
    }
  }

  const generic = GENERIC_FOLLOWUPS[timerId] ?? AB_TEST_FOLLOWUPS.action.RESULT_FOLLOWUP_24H
  const extraBodyLines = getTestDriveFollowupBodyLines({
    timerId,
    resultKey,
    version,
  })
  if (!extraBodyLines.length) {
    return {
      ...generic,
      body: interpolateFirstName(generic.body, options.firstName),
    }
  }

  return {
    ...generic,
    body: interpolateFirstName([generic.body, ...extraBodyLines].join('\n'), options.firstName),
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
    body: 'Ти зупинилась у процесі. Повернись і закрий тест за кілька хвилин.',
    cta: 'Продовжити тест',
  },
  R4_PROGRESS_24H: {
    title: 'Тест не завершено',
    body: 'Минуло 24 години з останньої активності в тесті. Дотисни до результату.',
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
    title: 'Оффер ФОКУС активний',
    body: 'Минуло 6 годин після показу офферу. Можеш зайти у ФОКУС у зручний момент.',
    cta: CTA_JOIN_FOCUS,
  },
  R8_OFFER_3D: {
    title: 'Останнє нагадування про оффер',
    body: 'Минуло 3 дні. Якщо готова рухатись у темпі з підтримкою, заходь у ФОКУС.',
    cta: 'Оплатити 1 місяць — 15 євро',
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
