import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  type Notification,
} from '@starway/db/prisma-client'

import { NotificationEvent } from '../NotificationEvent.js'
import type { DeliveryMessage } from '../delivery/types.js'

type EventPayload = Record<string, unknown>

const CRITICAL_TEMPLATE_PREFIXES = [
  'level_up_',
  'streak_broken',
  'subscription_expired_',
  'subscription',
  'post_trial_reports_',
] as const

function startOfDay(date = new Date()) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function buildNotificationData(
  event: NotificationEvent,
  payload: EventPayload | undefined,
  message: DeliveryMessage,
): EventPayload {
  return {
    event,
    ...(payload ?? {}),
    ctaText: message.ctaText ?? null,
    ctaUrl: message.ctaUrl ?? null,
    ctaMode: message.ctaMode ?? null,
  }
}

export function resolveNotificationType(event: NotificationEvent): NotificationType {
  switch (event) {
    case NotificationEvent.DAILY_MORNING_DUE:
      return NotificationType.DAILY_MORNING
    case NotificationEvent.DAILY_EVENING_DUE:
      return NotificationType.DAILY_EVENING
    case NotificationEvent.STREAK_RISK:
    case NotificationEvent.STREAK_MILESTONE:
    case NotificationEvent.STREAK_BROKEN:
      return NotificationType.STREAK_ALERT
    case NotificationEvent.LEVEL_UP:
    case NotificationEvent.NEAR_LEVEL_UP:
      return NotificationType.LEVEL_UP
    case NotificationEvent.WEEKLY_SUMMARY:
      return NotificationType.WEEKLY_SUMMARY
    case NotificationEvent.AI_INACTIVE:
      return NotificationType.AI_REMINDER
    case NotificationEvent.SUBSCRIPTION_EXPIRING:
    case NotificationEvent.SUBSCRIPTION_EXPIRED:
      return NotificationType.SUBSCRIPTION
    case NotificationEvent.POST_TRIAL_REPORTS:
      return NotificationType.WEEKLY_SUMMARY
  }
}

export function resolveNotificationTemplateKey(event: NotificationEvent, payload?: EventPayload) {
  switch (event) {
    case NotificationEvent.LEVEL_UP:
      return `level_up_${Number(payload?.level ?? 0)}`
    case NotificationEvent.NEAR_LEVEL_UP:
      return `near_level_${String(payload?.nextLevel ?? 'unknown')}`
    case NotificationEvent.STREAK_MILESTONE:
      return `streak_${Number(payload?.current ?? 0)}`
    case NotificationEvent.STREAK_BROKEN:
      return 'streak_broken'
    case NotificationEvent.STREAK_RISK:
      return 'streak_risk'
    case NotificationEvent.WEEKLY_SUMMARY:
      return 'weekly_summary'
    case NotificationEvent.SUBSCRIPTION_EXPIRED:
      return `subscription_expired_${Number(payload?.daysSinceExpired ?? 0)}`
    case NotificationEvent.POST_TRIAL_REPORTS:
      return `post_trial_reports_${Number(payload?.daysSinceExpired ?? 0)}`
    default:
      return resolveNotificationType(event)
  }
}

export function isCriticalNotificationTemplate(templateKey: string) {
  return CRITICAL_TEMPLATE_PREFIXES.some(prefix => templateKey.startsWith(prefix))
}

export function getNotificationDuplicateWindowStart(event: NotificationEvent, now = new Date()) {
  if (event === NotificationEvent.WEEKLY_SUMMARY) {
    return new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
  }
  return startOfDay(now)
}

export function toNotificationReadModel(notification: Notification) {
  const payload =
    notification.data && typeof notification.data === 'object' && !Array.isArray(notification.data)
      ? notification.data as Record<string, unknown>
      : null

  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type ?? NotificationType.AI_REMINDER,
    title: notification.title ?? '',
    body: notification.body ?? '',
    data: payload,
    channel: notification.channel ?? NotificationChannel.IN_APP,
    status: notification.status ?? NotificationStatus.PENDING,
    templateKey: notification.templateKey ?? null,
    readAt: notification.readAt?.toISOString() ?? null,
    sentAt: notification.sentAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  }
}

function resolveNotificationPayload(notification: Notification): Record<string, unknown> | null {
  if (notification.data && typeof notification.data === 'object' && !Array.isArray(notification.data)) {
    return notification.data as Record<string, unknown>
  }

  return null
}

function resolveFeedDateKey(notification: Notification) {
  const payload = resolveNotificationPayload(notification)
  const rawValue = typeof payload?.date === 'string' ? payload.date : notification.createdAt.toISOString()
  const date = new Date(rawValue)
  if (Number.isNaN(date.getTime())) {
    return notification.createdAt.toISOString().slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function resolveFeedKey(notification: Notification) {
  const templateKey = notification.templateKey ?? ''
  const payload = resolveNotificationPayload(notification)
  const event = typeof payload?.event === 'string' ? payload.event : ''
  const dateKey = resolveFeedDateKey(notification)

  if (
    templateKey.startsWith('session_handoff_morning_') ||
    notification.type === NotificationType.DAILY_MORNING ||
    event === NotificationEvent.DAILY_MORNING_DUE
  ) {
    return `daily_morning:${dateKey}`
  }

  if (
    templateKey.startsWith('session_handoff_evening_') ||
    notification.type === NotificationType.DAILY_EVENING ||
    event === NotificationEvent.DAILY_EVENING_DUE
  ) {
    return `daily_evening:${dateKey}`
  }

  if (event === NotificationEvent.AI_INACTIVE) {
    return `mentor_nudge:${dateKey}`
  }

  if (templateKey) {
    return `template:${templateKey}`
  }

  return `fallback:${notification.type}:${notification.title}:${notification.body}:${dateKey}`
}

export function dedupeNotificationFeed(notifications: Notification[]): Notification[] {
  const seen = new Set<string>()
  const deduped: Notification[] = []

  for (const notification of notifications) {
    const key = resolveFeedKey(notification)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(notification)
  }

  return deduped
}
