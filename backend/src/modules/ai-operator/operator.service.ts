import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Prisma } from '@starway/db/prisma-client'
import { resolveModelStrategyTier } from '@starway/ai/providers/routing'

import { prisma } from '@/db/client.js'
import { coachBot } from '@/lib/telegram.js'
import { callProviderSafe } from '@/modules/sales-assistant/sales-assistant.providers.js'
import { getSettingsObject } from '@/services/scheduler/common.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)
const DOC_KEYS = {
  operatingRules: 'agents/shared/OPERATING-RULES.md',
  aiContentPrompt: 'agents/ai-content/dna-content-generator-offer.md',
  aiAssistantPrompt: 'agents/ai-assistant-bot/README.md',
  aiMentorMethodPrompt: 'agents/ai-mentor/methodology-absystem.md',
  aiFocusPrompt: 'agents/ai-mentor/focus-course-materials.md',
} as const

type DocKey = keyof typeof DOC_KEYS
type LoadedDocs = Record<DocKey, string>

let cachedDocsRoot: string | null = null
let cachedDocs: LoadedDocs | null = null
const REPO_ROOT_MARKER = 'pnpm-workspace.yaml'

export const AI_OPERATOR_ACTIONS = {
  POST_DONE: 'aiop:post_done',
  POST_EDIT: 'aiop:post_edit',
  POST_EDIT_AGAIN: 'aiop:post_edit_again',
  POST_PUBLISH: 'aiop:post_publish',
  POST_REGEN: 'aiop:post_regen',
  POST_SKIP: 'aiop:post_skip',
  OUTREACH_DONE: 'aiop:outreach_done',
  DIALOGUES_YES: 'aiop:dialogues_yes',
  DIALOGUES_NO: 'aiop:dialogues_no',
} as const

type AiOperatorAction =
  typeof AI_OPERATOR_ACTIONS[keyof typeof AI_OPERATOR_ACTIONS]

type DailyExecutionState = {
  date: string
  post_done: boolean
  outreach_done: boolean
  editing_post: boolean
  awaiting_dialogues: boolean
  draft_post?: string
  final_post?: string
  post_content?: string
  outreach_content?: string
  dialogue_context?: string
}

type StyleEditRecord = {
  original: string
  edited: string
  diff: string[]
  timestamp: string
}

type StyleMemoryState = {
  edits: StyleEditRecord[]
  styleHints: string[]
}

type OperatorStep = {
  text: string
  buttons: Array<Array<{ text: string; callback_data: string }>>
}

type StartDayState = {
  post_today_exists: boolean
  zoom_bookings_today: number
  conversations_count: number | null
}

const DEFAULT_STYLE_HINTS = [
  'Пиши короткими, прямими реченнями.',
  'Тон сухий, чіткий, без зайвої лірики.',
  'Роби акцент на дії, рішенні і русі зараз.',
] as const

function listAncestorPaths(startPath: string): string[] {
  const candidates: string[] = []
  let cursor = startPath

  for (let depth = 0; depth < 10; depth += 1) {
    candidates.push(cursor)
    const parent = dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }

  return candidates
}

function isRepoRoot(candidate: string): boolean {
  return existsSync(join(candidate, REPO_ROOT_MARKER))
}

function listRepoRootCandidates(): string[] {
  return listAncestorPaths(currentDirPath)
}

function resolveDocsRoot(): string {
  if (cachedDocsRoot) {
    return cachedDocsRoot
  }

  for (const candidate of listRepoRootCandidates()) {
    if (!isRepoRoot(candidate)) {
      continue
    }

    const docsDir = join(candidate, 'docs')
    const markerPath = join(docsDir, DOC_KEYS.operatingRules)
    if (existsSync(docsDir) && existsSync(markerPath)) {
      cachedDocsRoot = docsDir
      return docsDir
    }
  }

  throw new Error('ai_operator_docs_root_not_found')
}

function logMissingDocument(documentKey: DocKey, resolvedPath: string, error: unknown): void {
  console.warn('[ai-operator:document_unavailable]', {
    feature: 'ai-operator',
    document: DOC_KEYS[documentKey].split('/').at(-1) ?? DOC_KEYS[documentKey],
    resolvedPath,
    code: 'AI_DOCUMENT_NOT_FOUND',
    error: error instanceof Error ? error.message : String(error),
  })
}

