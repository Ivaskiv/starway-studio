// backend/src/services/scheduler/common.ts — shared helpers for scheduler jobs.
// Інструкція: тут спільні утиліти, перевірки доступності та Telegram-хелпери для cron-задач.

import { resolveTelegramWebappBaseUrl } from '@/config/webapp.js'
import { prisma, withRetry } from '../../db/client.js'
import { getUserAccess } from '../../modules/access/service.js'
import { sendDedupedTelegramMessage } from '../../lib/telegram.js'
import { notificationService } from '../notifications/NotificationService.js'

export type SchedulerNotifier = {
  schedule: (...args: Parameters<typeof notificationService.schedule>) => Promise<unknown>
}

let notificationPreferenceTableAvailable: boolean | undefined
let hasWarnedAboutMissingNotificationPreferenceTable = false

export function getMinutesInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date)
  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find(part => part.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

export function getWeekdayInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).formatToParts(date)
  return parts.find(part => part.type === 'weekday')?.value ?? ''
}

export function isWithinScheduledMinute(now: Date, timezone: string, targetMinutes: number, toleranceMinutes = 1) {
  return Math.abs(getMinutesInTimezone(now, timezone) - targetMinutes) <= toleranceMinutes
}

export function getStartOfUtcDay(date = new Date()) {
  const next = new Date(date)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

export function getEndOfUtcDay(date = new Date()) {
  const next = getStartOfUtcDay(date)
  next.setUTCHours(23, 59, 59, 999)
  return next
}

export function getStartOfUtcDate(date: Date) {
  const next = new Date(date)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

export function getActivityGapDays(lastActivityAt: Date, now = new Date()) {
  const diff = getStartOfUtcDate(now).getTime() - getStartOfUtcDate(lastActivityAt).getTime()
  return diff > 0 ? Math.floor(diff / 86_400_000) : 0
}

export function getUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
}

export function resolvePrimaryProductKey(productAccesses: Array<{ product: string }> | undefined): 'STANKEY' | 'FOCUS' | 'ABsystem' | null {
  const product = productAccesses?.[0]?.product
  if (product === 'stankey') return 'STANKEY'
  if (product === 'focus') return 'FOCUS'
  if (product === 'absystem') return 'ABsystem'
  return null
}

export function readSettingsText(settings: unknown, key: string): string | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const value = Reflect.get(settings as Record<string, unknown>, key)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function getSettingsObject(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return { ...(raw as Record<string, unknown>) }
}

export function readTimestamp(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const date = new Date(raw)
  return Number.isFinite(date.getTime()) ? date : null
}

export async function getTelegramChatId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true, telegramLinks: { where: { isActive: true, chatId: { not: null } }, orderBy: { createdAt: 'desc' }, take: 1, select: { chatId: true } } },
  })
  return user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
}

export async function sendUpgradeOfferTelegramMessage(userId: string, text: string, ctaText: string, url: string): Promise<boolean> {
  const chatId = await getTelegramChatId(userId)
  if (!chatId) return false
  await sendDedupedTelegramMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: ctaText, url }]] },
  })
  return true
}

export async function sendAiSellerTelegramMessage(userId: string, text: string, buttons?: Array<Array<{ text: string; callback_data: string }>>): Promise<boolean> {
  const chatId = await getTelegramChatId(userId)
  if (!chatId) return false
  await sendDedupedTelegramMessage(chatId, text, {
    parse_mode: 'HTML',
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  })
  return true
}

export async function hasMentorNotificationAccess(userId: string): Promise<boolean> {
  const [access, user] = await Promise.all([
    getUserAccess(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ])
  if (user?.email?.startsWith('telegram-guest-')) return false
  return Boolean(access.abilities['mentor.daily'] === true || access.abilities['mentor.core'] === true)
}

export async function ensureNotificationPreferenceTableAvailability(): Promise<boolean> {
  if (typeof notificationPreferenceTableAvailable !== 'undefined') return notificationPreferenceTableAvailable
  const rows = await withRetry(() => prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'NotificationPreference'
    ) AS "exists"
  `)
  notificationPreferenceTableAvailable = rows[0]?.exists === true
  if (!notificationPreferenceTableAvailable) {
    if (!hasWarnedAboutMissingNotificationPreferenceTable) {
      hasWarnedAboutMissingNotificationPreferenceTable = true
      console.warn('[scheduler] NotificationPreference table missing; notification schedulers are disabled until migration is applied')
    }
    return false
  }
  return notificationPreferenceTableAvailable
}

export function resolvePublicFrontendBaseUrl() {
  return resolveTelegramWebappBaseUrl()
}
