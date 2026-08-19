import { ensureUserExpertId } from '../ai-mentor/helpers.js'
import { prisma } from '../../db/client.js'
import { getDailyEntryForDate, getJournalDayAnchor, getOrCreateTodayEntry } from './index.js'

type SessionKind = 'morning' | 'evening'

function extractRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function extractAnswers(content: unknown, session: SessionKind): Record<string, string> {
  const base = extractRecord(content)
  const answers = extractRecord(base[session])
  return Object.fromEntries(
    Object.entries(answers).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

function extractMeta(content: unknown, session: SessionKind): Record<string, unknown> {
  const base = extractRecord(content)
  return extractRecord(base[session === 'morning' ? 'morningMeta' : 'eveningMeta'])
}

export async function getSharedSessionState(userId: string, session: SessionKind, dateInput?: string) {
  const date = dateInput ? getJournalDayAnchor(dateInput) : getJournalDayAnchor(new Date())
  const entry = dateInput
    ? await getDailyEntryForDate(userId, date.toISOString())
    : await getOrCreateTodayEntry(userId, await ensureUserExpertId(userId))

  if (!entry) {
    const fallback = await prisma.dailyEntry.findUnique({
      where: { userId_date: { userId, date } },
    })
    if (!fallback) {
      throw new Error('daily_session_not_found')
    }
    return buildSessionState(fallback, session)
  }

  return buildSessionState(entry, session)
}

function buildSessionState(
  entry: { id: string; date: Date; content: unknown },
  session: SessionKind,
) {
  const answers = extractAnswers(entry.content, session)
  const meta = extractMeta(entry.content, session)
  const lastQuestionIndex = typeof meta.lastQuestionIndex === 'number'
    ? meta.lastQuestionIndex
    : Math.max(0, Object.keys(answers).length)

  return {
    entryId: entry.id,
    date: entry.date.toISOString(),
    answers,
    lastQuestionIndex,
    completedAt: typeof meta.completedAt === 'string' ? meta.completedAt : null,
    activeChannel: typeof meta.activeChannel === 'string' ? meta.activeChannel : null,
  }
}