function loadDocs(): LoadedDocs {
  if (cachedDocs) {
    return cachedDocs
  }

  let docsRoot: string
  try {
    docsRoot = resolveDocsRoot()
  } catch (error) {
    const resolvedPath = join(
      currentDirPath,
      'docs',
      DOC_KEYS.operatingRules,
    )
    logMissingDocument('operatingRules', resolvedPath, error)
    throw new Error('ai_operator_document_unavailable:operatingRules')
  }

  const docs = {} as LoadedDocs

  for (const [documentKey, relativePath] of Object.entries(DOC_KEYS) as Array<[DocKey, string]>) {
    const resolvedPath = resolve(docsRoot, relativePath)
    try {
      docs[documentKey] = readFileSync(resolvedPath, 'utf8')
    } catch (error) {
      logMissingDocument(documentKey, resolvedPath, error)
      throw new Error(`ai_operator_document_unavailable:${documentKey}`)
    }
  }

  cachedDocs = docs
  return docs
}

function docs(): LoadedDocs {
  return loadDocs()
}

function buildAiUnavailableStep(): OperatorStep {
  return {
    text: 'AI operator тимчасово недоступний. Перевір документи knowledge pack і спробуй ще раз.',
    buttons: [],
  }
}

async function withAiDocuments<T>(action: () => Promise<T>): Promise<T | OperatorStep> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ai_operator_document_unavailable:')) {
      return buildAiUnavailableStep()
    }
    throw error
  }
}

