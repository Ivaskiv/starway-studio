import type { Role } from '@starway/db/prisma-client'

import { NotificationEvent } from '../NotificationEvent.js'

type NotificationRole = Role | 'TRIAL'

const USER_NOTIFICATION_EVENTS = new Set<NotificationEvent>([
  NotificationEvent.DAILY_MORNING_DUE,
  NotificationEvent.DAILY_EVENING_DUE,
  NotificationEvent.STREAK_RISK,
  NotificationEvent.STREAK_MILESTONE,
  NotificationEvent.STREAK_BROKEN,
  NotificationEvent.LEVEL_UP,
  NotificationEvent.NEAR_LEVEL_UP,
  NotificationEvent.WEEKLY_SUMMARY,
  NotificationEvent.AI_INACTIVE,
  NotificationEvent.SUBSCRIPTION_EXPIRING,
  NotificationEvent.SUBSCRIPTION_EXPIRED,
  NotificationEvent.POST_TRIAL_REPORTS,
])

export function isNotificationRoleAllowed(event: NotificationEvent, role: string | null | undefined): boolean {
  const normalizedRole = String(role ?? '').toUpperCase() as NotificationRole

  if (!USER_NOTIFICATION_EVENTS.has(event)) {
    return true
  }

  return normalizedRole === 'USER' || normalizedRole === 'TRIAL'
}
