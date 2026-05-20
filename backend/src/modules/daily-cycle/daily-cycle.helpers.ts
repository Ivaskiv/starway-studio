import { Prisma, DailyChoice, DailyDrain, DailyState } from '@starway/db/prisma-client'

import { updateUserState, isOpenAIQuotaError } from '../ai-mentor/state.service.js'

const JOURNAL_TIMEZONE = 'Europe/Kyiv'

export const todayRange = () => {
  const start = new Date()

  start.setHours(0, 0, 0, 0)

  const end = new Date(start)

  end.setDate(end.getDate() + 1)

  return { start, end }
}

export function getJournalDayAnchor(input: string | Date | undefined | null) {
  const source = input ? new Date(input) : new Date()

  if (Number.isNaN(source.getTime())) {
    return new Date()
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: JOURNAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(source)

  const year = parts.find(part => part.type === 'year')?.value ?? '1970'
  const month = parts.find(part => part.type === 'month')?.value ?? '01'
  const day = parts.find(part => part.type === 'day')?.value ?? '01'

  return new Date(`${year}-${month}-${day}T12:00:00.000Z`)
}

export function getPreviousJournalDayAnchor(input: Date) {
  const previous = new Date(input)

  previous.setUTCDate(previous.getUTCDate() - 1)

  return getJournalDayAnchor(previous)
}

export const toPrismaJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value))

export const toDailySessionChannel = (
  channel?: 'tg' | 'miniapp' | 'web',
): 'TELEGRAM' | 'MINIAPP' | 'WEB' => {
  if (channel === 'tg') return 'TELEGRAM'
  if (channel === 'miniapp') return 'MINIAPP'

  return 'WEB'
}

export function syncUserStateFromEntry(entry: {
  userId: string
  state: DailyState
  choice: DailyChoice
  dayFact: string | null
  drain: DailyDrain | null
}) {
  void updateUserState({
    userId: entry.userId,
    source: 'daily',
    answers: {
      state: entry.state,
      choice: entry.choice,
      factOfDay: entry.dayFact ?? '',
      drain: entry.drain ?? '',
    },
  }).catch(error => {
    if (isOpenAIQuotaError(error)) {
      console.warn('[updateUserState] skipped enrichment due to OpenAI quota', {
        userId: entry.userId,
        source: 'daily',
      })

      return
    }

    console.error('[updateUserState]', error)
  })
}

export function mergeSessionContent(
  existingContent: unknown,
  session: 'morning' | 'evening',
  answers: Record<string, string>,
): Prisma.InputJsonValue {
  const base =
    existingContent &&
    typeof existingContent === 'object' &&
    !Array.isArray(existingContent)
      ? (existingContent as Record<string, unknown>)
      : {}

  const existingSessionAnswers = base[session]

  const nextSessionAnswers =
    Object.keys(answers).length > 0
      ? answers
      : existingSessionAnswers &&
          typeof existingSessionAnswers === 'object' &&
          !Array.isArray(existingSessionAnswers)
        ? (existingSessionAnswers as Record<string, string>)
        : answers

  return toPrismaJson({
    ...base,
    [session]: nextSessionAnswers,
  })
}

export function mergeSessionMeta(
  existingContent: unknown,
  session: 'morning' | 'evening',
  metaPatch: Record<string, unknown>,
): Prisma.InputJsonValue {
  const base =
    existingContent &&
    typeof existingContent === 'object' &&
    !Array.isArray(existingContent)
      ? (existingContent as Record<string, unknown>)
      : {}

  const metaKey = session === 'morning' ? 'morningMeta' : 'eveningMeta'

  const currentMeta =
    base[metaKey] &&
    typeof base[metaKey] === 'object' &&
    !Array.isArray(base[metaKey])
      ? (base[metaKey] as Record<string, unknown>)
      : {}

  return toPrismaJson({
    ...base,
    [metaKey]: {
      ...currentMeta,
      ...metaPatch,
    },
  })
}

export function getSessionMeta(
  existingContent: unknown,
  session: 'morning' | 'evening',
): Record<string, unknown> {
  const base =
    existingContent &&
    typeof existingContent === 'object' &&
    !Array.isArray(existingContent)
      ? (existingContent as Record<string, unknown>)
      : {}

  const metaKey = session === 'morning' ? 'morningMeta' : 'eveningMeta'

  return base[metaKey] &&
    typeof base[metaKey] === 'object' &&
    !Array.isArray(base[metaKey])
    ? (base[metaKey] as Record<string, unknown>)
    : {}
}

export function getContentRecord(content: unknown): Record<string, unknown> {
  return content &&
    typeof content === 'object' &&
    !Array.isArray(content)
    ? (content as Record<string, unknown>)
    : {}
}

export function getAnswerRecord(
  content: Record<string, unknown>,
  key: 'morning' | 'evening',
) {
  const value = content[key]

  return value &&
    typeof value === 'object' &&
    !Array.isArray(value)
    ? (value as Record<string, string>)
    : {}
}

export function getDayBounds(date: Date) {
  const dayStart = new Date(date)

  dayStart.setHours(0, 0, 0, 0)

  const dayEnd = new Date(dayStart)

  dayEnd.setHours(23, 59, 59, 999)

  const nextDayEnd = new Date(dayStart)

  nextDayEnd.setDate(nextDayEnd.getDate() + 1)

  nextDayEnd.setHours(23, 59, 0, 0)

  return { dayEnd, nextDayEnd }
}