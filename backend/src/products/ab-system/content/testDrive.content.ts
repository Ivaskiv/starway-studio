import type { TelegramButton } from '@/core/flow-builder/flowTemplates.js'

import type { AbTestFollowupTimerId } from './abTest.followups.js'
import type { AbTestResultKey } from './abTest.results.js'

export type TestDriveContentVersion = 'legacy' | 'v2'
export type TestDriveCode = 'A' | 'B' | 'V' | 'G' | 'D'

export type TestDriveResultSurface = {
  title: string
  bodyLines: string[]
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
    ],
  },
  B: {
    title: 'Всередині це виглядає так: ціль → ясність',
    bodyLines: [
      'Ми розбираємо не красиву ціль, а ту, яку ти справді тягнеш всередині.',
      'В результаті лишається одна ясна лінія руху без зайвого шуму.',
      'Саме так ціль перестає розтікатися і починає тримати дію.',
    ],
  },
  V: {
    title: 'Всередині це виглядає так: вибір → фокус',
    bodyLines: [
      'Ми не розводимо тебе по багатьох варіантах.',
      'Показуємо, що саме ти боїшся втратити, коли обираєш.',
      'І допомагаємо лишити один напрямок, який не розпадається на півдорозі.',
    ],
  },
  G: {
    title: 'Всередині це виглядає так: рішення → фіксація',
    bodyLines: [
      'Тут усе про момент, коли «я вже знаю» перетворюється на «я роблю».',
      'Ми збираємо рішення так, щоб воно не розвалювалось після першої ж паузи.',
      'У результаті з’являється не обіцянка собі, а конкретний наступний крок.',
    ],
  },
  D: {
    title: 'Всередині це виглядає так: дія → ритм',
    bodyLines: [
      'Ми переводимо дію з разового ривка в повторюваний ритм.',
      'Щоб ти не починала з нуля щоразу, коли день стає складнішим.',
      'Саме ритм робить результат стабільним, а не випадковим.',
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

  const story = TEST_DRIVE_INSIDE_STORIES[code]
  return {
    title: '👀 Як це виглядає зсередини',
    bodyLines: [
      `Код результату: ${code}`,
      '',
      'Це короткий preview того, що буде всередині.',
      '',
      'Соціальні докази:',
      ...SOCIAL_PROOF_LINES.map((line) => `• ${line}`),
    ],
    buttons: [
      [{ text: '👀 Як це виглядає зсередини', callback_data: 'ab_test:test_drive' }],
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

  const story = TEST_DRIVE_INSIDE_STORIES[code]
  return {
    title: '👀 Як це виглядає зсередини',
    bodyLines: [
      `Код результату: ${code}`,
      '',
      story.title,
      '',
      ...story.bodyLines,
      '',
      'Соціальні докази:',
      ...SOCIAL_PROOF_LINES.map((line) => `• ${line}`),
    ],
    buttons: [
      [{ text: '⬅️ Повернутись до результату', callback_data: 'ab_test:show_result' }],
      [{ text: 'Що з цим робити?', callback_data: 'ab_test:start_wheel' }],
    ],
  }
}

export function getTestDriveInsideResponseSurface(input: {
  resultKey?: AbTestResultKey | null
}): TestDriveResultSurface | null {
  const code = resolveTestDriveCode(input.resultKey)
  if (!code) return null

  const story = TEST_DRIVE_INSIDE_STORIES[code]
  return {
    title: '👀 Як це виглядає зсередини',
    bodyLines: [
      `Код результату: ${code}`,
      '',
      story.title,
      '',
      ...story.bodyLines,
      '',
      'Соціальні докази:',
      ...SOCIAL_PROOF_LINES.map((line) => `• ${line}`),
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
  if (input.version !== 'v2') return []
  const code = resolveTestDriveCode(input.resultKey)
  if (!code) return []

  const story = TEST_DRIVE_INSIDE_STORIES[code]
  const isDojim = input.timerId.startsWith('RESULT_DOJIM_')
  if (!isDojim) return []

  return [
    '',
    'Соціальні докази:',
    ...SOCIAL_PROOF_LINES.map((line) => `• ${line}`),
    '',
    story.title,
  ]
}