export const __testOnly = {
  resetAiOperatorDocsCache() {
    cachedDocsRoot = null
    cachedDocs = null
  },
  listRepoRootCandidates,
  resolveDocsRoot,
  docs,
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function getKyivDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getKyivDayBounds(date = new Date()): { start: Date; end: Date } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const [year, month, day] = formatter.format(date).split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  return { start, end }
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function averageSentenceLength(text: string): number {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return 0
  const totalWords = sentences.reduce((sum, sentence) => sum + sentence.split(/\s+/).filter(Boolean).length, 0)
  return totalWords / sentences.length
}

function hasEmoji(text: string): boolean {
  return /[\u{1F300}-\u{1FAFF}]/u.test(text)
}

function countMoneyMentions(text: string): number {
  const matches = text.match(/(?:\d+\s*(?:грн|євро|usd|\$)|гроші|ціна|вартість)/giu)
  return matches?.length ?? 0
}

function countWordMentions(text: string, words: string[]): number {
  const lowered = text.toLowerCase()
  return words.reduce((sum, word) => sum + (lowered.includes(word.toLowerCase()) ? 1 : 0), 0)
}

function extractDiff(original: string, edited: string): string[] {
  const diff: string[] = []
  const originalSentences = splitSentences(original)
  const editedSentences = splitSentences(edited)

  if (editedSentences.length < originalSentences.length) {
    diff.push('Скорочено структуру і прибрано зайві фрази.')
  } else if (editedSentences.length > originalSentences.length) {
    diff.push('Додано уточнення і додаткові акценти.')
  }

  if (averageSentenceLength(edited) < averageSentenceLength(original)) {
    diff.push('Речення зроблено коротшими.')
  }

  if (hasEmoji(original) && !hasEmoji(edited)) {
    diff.push('Прибрано емодзі.')
  }

  if (countMoneyMentions(edited) > countMoneyMentions(original)) {
    diff.push('Посилено акцент на грошах або ціні.')
  }

  const actionWords = ['дія', 'зараз', 'роби']
  if (countWordMentions(edited, actionWords) > countWordMentions(original, actionWords)) {
    diff.push('Посилено прямі слова дії.')
  }

  return diff.length > 0 ? diff : ['Змінено тон і подачу під стиль коуча.']
}

function deriveStyleHints(edits: StyleEditRecord[]): string[] {
  const hints = new Set<string>()
  let shorterSentencesWins = 0
  let emojiRemovalWins = 0
  let moneyWins = 0
  let actionWins = 0

  for (const edit of edits) {
    const original = edit.original
    const edited = edit.edited

    if (averageSentenceLength(edited) < averageSentenceLength(original)) {
      shorterSentencesWins += 1
    }
    if (hasEmoji(original) && !hasEmoji(edited)) {
      emojiRemovalWins += 1
    }
    if (countMoneyMentions(edited) > countMoneyMentions(original)) {
      moneyWins += 1
    }
    if (
      countWordMentions(edited, ['дія', 'зараз', 'роби']) >
      countWordMentions(original, ['дія', 'зараз', 'роби'])
    ) {
      actionWins += 1
    }
  }

  if (shorterSentencesWins > 0) {
    hints.add('Роби речення коротшими і щільнішими.')
  }
  if (emojiRemovalWins > 0) {
    hints.add('Не використовуй емодзі.')
  }
  if (moneyWins > 0) {
    hints.add('Сильніше підкреслюй ціну, гроші або цінність покупки.')
  }
  if (actionWins > 0) {
    hints.add('Частіше використовуй слова "дія", "зараз", "роби".')
  }

  hints.add('Тримай тон прямим і без води.')

  return Array.from(hints).slice(0, 6)
}

function readDailyExecution(rawSettings: unknown, dateKey: string): DailyExecutionState {
  const settings = getSettingsObject(rawSettings)
  const aiOperator = getSettingsObject(settings.aiOperator)
  const dailyExecution = getSettingsObject(aiOperator.dailyExecution)

  if (dailyExecution.date !== dateKey) {
    return {
      date: dateKey,
      post_done: false,
      outreach_done: false,
      editing_post: false,
      awaiting_dialogues: false,
    }
  }

  return {
    date: dateKey,
    post_done: dailyExecution.post_done === true,
    outreach_done: dailyExecution.outreach_done === true,
    editing_post: dailyExecution.editing_post === true,
    awaiting_dialogues: dailyExecution.awaiting_dialogues === true,
    draft_post:
      typeof dailyExecution.draft_post === 'string'
        ? dailyExecution.draft_post
        : undefined,
    final_post:
      typeof dailyExecution.final_post === 'string'
        ? dailyExecution.final_post
        : undefined,
    post_content:
      typeof dailyExecution.post_content === 'string'
        ? dailyExecution.post_content
        : undefined,
    outreach_content:
      typeof dailyExecution.outreach_content === 'string'
        ? dailyExecution.outreach_content
        : undefined,
    dialogue_context:
      typeof dailyExecution.dialogue_context === 'string'
        ? dailyExecution.dialogue_context
        : undefined,
  }
}

function readStyleMemory(rawSettings: unknown): StyleMemoryState {
  const settings = getSettingsObject(rawSettings)
  const aiOperator = getSettingsObject(settings.aiOperator)
  const styleMemory = getSettingsObject(aiOperator.styleMemory)
  const rawEdits = Array.isArray(styleMemory.edits) ? styleMemory.edits : []
  const edits = rawEdits
    .map((entry) => {
      const record = getSettingsObject(entry)
      const original = typeof record.original === 'string' ? record.original : ''
      const edited = typeof record.edited === 'string' ? record.edited : ''
      const diff = Array.isArray(record.diff)
        ? record.diff.filter((item): item is string => typeof item === 'string')
        : []
      const timestamp = typeof record.timestamp === 'string' ? record.timestamp : ''
      if (!original || !edited || !timestamp) return null
      return { original, edited, diff, timestamp }
    })
    .filter((entry): entry is StyleEditRecord => Boolean(entry))
    .slice(-10)

  const styleHints = Array.isArray(styleMemory.styleHints)
    ? styleMemory.styleHints.filter((item): item is string => typeof item === 'string').slice(0, 10)
    : []

  return {
    edits,
    styleHints,
  }
}

async function saveDailyExecution(
  userId: string,
  currentSettings: unknown,
  dailyExecution: DailyExecutionState,
  styleMemory?: StyleMemoryState,
): Promise<void> {
  const settings = getSettingsObject(currentSettings)
  const aiOperator = getSettingsObject(settings.aiOperator)
  const nextSettings: Prisma.InputJsonValue = {
    ...settings,
    aiOperator: {
      ...aiOperator,
      dailyExecution,
      ...(styleMemory ? { styleMemory } : {}),
    },
  }

  await prisma.user.update({
    where: { id: userId },
    data: { settings: nextSettings },
  })
}

async function collectStartDayState(userId: string): Promise<StartDayState> {
  const { start, end } = getKyivDayBounds()

  const zoom_bookings_today = await prisma.zoomSessionAttendee.count({
    where: {
      userId,
      session: {
        scheduledAt: {
          gte: start,
          lte: end,
        },
      },
    },
  })

  return {
    post_today_exists: false,
    zoom_bookings_today,
    conversations_count: null,
  }
}

async function generateContentPost(styleHints: string[]): Promise<string> {
  const knowledgePack = docs()
  const response = await callProviderSafe(
    'claude',
    [
      'Ти виконуєш роль ai-content як операторський execution agent.',
      'Використовуй тільки knowledge pack нижче.',
      knowledgePack.operatingRules,
      knowledgePack.aiContentPrompt,
    ].join('\n\n'),
    [
      'Завдання: згенеруй 1 Instagram-пост для FOCUS українською.',
      'Формат:',
      '- сильний хук на початку',
      '- 2-4 короткі абзаци',
      '- один чіткий CTA в кінці',
      '- без хештегів',
      '- без markdown',
      '- без пояснень і варіантів',
      'Контекст продукту: FOCUS = щотижневі Zoom-практики AB System.',
      'Ціль: підштовхнути до публікації поста сьогодні.',
      styleHints.length > 0
        ? `Write in this style:\n${styleHints.join('\n')}`
        : `Write in this style:\n${DEFAULT_STYLE_HINTS.join('\n')}`,
      'Поверни тільки готовий текст поста.',
    ].join('\n'),
    {
      contentType: 'telegram',
      strategyTier: resolveModelStrategyTier('raw_truth'),
    },
  )

  return response.content?.trim() || 'Сьогодні вийди не в контент, а в ясність.\n\nFOCUS не про ще одну мотивацію. Це місце, де перестаєш крутити одну й ту саму думку по колу і починаєш бачити, де саме зливається дія.\n\nРаз на тиждень на Zoom-практиці розбирається реальна ситуація: що відкладається, яке рішення зависло і який крок потрібно зробити зараз.\n\nЯкщо час перестати ходити по колу — заходь у FOCUS.'
}

async function generateOutreachMessage(): Promise<string> {
  const knowledgePack = docs()
  const response = await callProviderSafe(
    'claude',
    [
      'Ти виконуєш роль ai-assistant для operator execution flow.',
      'Використовуй тільки knowledge pack нижче.',
      knowledgePack.operatingRules,
      knowledgePack.aiAssistantPrompt,
      knowledgePack.aiMentorMethodPrompt,
      knowledgePack.aiFocusPrompt,
    ].join('\n\n'),
    [
      'Завдання: згенеруй 1 коротке outreach-повідомлення, яке коуч надішле 5 людям.',
      'Формат:',
      '- українською',
      '- 4-6 коротких рядків',
      '- природно, без маніпуляцій',
      '- одна чітка дія в кінці',
      '- без markdown',
      '- без варіантів і без пояснень',
      'Контекст: запросити в FOCUS на щотижневу Zoom-практику.',
      'Поверни тільки готовий текст повідомлення.',
    ].join('\n'),
    {
      contentType: 'telegram',
      strategyTier: resolveModelStrategyTier('raw_truth'),
    },
  )

  return response.content?.trim() || 'Привіт.\n\nЄ формат, де можна не говорити навколо проблеми, а розібрати одну реальну ситуацію й побачити, де саме стопориться дія.\n\nЦе щотижнева Zoom-практика FOCUS.\n\nЯкщо хочеш — скину деталі і найближчу дату.'
}

async function generateDialogueAssistMessage(dialogueContext: string): Promise<string> {
  const knowledgePack = docs()
  const response = await callProviderSafe(
    'claude',
    [
      'Ти виконуєш роль ai-assistant для operator execution flow.',
      'Використовуй тільки knowledge pack нижче.',
      knowledgePack.operatingRules,
      knowledgePack.aiAssistantPrompt,
      knowledgePack.aiMentorMethodPrompt,
      knowledgePack.aiFocusPrompt,
    ].join('\n\n'),
    [
      'Завдання: допоможи коучу дотиснути діалог після outreach.',
      'Формат:',
      '- українською',
      '- короткий розбір у 1-2 рядки',
      '- далі 1 готова відповідь, яку можна одразу надіслати',
      '- без markdown',
      '- без кількох варіантів',
      'Ось відповіді або контекст діалогу:',
      dialogueContext,
    ].join('\n'),
    {
      contentType: 'telegram',
      strategyTier: resolveModelStrategyTier('raw_truth'),
    },
  )

  return response.content?.trim() || 'Тримай коротку відповідь: "Бачу, що тема зараз жива. Якщо хочеш, я скину найближчу дату Zoom-практики і ти подивишся, чи тобі підходить формат."'
}

function buildPostStep(input: {
  state: StartDayState
  postContent: string
}): OperatorStep {
  return {
    text: [
      '<b>Стан:</b>',
      `Пост: ${input.state.post_today_exists ? '✅' : '❌'}`,
      `Zoom бронювання сьогодні: ${input.state.zoom_bookings_today}`,
      '',
      '<b>Що робимо:</b>',
      'Опублікувати пост',
      '',
      '<b>Пост:</b>',
      escapeHtml(input.postContent),
    ].join('\n'),
    buttons: [
      [
        { text: 'Редагувати', callback_data: AI_OPERATOR_ACTIONS.POST_EDIT },
        { text: 'Опублікувала', callback_data: AI_OPERATOR_ACTIONS.POST_DONE },
      ],
    ],
  }
}

function buildEditPromptStep(): OperatorStep {
  return {
    text: 'Відредагуй текст і надішли його повідомленням',
    buttons: [],
  }
}

function buildEditedPostStep(finalPost: string): OperatorStep {
  return {
    text: [
      '<b>Оновлений пост:</b>',
      escapeHtml(finalPost),
    ].join('\n\n'),
    buttons: [
      [
        { text: 'Опублікувати', callback_data: AI_OPERATOR_ACTIONS.POST_PUBLISH },
        { text: 'Згенерувати новий', callback_data: AI_OPERATOR_ACTIONS.POST_REGEN },
      ],
    ],
  }
}

function buildOutreachStep(outreachContent: string): OperatorStep {
  return {
    text: [
      '<b>Далі:</b>',
      'Напиши 5 людям:',
      '',
      escapeHtml(outreachContent),
    ].join('\n'),
    buttons: [
      [{ text: 'Написала', callback_data: AI_OPERATOR_ACTIONS.OUTREACH_DONE }],
    ],
  }
}

function buildOutreachFollowupStep(): OperatorStep {
  return {
    text: [
      '🔥 Добре.',
      '',
      'Тепер скинь відповіді або напиши:',
      'є діалоги / нема',
    ].join('\n'),
    buttons: [
      [
        { text: 'Є діалоги', callback_data: AI_OPERATOR_ACTIONS.DIALOGUES_YES },
        { text: 'Нема', callback_data: AI_OPERATOR_ACTIONS.DIALOGUES_NO },
      ],
    ],
  }
}

function buildDialoguePromptStep(): OperatorStep {
  return {
    text: [
      'Я розберу відповіді і допоможу дожати.',
      '',
      '👉 Скинь відповіді повідомленням',
    ].join('\n'),
    buttons: [
      [{ text: 'Нема', callback_data: AI_OPERATOR_ACTIONS.DIALOGUES_NO }],
    ],
  }
}

function buildDialogueAssistStep(assistMessage: string): OperatorStep {
  return {
    text: [
      '<b>Що відповісти:</b>',
      escapeHtml(assistMessage),
    ].join('\n\n'),
    buttons: [
      [
        { text: 'Є ще діалоги', callback_data: AI_OPERATOR_ACTIONS.DIALOGUES_YES },
        { text: 'Нема', callback_data: AI_OPERATOR_ACTIONS.DIALOGUES_NO },
      ],
    ],
  }
}

function buildDialogueLoopStep(): OperatorStep {
  return {
    text: '👉 Напиши ще 5 людям',
    buttons: [
      [{ text: 'Написала', callback_data: AI_OPERATOR_ACTIONS.OUTREACH_DONE }],
    ],
  }
}

function buildDoneStep(state: DailyExecutionState): OperatorStep {
  return {
    text: [
      '<b>Сьогоднішній execution закрито.</b>',
      `Пост: ${state.post_done ? '✅' : '❌'}`,
      `Outreach: ${state.outreach_done ? '✅' : '❌'}`,
    ].join('\n'),
    buttons: [],
  }
}

function buildPublishConfirmStep(): OperatorStep {
  return {
    text: [
      '✅ Пост готовий.',
      '',
      '👉 Далі: напиши 5 людям',
    ].join('\n'),
    buttons: [
      [{ text: 'Написала', callback_data: AI_OPERATOR_ACTIONS.OUTREACH_DONE }],
    ],
  }
}

async function loadUserOperatorState(userId: string): Promise<{
  settings: unknown
  dailyExecution: DailyExecutionState
  styleMemory: StyleMemoryState
  state: StartDayState
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  })

  const dateKey = getKyivDateKey()
  return {
    settings: user?.settings ?? {},
    dailyExecution: readDailyExecution(user?.settings, dateKey),
    styleMemory: readStyleMemory(user?.settings),
    state: await collectStartDayState(userId),
  }
}

