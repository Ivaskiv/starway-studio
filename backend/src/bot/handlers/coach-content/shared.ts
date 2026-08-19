import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { coachBotContent } from '../../content/coachBot.content.js'
import { coachContent } from '../../content/coachContent.content.js'

export type CoachAccess = {
  id: string
  role: 'EXPERT' | 'SUPERADMIN'
  expertId: string | null
}

export const coachPanelContent = coachBotContent

const KYIV_TZ = 'Europe/Kyiv'
const COACH_RUNTIME_ERROR_MESSAGE = coachBotContent.runtime.error
const REQUIRED_PANEL_SECTIONS = ['start', 'menu', 'schedule', 'nextWeek', 'analytics', 'stats', 'audio', 'users', 'notify', 'payments'] as const
const REQUIRED_PLANNER_SECTIONS = ['planner', 'buttons', 'note', 'mode', 'topics', 'prompts'] as const

let coachContentCatalogValidated = false

function readCoachTelegramAccessId(): string {
  return String(
    process.env.COACH_TELEGRAM_ID
    ?? process.env.TEST_COACH_MENTOR_TELEGRAM_ID
    ?? '',
  ).trim()
}

export function maskTelegramToken(token: string | null | undefined): string | null {
  const normalized = String(token ?? '').trim()
  if (!normalized) return null
  if (normalized.length <= 8) return normalized
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`
}

export function validateCoachContentCatalog(): void {
  if (coachContentCatalogValidated) return
  coachContentCatalogValidated = true

  const missingPanelSections = REQUIRED_PANEL_SECTIONS.filter((key) => !(key in coachBotContent))
  const missingPlannerSections = REQUIRED_PLANNER_SECTIONS.filter((key) => !(key in coachContent))

  if (missingPanelSections.length === 0 && missingPlannerSections.length === 0) return

  console.error('[coach-panel] startup validation failed', {
    missingPanelSections,
    missingPlannerSections,
  })
}

export function getCommandPayload(ctx: Context): string {
  const match = Array.isArray((ctx as { match?: unknown[] }).match)
    ? (ctx as { match?: unknown[] }).match
    : null
  if (!match) return ''
  return typeof match[1] === 'string' ? match[1].trim() : ''
}

export function formatKyivDateTime(value: Date | string): string {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TZ,
  })
}

export function safeText(value: string | null | undefined, fallback = '—'): string {
  const text = String(value ?? '').trim()
  return text || fallback
}

export function formatMoney(value: number): string {
  return `€${value.toFixed(2)}`
}

function startOfWeekMonday(now = new Date()): Date {
  const kyivNow = new Date(now.toLocaleString('en-US', { timeZone: KYIV_TZ }))
  const date = new Date(kyivNow)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfWeekSunday(weekStart: Date): Date {
  const date = new Date(weekStart)
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

export function startOfMonth(value: string): { from: Date; to: Date; label: string } | null {
  const normalized = value.trim()
  if (!/^\d{4}-\d{2}$/.test(normalized)) return null

  const [yearValue, monthValue] = normalized.split('-')
  const year = Number(yearValue)
  const monthIndex = Number(monthValue) - 1
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null
  }

  return {
    from: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)),
    label: normalized,
  }
}

function resolvePublicApiBaseUrl(): string {
  const candidates = [
    process.env.PUBLIC_API_URL?.trim(),
    process.env.TELEGRAM_WEBHOOK_URL?.trim(),
    process.env.INTERNAL_API_URL?.trim(),
    'http://localhost:3001',
  ].filter((value): value is string => Boolean(value))

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate)
      if (url.pathname === '/api') {
        url.pathname = '/'
      }
      return url.toString().replace(/\/$/, '')
    } catch {
      continue
    }
  }

  return 'http://localhost:3001'
}

export function buildAudioStreamUrl(audioId: string, download = false): string {
  const base = resolvePublicApiBaseUrl()
  const url = new URL(`/api/audio/stream/${encodeURIComponent(audioId)}`, `${base}/`)
  if (download) {
    url.searchParams.set('download', '1')
  }
  return url.toString()
}

export function splitPayload(payload: string): string[] {
  return payload.trim().split(/\s+/u).filter(Boolean)
}

export async function replyOrEditPanelMessage(
  ctx: Context,
  text: string,
): Promise<void> {
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text).catch(() => undefined)
      return
    } catch (error) {
      console.error('[coach-panel:edit-fallback] failed', error)
    }
  }

  await ctx.reply(text).catch(() => undefined)
}

export async function reportCoachRuntimeError(ctx: Context, scope: string, error: unknown): Promise<void> {
  console.error(`[coach-panel:${scope}] failed`, error)

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery(COACH_RUNTIME_ERROR_MESSAGE).catch(() => undefined)
  }

  await ctx.reply(COACH_RUNTIME_ERROR_MESSAGE).catch(() => undefined)
}

export function withCoachRuntimeProtection<T extends Context>(
  scope: string,
  handler: (ctx: T) => Promise<unknown>,
) {
  return async (ctx: T): Promise<void> => {
    try {
      await handler(ctx)
    } catch (error) {
      await reportCoachRuntimeError(ctx, scope, error)
    }
  }
}

export function formatUserRow(user: {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  telegramUserId: string | null
  telegramChatId: string | null
  telegramUserName: string | null
  role: string
  focusPaid: boolean
  expertId: string | null
  createdAt: Date
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Без імені'
  const telegram = user.telegramUserId ?? user.telegramChatId ?? user.telegramUserName ?? '—'

  return [
    `• ${name}`,
    `  id: ${user.id}`,
    `  email: ${user.email}`,
    `  tg: ${telegram}`,
    `  role: ${user.role}`,
    `  expert: ${user.expertId ?? '—'}`,
    `  focus: ${user.focusPaid ? 'yes' : 'no'}`,
    `  created: ${formatKyivDateTime(user.createdAt)}`,
  ].join('\n')
}

export function resolveCoachExpertScopeId(coach: CoachAccess): string {
  return coach.expertId ?? coach.id
}

export function formatMonthLabel(month: string): string {
  const [yearValue, monthValue] = month.split('-')
  const year = Number(yearValue)
  const monthIndex = Number(monthValue) - 1
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return month
  }

  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('uk-UA', {
    month: 'long',
    year: 'numeric',
    timeZone: KYIV_TZ,
  })
}

export function resolveZoomTypeLabel(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'INDIVIDUAL' || normalized === 'PRIVATE') return 'INDIVIDUAL'
  return 'GROUP'
}

export function clipText(value: string | null | undefined, limit = 1400): string {
  const normalized = String(value ?? '').trim()
  if (!normalized) return '—'
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1)}…`
}

