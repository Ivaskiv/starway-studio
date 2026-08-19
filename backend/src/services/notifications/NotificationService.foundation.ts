import { NotificationChannel, type Prisma, type Notification, NotificationStatus, NotificationType, type NotificationJob, type User, } from '@starway/db/prisma-client'
import { NotificationEvent } from './NotificationEvent.js'
import { buildTelegramDeepLink, generateDeepLink } from '../../modules/deeplinks/service.js'
import { TelegramConversationRenderer } from '../../modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.js'

export type EventPayload = Record<string, unknown>
export type DojimSeriesScheduleResult = {
  jobsCount: number
}

export let conversationRendererInstance: TelegramConversationRenderer | null = null

export function getConversationRenderer(): TelegramConversationRenderer {
  if (conversationRendererInstance) {
    return conversationRendererInstance
  }

  conversationRendererInstance = new TelegramConversationRenderer()
  return conversationRendererInstance
}

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function toJsonObject(value: unknown): Prisma.JsonObject {
  return isJsonObject(value) ? value as Prisma.JsonObject : {}
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export type PersistedJobPayload = {
  event: NotificationEvent
  userId: string
  payload?: Prisma.JsonObject
}

export type WeeklySummaryPayload = {
  streak: number
  wheels: number
  sessions: number
}

export const DAILY_LIMIT = 2
export const STREAK_MILESTONE_REWARDS: Record<number, { neuroGems: number; bitMind?: number }> = {
  3: { neuroGems: 10 },
  7: { neuroGems: 30 },
  14: { neuroGems: 60 },
  30: { neuroGems: 100, bitMind: 1 },
  100: { neuroGems: 300, bitMind: 3 },
}

export const LOCAL_FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
export const TELEGRAM_SAFE_FRONTEND_URL = (() => {
  const configured = process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim()
    || process.env.PUBLIC_FRONTEND_URL?.trim()
    || process.env.FRONTEND_URL?.trim()
    || ''

  try {
    const url = new URL(configured)
    if (url.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
      return url.toString().replace(/\/$/, '')
    }
  } catch {
  }

  return LOCAL_FRONTEND_URL.replace(/\/$/, '')
})()
export const DEFAULT_MINIAPP_URL = (
  process.env.MINIAPP_URL?.trim()
  || `${TELEGRAM_SAFE_FRONTEND_URL}/miniapp`
).replace(/\/$/, '')

export function minutesToDate(minutesFromMidnight: number, baseDate = new Date()) {
  const date = new Date(baseDate)
  date.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0)
  return date
}

export function nextMorningNine(baseDate = new Date()) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return date
}

export function startOfDay(date = new Date()) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function endOfDay(date = new Date()) {
  const next = startOfDay(date)
  next.setDate(next.getDate() + 1)
  return next
}

export function buildMiniAppStartUrl(startapp: string) {
  const url = new URL(DEFAULT_MINIAPP_URL)
  url.searchParams.set('startapp', startapp)
  return url.toString()
}

export function buildTelegramSafeWebDeepLink(token: string, path?: string | null) {
  const url = new URL(path ?? '/onboarding/continue', TELEGRAM_SAFE_FRONTEND_URL)
  url.searchParams.set('dl', token)
  return url.toString()
}

export async function buildWebFlowUrl(input: {
  userId: string
  path: string
  payload?: EventPayload
}) {
  try {
    const link = await generateDeepLink({
      userId: input.userId,
      action: 'continue_flow',
      source: 'telegram',
      target: 'web',
      path: input.path,
      payload: input.payload as Prisma.InputJsonValue | undefined,
    })
    return buildTelegramSafeWebDeepLink(link.token, input.path)
  } catch {
    return `${TELEGRAM_SAFE_FRONTEND_URL}${input.path}`
  }
}

export function buildMentorTelegramActions(input: {
  miniAppUrl: string
  webUrl: string
  telegramCallback: string
}) {
  return [
    {
      text: 'Перейти в мініап',
      url: input.miniAppUrl,
      mode: 'web_app' as const,
    },
    {
      text: 'Перейти для відповідей на сайт',
      url: input.webUrl,
      mode: 'url' as const,
    },
    {
      text: 'Продовжити відповідати в Telegram',
      url: input.telegramCallback,
      mode: 'callback' as const,
    },
  ]
}

export function toPersistedJobPayload(payload: unknown): PersistedJobPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('notification_job_payload_invalid')
  }

  const record = payload as Record<string, unknown>
  const event = record.event
  const userId = record.userId

  if (typeof event !== 'string' || typeof userId !== 'string') {
    throw new Error('notification_job_payload_invalid')
  }

  return {
    event: event as NotificationEvent,
    userId,
    payload: typeof record.payload === 'object' && record.payload !== null && !Array.isArray(record.payload)
      ? record.payload as Prisma.JsonObject
      : undefined,
  }
}

export function buildWeeklySummaryPayload(payload?: EventPayload): WeeklySummaryPayload {
  return {
    streak: Number(payload?.streak ?? 0),
    wheels: Number(payload?.wheels ?? 0),
    sessions: Number(payload?.sessions ?? 0),
  }
}
