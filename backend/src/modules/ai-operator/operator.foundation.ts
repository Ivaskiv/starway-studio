import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '@/db/client.js'
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

export type AiOperatorAction =
  typeof AI_OPERATOR_ACTIONS[keyof typeof AI_OPERATOR_ACTIONS]

export type DailyExecutionState = {
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

export type StyleEditRecord = {
  original: string
  edited: string
  diff: string[]
  timestamp: string
}

export type StyleMemoryState = {
  edits: StyleEditRecord[]
  styleHints: string[]
}

export type OperatorStep = {
  text: string
  buttons: Array<Array<{ text: string; callback_data: string }>>
}

export type StartDayState = {
  post_today_exists: boolean
  zoom_bookings_today: number
  conversations_count: number | null
}

export const DEFAULT_STYLE_HINTS = [
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

export function docs(): LoadedDocs {
  return loadDocs()
}

function buildAiUnavailableStep(): OperatorStep {
  return {
    text: 'AI operator тимчасово недоступний. Перевір документи knowledge pack і спробуй ще раз.',
 buttons: [],
 }
}

export async function withAiDocuments<T>(action: () => Promise<T>): Promise<T | OperatorStep> {
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

export function escapeHtml(value: string): string {
 return value
 .replaceAll('&', '&amp;')
 .replaceAll('<', '&lt;')
 .replaceAll('>', '&gt;')
}

export function getKyivDateKey(date = new Date()): string {
 return new Intl.DateTimeFormat('en-CA', {
 timeZone: 'Europe/Kyiv',
 year: 'numeric',
 month: '2-digit',
 day: '2-digit',
 }).format(date)
}

export function getKyivDayBounds(date = new Date()): { start: Date; end: Date } {
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

export function extractDiff(original: string, edited: string): string[] {
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

export function deriveStyleHints(edits: StyleEditRecord[]): string[] {
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

export function readDailyExecution(rawSettings: unknown, dateKey: string): DailyExecutionState {
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

export function readStyleMemory(rawSettings: unknown): StyleMemoryState {
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

export async function saveDailyExecution(
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
