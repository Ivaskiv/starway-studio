// backend/src/modules/telegram-mentor/session.ts

import type { Prisma } from '../../db/generated/prisma/index.js'
import { prisma } from '../../db/client.js'
import type { SessionState, SessionData, QuestionSet, Question } from './types.js'
import { DEFAULT_QUESTION_SET } from './types.js'
import { ensureMentor } from '../ai-mentor/helpers.js'

// ── Активний набір питань ──────────────────────────────────────
// Кешується в пам'яті між викликами (оновлюється кожні 5 хв)
let _cachedQuestionSet: QuestionSet | null = null
let _cacheAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

export async function getActiveQuestionSet(): Promise<QuestionSet> {
  const now = Date.now()
  if (_cachedQuestionSet && now - _cacheAt < CACHE_TTL_MS) {
    return _cachedQuestionSet
  }

  // Читаємо активний набір з БД (модель MentorQuestionSet)
  const row = await prisma.mentorQuestionSet.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  }).catch(() => null) // якщо таблиці ще немає — fallback

  if (!row) {
    // Fallback: дефолтний набір з types.ts
    return {
      ...DEFAULT_QUESTION_SET,
      id:        'default',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  _cachedQuestionSet = {
    id:        row.id,
    name:      row.name,
    isActive:  row.isActive,
    morning:   row.morning as unknown as Question[],
    evening:   row.evening as unknown as Question[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
  _cacheAt = now
  return _cachedQuestionSet
}

// Інвалідація кешу — викликати після збереження нового набору в адмін-панелі
export function invalidateQuestionSetCache(): void {
  _cachedQuestionSet = null
  _cacheAt = 0
}

// ── Helpers для кроків питань ──────────────────────────────────

// Повертає state для поточного питання: 'morning_q1', 'morning_q2', ...
export function questionState(
  type: 'morning' | 'evening',
  index: number,   // 0-based
): SessionState {
  return `${type}_q${index + 1}` as SessionState
}

// Розпаковує state назад: 'morning_q2' → { type: 'morning', index: 1 }
export function parseQuestionState(
  state: SessionState,
): { type: 'morning' | 'evening'; index: number } | null {
  const m = String(state).match(/^(morning|evening)_q(\d+)$/)
  if (!m) return null
  return { type: m[1] as 'morning' | 'evening', index: Number(m[2]) - 1 }
}

// Чи є ще наступне питання у наборі?
export async function hasNextQuestion(
  type: 'morning' | 'evening',
  currentIndex: number,  // 0-based
): Promise<boolean> {
  const qs = await getActiveQuestionSet()
  return currentIndex + 1 < qs[type].length
}

// Текст питання за типом і індексом
export async function getQuestion(
  type: 'morning' | 'evening',
  index: number,  // 0-based
): Promise<Question | null> {
  const qs = await getActiveQuestionSet()
  return qs[type][index] ?? null
}

// ── CRUD сесії ─────────────────────────────────────────────────

export async function getSession(chatId: string) {
  const link = await prisma.telegramLink.findFirst({ where: { chatId } })
  if (!link) return null

  const session = await prisma.aIMentorSession.findUnique({
    where: { userId: link.userId },
  })

  return {
    userId: link.userId,
    chatId,
    state:  (session?.state ?? 'idle') as SessionState,
    step:   session?.step ?? 0,
    data:   (session?.data ?? {}) as SessionData,
  }
}

export async function updateSession(
  userId: string,
  chatId: string,
  state: SessionState,
  data: SessionData = {},
  step = 0,
) {
  const jsonData = data as unknown as Prisma.InputJsonValue

  const userMentor = await ensureMentor(userId)

  await prisma.aIMentorSession.upsert({
    where:  { userId },
    create: { userId, chatId, state, step, data: jsonData, userMentorId: userMentor.id },
    update: { state, step, data: jsonData, userMentorId: userMentor.id },
  })
}

export async function clearSession(userId: string, chatId: string) {
  await updateSession(userId, chatId, 'idle', {}, 0)
}

export async function getUserIdByChatId(chatId: string): Promise<string | null> {
  const link = await prisma.telegramLink.findFirst({ where: { chatId } })
  return link?.userId ?? null
}