export async function runCoachStartDay(userId: string): Promise<OperatorStep> {
  const result = await withAiDocuments(async () => {
    const { settings, dailyExecution, styleMemory, state } = await loadUserOperatorState(userId)

    if (!dailyExecution.post_done) {
      if (dailyExecution.editing_post) {
        return buildEditPromptStep()
      }

      const postContent =
        dailyExecution.final_post ??
        dailyExecution.draft_post ??
        dailyExecution.post_content ??
        await generateContentPost(styleMemory.styleHints)
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        draft_post: postContent,
        post_content: postContent,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildPostStep({ state, postContent })
    }

    if (dailyExecution.awaiting_dialogues) {
      return buildDialoguePromptStep()
    }

    if (!dailyExecution.outreach_done) {
      const outreachContent = dailyExecution.outreach_content ?? await generateOutreachMessage()
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        outreach_content: outreachContent,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildOutreachStep(outreachContent)
    }

    return buildDoneStep(dailyExecution)
  })

  return result
}

export async function runCoachOperatorAction(
  userId: string,
  action: AiOperatorAction,
): Promise<OperatorStep> {
  const result = await withAiDocuments(async () => {
    const { settings, dailyExecution, styleMemory, state } = await loadUserOperatorState(userId)

    if (
      action === AI_OPERATOR_ACTIONS.POST_EDIT ||
      action === AI_OPERATOR_ACTIONS.POST_EDIT_AGAIN
    ) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        editing_post: true,
        awaiting_dialogues: false,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildEditPromptStep()
    }

    if (action === AI_OPERATOR_ACTIONS.POST_REGEN) {
      const postContent = await generateContentPost(styleMemory.styleHints)
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        editing_post: false,
        draft_post: postContent,
        final_post: undefined,
        post_content: postContent,
        post_done: false,
        awaiting_dialogues: false,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildPostStep({ state, postContent })
    }

    if (action === AI_OPERATOR_ACTIONS.POST_PUBLISH) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        post_done: true,
        editing_post: false,
        outreach_done: false,
        awaiting_dialogues: false,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildPublishConfirmStep()
    }

    if (
      action === AI_OPERATOR_ACTIONS.POST_DONE ||
      action === AI_OPERATOR_ACTIONS.POST_SKIP
    ) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        post_done: true,
        editing_post: false,
        outreach_done: false,
        awaiting_dialogues: false,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildPublishConfirmStep()
    }

    if (action === AI_OPERATOR_ACTIONS.OUTREACH_DONE) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        awaiting_dialogues: false,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildOutreachFollowupStep()
    }

    if (action === AI_OPERATOR_ACTIONS.DIALOGUES_YES) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        awaiting_dialogues: true,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildDialoguePromptStep()
    }

    if (action === AI_OPERATOR_ACTIONS.DIALOGUES_NO) {
      const nextState: DailyExecutionState = {
        ...dailyExecution,
        awaiting_dialogues: false,
        dialogue_context: undefined,
      }
      await saveDailyExecution(userId, settings, nextState)
      return buildDialogueLoopStep()
    }

    return buildDoneStep(dailyExecution)
  })

  return result
}