export async function resolveCoachAccess(ctx: Context): Promise<CoachAccess | null> {
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : ''
  if (!telegramUserId) return null

  const privilegedTelegramId = readCoachTelegramAccessId()
  const coach = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramUserId },
        { telegramChatId: telegramUserId },
      ],
    },
    select: { id: true, role: true, expertId: true },
  })

  if (!coach && privilegedTelegramId === telegramUserId) {
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
      select: { id: true, role: true, expertId: true },
    })

    if (!fallbackCoach) return null
    if (fallbackCoach.role !== 'EXPERT' && fallbackCoach.role !== 'SUPERADMIN') return null
    return {
      id: fallbackCoach.id,
      role: fallbackCoach.role,
      expertId: fallbackCoach.expertId ?? null,
    }
  }

  if (!coach) return null
  if (coach.role !== 'EXPERT' && coach.role !== 'SUPERADMIN') return null
  return {
    id: coach.id,
    role: coach.role,
    expertId: coach.expertId ?? null,
  }
}

async function resolveCoachUserId(ctx: Context): Promise<string | null> {
  return (await resolveCoachAccess(ctx))?.id ?? null
}

export function buildExpertScopeWhere(coach: CoachAccess) {
  return coach.role === 'EXPERT'
    ? { expertId: coach.expertId ?? coach.id }
    : {}
}
