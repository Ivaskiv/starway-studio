import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import {
  MASTER_NOTIFICATION_SEED_COUNT,
  MASTER_NOTIFICATIONS,
  NOTIFICATION_CHANNEL_OPTIONS,
  NOTIFICATION_ROLE_OPTIONS,
  type Notification,
} from '@/features/notifications/config/notificationPreviewFlows'
import { Badge, GlassCard, InfoHint } from '@/ui'
import type { Dispatch, SetStateAction } from 'react'
import { NotificationCard } from '@/features/admin/components/master-panel/notifications/NotificationCard'
import { NotificationEditorModal } from '@/features/admin/components/master-panel/notifications/NotificationEditorModal'
import {
  createNotificationCopy,
  type NotificationChannelFilter,
  type NotificationRoleFilter,
} from '@/features/admin/components/master-panel/notifications/notificationTab.utils'

const ROLE_FILTER_OPTIONS = NOTIFICATION_ROLE_OPTIONS
const CHANNEL_FILTER_OPTIONS = NOTIFICATION_CHANNEL_OPTIONS

export default function MasterPanelNotificationTab({
  notifications,
  selectedNotificationId,
  canEdit,
  canManageAll,
  onSelectNotification,
  onChangeNotifications,
}: {
  notifications: Notification[]
  selectedNotificationId: string
  canEdit: boolean
  canManageAll: boolean
  onSelectNotification: (id: string) => void
  onChangeNotifications: Dispatch<SetStateAction<Notification[]>>
}) {
  const [roleFilter, setRoleFilter] = useState<NotificationRoleFilter>('all')
  const [channelFilter, setChannelFilter] = useState<NotificationChannelFilter>('all')
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null)

  const visibleNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const roleOk =
        roleFilter === 'all' ? true : notification.roles.includes(roleFilter)
      const channelOk =
        channelFilter === 'all' ? true : notification.channels.includes(channelFilter)
      return roleOk && channelOk
    })
  }, [channelFilter, notifications, roleFilter])

  useEffect(() => {
    if (!visibleNotifications.length) return
    if (visibleNotifications.some((notification) => notification.id === selectedNotificationId)) return
    onSelectNotification(visibleNotifications[0].id)
  }, [onSelectNotification, selectedNotificationId, visibleNotifications])

  useEffect(() => {
    if (!notifications.length) {
      onChangeNotifications(MASTER_NOTIFICATIONS.length ? MASTER_NOTIFICATIONS : [])
      toast('Шаблони нагадувань підвантажені з seed-набору')
    }
  }, [notifications.length, onChangeNotifications])

  const selectedNotification =
    notifications.find((notification) => notification.id === selectedNotificationId) ??
    visibleNotifications[0] ??
    notifications[0] ??
    MASTER_NOTIFICATIONS[0] ??
    null

  const handleEdit = (notification: Notification) => {
    if (!canEdit) return
    setEditingNotification(notification)
  }

  const handleDuplicate = (notification: Notification) => {
    if (!canEdit) return
    const duplicate = createNotificationCopy(notification)
    onChangeNotifications((current) => [duplicate, ...current])
    onSelectNotification(duplicate.id)
    toast.success('Нагадування продубльовано')
  }

  const handleDelete = (notificationId: string) => {
    if (!canEdit) return
    onChangeNotifications((current) => current.filter((item) => item.id !== notificationId))
    toast.success('Нагадування видалено')
  }

  const handleSave = (next: Notification) => {
    onChangeNotifications((current) => current.map((item) => (item.id === next.id ? next : item)))
    setEditingNotification(null)
    onSelectNotification(next.id)
    toast.success('Нагадування збережено')
  }

  return (
    <GlassCard variant="bordered" className="overflow-hidden">
      <div className="dashboard-liquid-edge--top p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
                Нагадування
              </p>
              <InfoHint
                label="Нагадування"
                description="Це реєстр шаблонів нагадувань. Тут редагуємо умови, канали, ролі й тональність без окремої сторінки."
                instruction="Фільтруй за роллю і каналом, далі редагуй або дублюй потрібний шаблон."
              />
            </div>
            <h2 className="mt-2 text-[1.6rem] font-semibold leading-tight text-[var(--text-primary)]">
              {selectedNotification?.name ?? 'Обери нагадування в sidebar'}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
              Один список для Telegram, App і Mini-app. Sidebar вибирає групу, а тут керуємо конкретними шаблонами.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="info" size="sm">
              Усього {notifications.length}
            </Badge>
            <Badge variant="success" size="sm">
              Активних {notifications.filter((item) => item.active).length}
            </Badge>
            <Badge variant="info" size="sm">
              Seed {MASTER_NOTIFICATION_SEED_COUNT}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">
              Фільтри
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Вибирай роль і канал, щоб швидко знайти потрібний шаблон.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ROLE_FILTER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setRoleFilter(option.id)}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  roleFilter === option.id
                    ? 'border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.08)] text-[var(--text-primary)]'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
            <span className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" />
            {CHANNEL_FILTER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setChannelFilter(option.id)}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  channelFilter === option.id
                    ? 'border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.08)] text-[var(--text-primary)]'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {visibleNotifications.length ? (
          <div className="space-y-3">
            {visibleNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                selected={notification.id === selectedNotificationId}
                onSelect={onSelectNotification}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                canEdit={canEdit}
                canManageAll={canManageAll}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm text-[var(--text-muted)]">
            За цими фільтрами нічого немає. Спробуй іншу роль або канал.
          </div>
        )}
      </div>

      <NotificationEditorModal
        item={editingNotification}
        onClose={() => setEditingNotification(null)}
        onSave={handleSave}
        canEditTimeBodyOnly={canEdit}
        canManageAll={canManageAll}
      />
    </GlassCard>
  )
}