export async function isCoachPostEditingActive(userId: string): Promise<boolean> {
  const { dailyExecution } = await loadUserOperatorState(userId)
  return dailyExecution.editing_post === true
}

export async function isCoachDialogueAwaiting(userId: string): Promise<boolean> {
  const { dailyExecution } = await loadUserOperatorState(userId)
  return dailyExecution.awaiting_dialogues === true
}

export async function submitCoachEditedPost(
  userId: string,
  finalPost: string,
): Promise<OperatorStep> {
  const { settings, dailyExecution, styleMemory } = await loadUserOperatorState(userId)
  const sanitizedPost = finalPost.trim()
  const originalDraft = String(dailyExecution.draft_post ?? dailyExecution.post_content ?? '').trim()
  const shouldLearn = Boolean(originalDraft && sanitizedPost && originalDraft !== sanitizedPost)
  const nextEdits = shouldLearn
    ? [
        ...styleMemory.edits,
        {
          original: originalDraft,
          edited: sanitizedPost,
          diff: extractDiff(originalDraft, sanitizedPost),
          timestamp: new Date().toISOString(),
        },
      ].slice(-10)
    : styleMemory.edits
  const nextStyleMemory: StyleMemoryState = {
    edits: nextEdits,
    styleHints: nextEdits.length > 0 ? deriveStyleHints(nextEdits) : [...DEFAULT_STYLE_HINTS],
  }
  const nextState: DailyExecutionState = {
    ...dailyExecution,
    editing_post: false,
    awaiting_dialogues: false,
    draft_post: sanitizedPost,
    final_post: sanitizedPost,
    post_content: sanitizedPost,
  }
  await saveDailyExecution(userId, settings, nextState, nextStyleMemory)
  return buildEditedPostStep(sanitizedPost)
}

