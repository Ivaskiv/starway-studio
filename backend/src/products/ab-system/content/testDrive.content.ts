import type { TelegramButton } from '@/core/flow-builder/flowTemplates.js'

import type { AbTestFollowupTimerId } from './abTest.followups.js'
import {
  AB_TEST_FOCUS_PRACTICE_TITLE,
  AB_TEST_FOCUS_PRACTICE_FULL_LINES,
  AB_TEST_FOCUS_PITCH_LINES,
  AB_TEST_VOICE_NOTE_LINES,
  AB_TEST_SCREENSHOT_URLS,
  telegramBlock,
} from './abTest.shared.js'
import type { AbTestResultKey } from './abTest.results.js'

export type TestDriveContentVersion = 'legacy' | 'v2'
export type TestDriveCode = 'A' | 'B' | 'V' | 'G' | 'D'

export type TestDriveResultSurface = {
  title: string
  bodyLines: string[]
  blocks?: import('./abTest.shared.js').TelegramContentBlock[]
  buttons: TelegramButton[][]
}

export type TestDriveFollowupSurface = {
  bodyLines: string[]
}

const TEST_DRIVE_V2_ROLLOUT_AT = new Date(
  process.env.AB_TEST_TEST_DRIVE_V2_ROLLOUT_AT ?? '2026-06-05T00:00:00.000Z',
)

const SOCIAL_PROOF_LINES = [
  'Neonila: "Я вперше побачила, де саме зупиняю себе. Це було дуже практично."',
  'Nataliia: "Мені зайшло, що все розкладається по кроках, без зайвого тиску."',
  'Valentyna: "Замість хаосу з’явився один зрозумілий наступний крок."',
]

const TEST_DRIVE_INSIDE_STORIES: Record<TestDriveCode, {
  title: string
  bodyLines: string[]
}> = {
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

export function resolveTestDriveVersion(startedAt?: string | null): TestDriveContentVersion {
  const normalized = normalizeStartedAt(startedAt)
  if (normalized === null) return 'legacy'
  return normalized >= TEST_DRIVE_V2_ROLLOUT_AT.getTime() ? 'v2' : 'legacy'
}

export function resolveTestDriveCode(resultKey?: AbTestResultKey | null): TestDriveCode | null {
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
      telegramBlock.text('На практиці ми не розбираємо все життя одразу.'),
      telegramBlock.text('Ми беремо одну ситуацію яка зараз найбільше тебе зупиняє.'),
      telegramBlock.text('Спочатку знаходимо де саме ти зупиняєшся.'),
      telegramBlock.text('Потім бачимо що саме це підтримує.'),
      telegramBlock.text('Після цього визначаємо один конкретний крок який допомагає вийти з цього кола.'),
      telegramBlock.image(AB_TEST_SCREENSHOT_URLS.test_drive_result_review),
      telegramBlock.text('Що ти отримуєш у ФОКУСІ:'),
      telegramBlock.text('Розуміння де саме зараз зупиняєшся'),
      telegramBlock.text('Причину через яку ситуація повторюється знову і знову'),
      telegramBlock.text('Один конкретний крок який допомагає іти далі'),
      telegramBlock.text('Можливість розібрати свою ситуацію наживо разом зі мною'),
    ],
    buttons: [
      [{ text: 'Показати\nяк проходить\nпрактика', callback_data: 'ab_test:test_drive' }],
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
      telegramBlock.text('На практиці ми не розбираємо все життя одразу.'),
      telegramBlock.text('Ми беремо одну ситуацію яка зараз найбільше тебе зупиняє.'),
      telegramBlock.text('Спочатку знаходимо де саме ти зупиняєшся.'),
      telegramBlock.text('Потім бачимо що саме це підтримує.'),
      telegramBlock.text('Після цього визначаємо один конкретний крок який допомагає вийти з цього кола.'),
      telegramBlock.image(AB_TEST_SCREENSHOT_URLS.test_drive_inside_review),
      telegramBlock.text('Що ти отримуєш у ФОКУСІ:'),
      telegramBlock.text('Розуміння де саме зараз зупиняєшся'),
      telegramBlock.text('Причину через яку ситуація повторюється знову і знову'),
      telegramBlock.text('Один конкретний крок який допомагає іти далі'),
      telegramBlock.text('Можливість розібрати свою ситуацію наживо разом зі мною'),
    ],
    buttons: [
      [{ text: 'Хочу у ФОКУС →', callback_data: 'open_focus_payment' }],
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
      telegramBlock.text('На практиці ми не розбираємо все життя одразу.'),
      telegramBlock.text('Ми беремо одну ситуацію яка зараз найбільше тебе зупиняє.'),
      telegramBlock.text('Спочатку знаходимо де саме ти зупиняєшся.'),
      telegramBlock.text('Потім бачимо що саме це підтримує.'),
      telegramBlock.text('Після цього визначаємо один конкретний крок який допомагає вийти з цього кола.'),
      telegramBlock.image(AB_TEST_SCREENSHOT_URLS.test_drive_response_review),
      telegramBlock.text('Що ти отримуєш у ФОКУСІ:'),
      telegramBlock.text('Розуміння де саме зараз зупиняєшся'),
      telegramBlock.text('Причину через яку ситуація повторюється знову і знову'),
      telegramBlock.text('Один конкретний крок який допомагає іти далі'),
      telegramBlock.text('Можливість розібрати свою ситуацію наживо разом зі мною'),
    ],
    buttons: [
      [{ text: 'Приєднатись до ФОКУСУ →', callback_data: 'open_focus_payment' }],
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
