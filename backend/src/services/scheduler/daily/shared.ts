// backend/src/services/scheduler/daily.jobs.ts — daily mentor/streak notification jobs.
// Інструкція: тут щоденні нагадування, streak-логіка, weekly summary та inactive AI checks.


import { prisma } from '../../../db/client.js'
import { generateCoachAgentsWebDeepLink } from '../../../modules/deeplinks/service.js'

export function startOfWeekMonday(date = new Date()): Date {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function endOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function formatDateTimeShort(date: Date): string {
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function getCoachChatId(): string | null {
  const chatId = process.env.STARWAY_OPS_CHAT_ID?.trim() || process.env.OPS_TELEGRAM_CHAT_ID?.trim() || ''
  return chatId || null
}

function readCoachTelegramAccessId(): string {
  return String(
    process.env.COACH_TELEGRAM_ID
    ?? process.env.TEST_COACH_MENTOR_TELEGRAM_ID
    ?? '',
  ).trim()
}

async function resolveScheduledCoachUserId(): Promise<string | null> {
  const telegramUserId = readCoachTelegramAccessId()

  if (telegramUserId) {
    const coach = await prisma.user.findFirst({
      where: {
        OR: [
          { telegramUserId },
          { telegramChatId: telegramUserId },
        ],
      },
      select: { id: true },
    })

    if (coach?.id) {
      return coach.id
    }
  }

  const fallbackCoach = await prisma.user.findFirst({
    where: {
      OR: [
        { role: 'SUPERADMIN' },
        { role: 'EXPERT' },
      ],
    },
    orderBy: [
      { role: 'desc' },
      { createdAt: 'asc' },
    ],
    select: { id: true },
  })

  return fallbackCoach?.id ?? null
}

export async function resolveCoachAgentsUrl(): Promise<string> {
  const coachUserId = await resolveScheduledCoachUserId()
  if (!coachUserId) {
    throw new Error('COACH_USER_NOT_RESOLVED_FOR_SCHEDULED_AGENTS_LINK')
  }

  return generateCoachAgentsWebDeepLink(coachUserId)
}

function getKyivNow(now = new Date()): Date {
  return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }))
}

function startOfKyivDay(now = new Date()): Date {
  const date = getKyivNow(now)
  date.setHours(0, 0, 0, 0)
  return date
}

export function endOfKyivDay(now = new Date()): Date {
  const date = startOfKyivDay(now)
  date.setDate(date.getDate() + 1)
  date.setMilliseconds(date.getMilliseconds() - 1)
  return date
}

export function startOfKyivWeek(now = new Date()): Date {
  const date = getKyivNow(now)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function endOfKyivWeek(now = new Date()): Date {
  const date = startOfKyivWeek(now)
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

export function startOfKyivMonth(now = new Date()): Date {
  const date = getKyivNow(now)
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

export function endOfKyivMonth(now = new Date()): Date {
  const date = getKyivNow(now)
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function isLastSaturdayOfMonth(now = new Date()): boolean {
  const date = getKyivNow(now)
  if (date.getDay() !== 6) return false
  const nextSaturday = new Date(date)
  nextSaturday.setDate(nextSaturday.getDate() + 7)
  return nextSaturday.getMonth() !== date.getMonth()
}

export function formatKyivDate(date: Date): string {
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Kyiv',
  })
}

export function formatKyivDateTime(date: Date): string {
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  })
}

function formatPercent(part: number, total: number): string {
  if (total <= 0) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

export function formatMoney(valueCents: number, currency: string): string {
  const amount = (valueCents / 100).toFixed(currency === 'UAH' ? 0 : 2)
  return `${amount} ${currency}`
}

export function safeRate(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}
