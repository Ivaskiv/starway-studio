import { Copy, PencilLine, Trash2 } from 'lucide-react'

import {
  NOTIFICATION_CHANNEL_META,
  NOTIFICATION_TYPE_META,
  type Notification,
} from '@/features/notifications/config/notificationPreviewFlows'
import { Badge } from '@/ui'

import { formatTime, getRoleLabel, getSeverityLabel } from './notificationTab.utils'

export function NotificationCard({
  notification,
  selected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  canEdit,
  canManageAll,
}: {
  notification: Notification
  selected: boolean
  onSelect: (id: string) => void
  onEdit: (notification: Notification) => void
  onDuplicate: (notification: Notification) => void
  onDelete: (id: string) => void
  canEdit: boolean
  canManageAll: boolean
}) {
  const meta = NOTIFICATION_TYPE_META[notification.type]

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(notification.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(notification.id)
        }
      }}
      className={[
        'rounded-[24px] border bg-[var(--card)] px-4 py-4 text-left transition-colors outline-none',
        selected
          ? 'border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.06)] shadow-[0_0_0_1px_rgba(var(--accent-rgb),0.12)]'
          : 'border-[var(--border)] hover:border-[rgba(var(--accent-rgb),0.18)] hover:bg-[var(--bg-secondary)]',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] text-base">
              {meta.icon}
            </span>
            <Badge variant="info" size="sm">
              {meta.label}
            </Badge>
            <Badge variant={notification.active ? 'success' : 'info'} size="sm">
              {getSeverityLabel(notification)}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{notification.name}</p>
            <span className="text-[11px] text-[var(--text-muted)]">·</span>
            <p className="text-[11.5px] text-[var(--text-muted)]">{notification.condition}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="info" size="sm">
            {formatTime(notification.time)}
          </Badge>
          {notification.channels.map((channel) => (
            <span
              key={channel}
              className={[
                'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                channel === 'telegram'
                  ? 'border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.06)] text-[var(--text-primary)]'
                  : channel === 'app'
                    ? 'border-[rgba(92,214,148,0.22)] bg-[rgba(92,214,148,0.08)] text-[var(--text-primary)]'
                    : 'border-[rgba(129,140,248,0.22)] bg-[rgba(129,140,248,0.08)] text-[var(--text-primary)]',
              ].join(' ')}
            >
              {NOTIFICATION_CHANNEL_META[channel]}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {notification.roles.map((role) => (
              <span
                key={role}
                className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]"
              >
                {getRoleLabel(role)}
              </span>
            ))}
          </div>

          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(notification)
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)]"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Edit
              </button>
              {canManageAll ? (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDuplicate(notification)
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(notification.id)
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)] hover:text-[var(--text-primary)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