export async function submitCoachDialogues(
  userId: string,
  dialogueContext: string,
): Promise<OperatorStep> {
  const result = await withAiDocuments(async () => {
    const { settings, dailyExecution, styleMemory } = await loadUserOperatorState(userId)
    const sanitizedContext = dialogueContext.trim()
    const assistMessage = await generateDialogueAssistMessage(sanitizedContext)
    const nextState: DailyExecutionState = {
      ...dailyExecution,
      outreach_done: true,
      awaiting_dialogues: false,
      dialogue_context: sanitizedContext,
    }
    await saveDailyExecution(userId, settings, nextState, styleMemory)
    return buildDialogueAssistStep(assistMessage)
  })

  return result
}

export async function sendCoachZoomSummary(
  expertId: string | null | undefined,
  text: string,
  options?: {
    targetUserIds?: string[]
    replyMarkup?: {
      inline_keyboard: Array<Array<
        | { text: string; callback_data: string }
        | { text: string; url: string }
        | { text: string; web_app: { url: string } }
      >>
    }
  },
): Promise<Array<{ userId: string; sent: boolean }>> {
  if (!expertId || !text.trim()) {
    return []
  }

  const targetUserIds = options?.targetUserIds?.filter(Boolean) ?? []

  const coaches = await prisma.user.findMany({
    where: {
      expertId,
      deletedAt: null,
      role: { in: ['EXPERT', 'SUPERADMIN'] },
      ...(targetUserIds.length > 0 ? { id: { in: targetUserIds } } : {}),
    },
    select: {
      id: true,
      telegramChatId: true,
      telegramLinks: {
        where: {
          isActive: true,
          chatId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const results: Array<{ userId: string; sent: boolean }> = []

  for (const coach of coaches) {
    const chatId = coach.telegramChatId ?? coach.telegramLinks[0]?.chatId ?? null
    if (!chatId) {
      results.push({ userId: coach.id, sent: false })
      continue
    }

    await coachBot.telegram.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: options?.replyMarkup,
    })
    results.push({ userId: coach.id, sent: true })
  }

  return results
}
