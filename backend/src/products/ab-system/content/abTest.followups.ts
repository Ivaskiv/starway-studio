// backend/src/products/ab-system/content/abTest.followups.ts

import type { AbTestResultKey } from './abTest.results.js'

export type FollowupCopy = {
  title: string
  body: string
  cta?: string
}

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

const CTA_FOCUS = 'Приєднатись'
const CTA_FOCUS_ALT = 'Хочу у ФОКУС'
const CTA_PAY = 'Оплатити ФОКУС'
const CTA_JOIN_FOCUS = 'Приєднатись до ФОКУСУ'

const DOJIM_24H: FollowupCopy = {
  title: 'ФОКУС',
  body: [
    'Ти вже побачила свій результат у тесті.',
    'Тепер головне — не залишити це просто думкою.',
    'Бо часто так і буває: прочитала, впізнала себе, погодилась,',
    'і знову пішла у свій звичний день.',
    '',
    'Якщо хочеш розібрати свою ситуацію не в голові, а на практиці — заходь у ФОКУС.',
    '1 місяць — 780 грн',
    '3 місяці — 1990 грн',
  ].join('\n'),
  cta: CTA_JOIN_FOCUS,
}

const DOJIM_48H: FollowupCopy = {
  title: 'ФОКУС',
  body: [
    'Можна ще місяць думати про те, що ти давно хочеш зробити.',
    'А можна взяти одну ситуацію і нарешті подивитись чесно:',
    '— що ти відкладаєш;',
    '— чому переносиш;',
    '— яке рішення не приймаєш;',
    '— який крок реально зробити цього тижня.',
    '',
    'Саме для цього є ФОКУС.',
  ].join('\n'),
  cta: CTA_FOCUS_ALT,
}

const DOJIM_72H: FollowupCopy = {
  title: 'ФОКУС',
  body: [
    'Я не буду переконувати тебе «терміново змінювати життя».',
    'Але якщо є щось, що ти давно відкладаєш, воно саме не зникне.',
    'Його треба побачити. Розібрати. І довести до кроку.',
    '',
    'У ФОКУСІ ми це робимо на живих Zoom-практиках.',
  ].join('\n'),
  cta: CTA_PAY,
}

function buildBranchCopy(): BranchFollowupCopy {
  return {
    RESULT_FOLLOWUP_24H: {
      title: 'ФОКУС',
      body: `Ти вже побачила свій результат у тесті.

Тепер головне — не залишити це просто думкою.

Часто так:
прочитала, впізнала — і знову повернулась у звичний день.`,
      cta: CTA_FOCUS,
    },

    RESULT_FOLLOWUP_48H: {
      title: 'ФОКУС',
      body: `Можна ще місяць думати про те, що давно хочеш зробити.

А можна взяти одну ситуацію і нарешті подивитись чесно:
що відкладаєш;
чому переносиш;
який крок реально зробити.`,
      cta: CTA_FOCUS_ALT,
    },

    RESULT_FOLLOWUP_72H: {
      title: 'ФОКУС',
      body: `Я не буду переконувати «терміново змінювати життя».

Але якщо є щось, що давно відкладаєш — воно само не зникне.

Його треба побачити.
Розібрати.
Довести до кроку.`,
      cta: CTA_PAY,
    },

    RESULT_DOJIM_24H: DOJIM_24H,
    RESULT_DOJIM_48H: DOJIM_48H,
    RESULT_DOJIM_72H: DOJIM_72H,

    RESULT_DOJIM_5D: {
      title: 'ФОКУС',
      body: `Задай собі одне питання:

Те, що я відкладаю, само вирішиться за цей місяць?

Якщо чесна відповідь «ні» — не чекай ідеального моменту.`,
      cta: CTA_FOCUS,
    },

    RESULT_DOJIM_7D: {
      title: 'ФОКУС',
      body: `Останнє нагадування про ФОКУС.

Якщо пройшла тест і впізнала себе — тема вже є.

Можна залишити в голові.
А можна прийти і розібрати.

780 грн / 1 місяць | 1990 грн / 3 місяці`,
      cta: CTA_PAY,
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
      'Супер.',
      'Ось доступ у ФОКУС:',
      '',
      '1 місяць — 780 грн',
      '3 місяці — 1990 грн',
      '',
      'Після оплати ти отримаєш посилання на закритий Telegram-канал',
      'і доступ до живих Zoom-практик.',
    ].join('\n'),
    cta: 'Оплатити',
  },
  PAYMENT_REMINDER_24H: {
    title: 'ФОКУС',
    body: 'Якщо хочеш продовжити, контекст уже збережено.',
    cta: CTA_PAY,
  },
  PAYMENT_REMINDER_48H: {
    title: 'ФОКУС',
    body: 'Повертаємось до рішення: що саме дає тобі зараз найбільше користі.',
    cta: CTA_PAY,
  },
  PAYMENT_REMINDER_72H: {
    title: 'ФОКУС',
    body: 'Незавершений крок теж впливає на ритм. Можна мʼяко повернутись до нього.',
    cta: CTA_FOCUS,
  },
  PAYMENT_REMINDER_5D: {
    title: 'ФОКУС',
    body: 'Пауза вже показує ціну відкладання. Повернутись можна одним кроком.',
    cta: CTA_FOCUS,
  },
  PAYMENT_REMINDER_7D: {
    title: 'ФОКУС',
    body: 'Можна повернутись до збереженого прогресу і свого темпу.',
    cta: CTA_FOCUS,
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
) {
  if (resultKey && timerId in AB_TEST_FOLLOWUPS[resultKey]) {
    return AB_TEST_FOLLOWUPS[resultKey][timerId as keyof BranchFollowupCopy]
  }

  return GENERIC_FOLLOWUPS[timerId] ?? AB_TEST_FOLLOWUPS.action.RESULT_FOLLOWUP_24H
}
