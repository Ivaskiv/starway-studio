import { Bell, Check, ExternalLink } from 'lucide-react'

import { Button, GlassCard } from '@/ui'

import type { NotificationsCardProps } from '../types/notification.types'

function formatChannel(channel?: 'TELEGRAM' | 'IN_APP' | 'EMAIL') {
  if (channel === 'TELEGRAM') return 'Telegram'
  if (channel === 'EMAIL') return 'Email'
  return 'У додатку'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsCard({
  notifications,
  markRead,
}: NotificationsCardProps) {
  if (!notifications.length) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[rgb(var(--accent-soft-rgb))]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Повідомлення</h3>
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
          Тут з’являться нагадування й системні сигнали, які синхронізуються між сайтом і Telegram.
        </p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-[rgb(var(--accent-soft-rgb))]" />
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Повідомлення</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Нагадування і сигнали з єдиним контекстом для сайту, mini app і Telegram.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {notifications.map((notification) => {
          const ctaUrl = notification.data?.ctaUrl
          const ctaText = notification.data?.ctaText

          return (
            <div
              key={notification.id}
              className="rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      {formatChannel(notification.channel)}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>

                  <p className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                    {notification.title}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {notification.body}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {ctaUrl ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        window.open(ctaUrl, '_blank', 'noopener,noreferrer')
                        if (!notification.readAt) {
                          void markRead(notification.id)
                        }
                      }}
                      leftIcon={ExternalLink}
                    >
                      {ctaText || 'Відкрити'}
                    </Button>
                  ) : null}

                  {!notification.readAt ? (
                    <Button size="sm" onClick={() => void markRead(notification.id)} leftIcon={Check}>
                      Прочитано
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
