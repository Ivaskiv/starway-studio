import {
  NOTIFICATION_ROLE_META,
  type Notification,
} from '@/features/notifications/config/notificationPreviewFlows'

export type NotificationRoleFilter = 'all' | Notification['roles'][number]
export type NotificationChannelFilter = 'all' | Notification['channels'][number]

export function createNotificationCopy(notification: Notification): Notification {
  const suffix = Math.random().toString(36).slice(2, 7)
  return {
    ...notification,
    id: `${notification.id}-copy-${suffix}`,
    name: `${notification.name} (копія)`,
    active: false,
  }
}

export function formatTime(value: string) {
  return value
}

export function getSeverityLabel(notification: Notification) {
  if (notification.active) return 'Активне'
  return 'Чернетка'
}

export function getRoleLabel(role: Notification['roles'][number]) {
  return NOTIFICATION_ROLE_META[role]
}
