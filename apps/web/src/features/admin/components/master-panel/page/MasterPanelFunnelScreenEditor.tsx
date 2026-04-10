import toast from 'react-hot-toast'

import { MASTER_PANEL_ITEMS } from '@/features/admin/components/master-panel/MasterPanelSidebar'
import type { FunnelScreen, FunnelScreenType } from '@/features/funnels/types/funnel.types'
import {
  FUNNEL_CHANNEL_OPTIONS,
  FUNNEL_SCREEN_TYPE_OPTIONS,
} from '@/features/funnels/types/funnel.types'
import type { Notification } from '@/features/notifications/config/notificationPreviewFlows'
import { Badge, Input, Select, Textarea } from '@/ui'

export function MasterPanelFunnelScreenEditor({
  screen,
  canEditFunnels,
  canManageFunnels,
  canEditFunnelTextOnly,
  promptOptions,
  connectedNotifications,
  onUpdateScreen,
  onUpdateMetric,
  onOpenNotification,
}: {
  screen: FunnelScreen
  canEditFunnels: boolean
  canManageFunnels: boolean
  canEditFunnelTextOnly: boolean
  promptOptions: Array<{ value: string; label: string }>
  connectedNotifications: Notification[]
  onUpdateScreen: (screenId: string, patch: Partial<FunnelScreen>) => void
  onUpdateMetric: (screenId: string, metric: keyof NonNullable<FunnelScreen['metrics']>, value: number) => void
  onOpenNotification: (notification: Notification) => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[rgb(var(--accent-soft-rgb))]">
          Редактор екрана
        </p>
        <div className="mt-4 grid gap-4">
          <Input
            label="Заголовок"
            value={screen.title}
            onChange={(event) => onUpdateScreen(screen.id, { title: event.target.value })}
            disabled={!canManageFunnels}
          />
          <Textarea
            label="Підзаголовок / текст"
            value={screen.bodyText}
            onChange={(event) => onUpdateScreen(screen.id, { bodyText: event.target.value })}
            rows={4}
            disabled={!canEditFunnels}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <Input
              label="CTA"
              value={screen.ctaLabel}
              onChange={(event) => onUpdateScreen(screen.id, { ctaLabel: event.target.value })}
              disabled={!canEditFunnels}
            />
            <Input
              label="Secondary CTA"
              value={screen.ctaSecondaryLabel ?? ''}
              onChange={(event) =>
                onUpdateScreen(screen.id, {
                  ctaSecondaryLabel: event.target.value.trim() ? event.target.value : undefined,
                })
              }
              placeholder="Пізніше"
              disabled={!canEditFunnels}
            />
          </div>
          <Select
            label="Тип екрану"
            value={screen.type}
            onChange={(event) => onUpdateScreen(screen.id, { type: event.target.value as FunnelScreenType })}
            disabled={!canManageFunnels}
            options={FUNNEL_SCREEN_TYPE_OPTIONS}
          />
          <Select
            label="AI-промпт"
            value={screen.aiPromptId ?? ''}
            onChange={(event) =>
              onUpdateScreen(screen.id, {
                aiPromptId: event.target.value.trim() ? event.target.value : undefined,
              })
            }
            disabled={!canManageFunnels}
            options={[{ value: '', label: 'Без промпта' }, ...promptOptions]}
          />
        </div>

        <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Канали
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FUNNEL_CHANNEL_OPTIONS.map((channel) => {
              const active = screen.channels.includes(channel.value)
              return (
                <button
                  key={channel.value}
                  type="button"
                  disabled={!canManageFunnels}
                  onClick={() =>
                    onUpdateScreen(screen.id, {
                      channels: active
                        ? screen.channels.filter((value) => value !== channel.value)
                        : [...screen.channels, channel.value],
                    })
                  }
                  className={[
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    active
                      ? 'border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.08)] text-[var(--text-primary)]'
                      : 'border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)]',
                    !canManageFunnels ? 'cursor-not-allowed opacity-60' : '',
                  ].join(' ')}
                >
                  {channel.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['opened', 'passedCta', 'trialStart', 'converted'] as const).map((metric) => (
            <Input
              key={metric}
              label={
                metric === 'opened'
                  ? 'Відкрили'
                  : metric === 'passedCta'
                    ? 'Пройшли CTA'
                    : metric === 'trialStart'
                      ? 'Trial старт'
                      : 'Конверсія'
              }
              type="number"
              min={0}
              value={String(screen.metrics?.[metric] ?? 0)}
              onChange={(event) => onUpdateMetric(screen.id, metric, Number(event.target.value))}
              disabled={!canManageFunnels}
            />
          ))}
        </div>

        {canEditFunnelTextOnly ? (
          <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">
            У режимі `EXPERT` можна редагувати лише текст екрана та CTA. Порядок, тип, канали, AI-промпт і метрики доступні тільки `SUPERADMIN`.
          </p>
        ) : null}
      </div>

      {screen.type === 'activation' ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[rgb(var(--accent-soft-rgb))]">
            Підключені нагадування
          </p>
          <div className="mt-3 space-y-2">
            {connectedNotifications.length ? (
              connectedNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    const notificationItem = MASTER_PANEL_ITEMS.find(
                      (item) => item.kind === 'notification' && item.notificationIds?.includes(notification.id),
                    )
                    if (!notificationItem) {
                      toast.error('Не вдалося знайти пов’язане нагадування')
                      return
                    }
                    onOpenNotification(notification)
                  }}
                  className="flex w-full items-center justify-between rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-left transition-colors hover:border-[rgba(var(--accent-rgb),0.22)]"
                >
                  <span className="text-sm font-medium text-[var(--text-primary)]">{notification.name}</span>
                  <Badge variant="info" size="sm">
                    {notification.time}
                  </Badge>
                </button>
              ))
            ) : (
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4 text-sm text-[var(--text-muted)]">
                Поки що activation-екран не підключений до нагадувань.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
