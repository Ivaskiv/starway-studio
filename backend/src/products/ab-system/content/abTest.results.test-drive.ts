import type { TelegramButton } from '@/core/flow-builder/flowTemplates.js'
import type { AbTestFollowupTimerId } from './abTest.followups.js'
import type { AbTestResultKey } from './abTest.results.js'
import {
  AB_TEST_FOCUS_CTA_BLOCK,
  AB_TEST_FOCUS_CTA_TEXT,
  AB_TEST_FOCUS_JOIN_CTA_MULTILINE_TEXT,
  AB_TEST_FOCUS_JOIN_CTA_TEXT,
  AB_TEST_FOCUS_PAYMENT_CTA_1M,
  AB_TEST_FOCUS_PAYMENT_CTA_3M,
  AB_TEST_FOCUS_PITCH_LINES,
  AB_TEST_FOCUS_PRACTICE_CORE_LINES,
  AB_TEST_FOCUS_PRACTICE_FULL_LINES,
  AB_TEST_FOCUS_PRACTICE_TITLE,
  AB_TEST_FOCUS_PRICE_1M,
  AB_TEST_FOCUS_PRICE_1Y,
  AB_TEST_FOCUS_PRICE_3M,
  AB_TEST_FOCUS_REAL_SITUATION_HEADER,
  AB_TEST_FOCUS_REAL_SITUATION_INLINE,
  AB_TEST_FOCUS_REAL_SITUATION_LINES,
  AB_TEST_FOCUS_TARIFF_HEADER,
  AB_TEST_FOCUS_TARIFF_HEADER_BOLD,
  AB_TEST_FOCUS_TEST_DRIVE_PITCH_BLOCKS,
  AB_TEST_FOCUS_TITLE_PLAIN,
  AB_TEST_FOCUS_TITLE_STYLED,
  AB_TEST_FOCUS_WEEKLY_TEXT,
  AB_TEST_FOCUS_WEEKLY_TEXT_BOLD,
  AB_TEST_SCREENSHOT_URLS,
  AB_TEST_SHOW_INSIDE_CTA_MULTILINE_TEXT,
  AB_TEST_VOICE_NOTE_LINES,
  telegramBlock,
  type TelegramContentBlock,
} from './abTest.shared.js'

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
          callback_data: `show_inside_${input.resultKey?.toUpperCase()}`,
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
    AB_TEST_FOCUS_PRICE_1Y,
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
      `${AB_TEST_FOCUS_PRICE_1M}\n${AB_TEST_FOCUS_PRICE_3M}\n${AB_TEST_FOCUS_PRICE_1Y}`
    ),
  ],
} as const
