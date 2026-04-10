import { useEffect, useState } from 'react'

import { BaseModal } from '@/features/modals/BaseModal'
import {
  NOTIFICATION_CHANNEL_OPTIONS,
  NOTIFICATION_ROLE_OPTIONS,
  NOTIFICATION_TYPE_META,
  type Notification,
} from '@/features/notifications/config/notificationPreviewFlows'
import { Badge, Button, Checkbox, Input, Select, Textarea } from '@/ui'

const TYPE_OPTIONS = [
  'reflection',
  'microtask',
  'streak',
  'subscription',
  'report',
  'reactivation',
  'ai',
].map((value) => ({
  value,
  label: NOTIFICATION_TYPE_META[value as Notification['type']].label,
}))

export function NotificationEditorModal({
  item,
  onClose,
  onSave,
  canEditTimeBodyOnly,
  canManageAll,
}: {
  item: Notification | null
  onClose: () => void
  onSave: (next: Notification) => void
  canEditTimeBodyOnly: boolean
  canManageAll: boolean
}) {
  const [draft, setDraft] = useState<Notification | null>(item)
  const [durationValue, setDurationValue] = useState(item?.durationDays ? String(item.durationDays) : '')

  useEffect(() => {
    setDraft(item)
    setDurationValue(item?.durationDays ? String(item.durationDays) : '')
  }, [item?.id, item])

  if (!draft) return null

  const toggleRole = (role: Notification['roles'][number]) => {
    setDraft((current) => {
      if (!current) return current
      const roles = current.roles.includes(role)
        ? current.roles.filter((value) => value !== role)
        : [...current.roles, role]
      return { ...current, roles }
    })
  }

  const toggleChannel = (channel: Notification['channels'][number]) => {
    setDraft((current) => {
      if (!current) return current
      const channels = current.channels.includes(channel)
        ? current.channels.filter((value) => value !== channel)
        : [...current.channels, channel]
      return { ...current, channels }
    })
  }

  return (
    <BaseModal
      isOpen={Boolean(item)}
      onClose={onClose}
      panelClassName="w-full max-w-3xl rounded-[28px] border border-[var(--border)] bg-[var(--bg-secondary)] p-0 shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
    >
      <div className="dashboard-liquid-edge--top border-b border-[var(--border)] px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
          Редагування нагадування
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[1.45rem] font-semibold text-[var(--text-primary)]">{draft.name}</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Зміни зберігаються локально у стані сторінки, без нового маршруту чи окремого редактора.
            </p>
          </div>
          <Badge variant={draft.active ? 'success' : 'info'} size="sm">
            {draft.active ? 'Активне' : 'Чернетка'}
          </Badge>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Назва"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <Select
            label="Тип"
            value={draft.type}
            onChange={(event) => setDraft({ ...draft, type: event.target.value as Notification['type'] })}
            options={TYPE_OPTIONS}
            disabled={!canManageAll}
          />
          <Input
            label="Час"
            value={draft.time}
            onChange={(event) => setDraft({ ...draft, time: event.target.value })}
            placeholder="08:00"
            disabled={!canEditTimeBodyOnly && !canManageAll}
          />
          <Input
            label="linkedPromptId"
            value={draft.linkedPromptId ?? ''}
            onChange={(event) =>
              setDraft({
                ...draft,
                linkedPromptId: event.target.value.trim() ? event.target.value.trim() : undefined,
              })
            }
            placeholder="morning_session"
            disabled={!canManageAll}
          />
        </div>

        <Textarea
          label="Умова"
          value={draft.condition}
          onChange={(event) => setDraft({ ...draft, condition: event.target.value })}
          rows={3}
          disabled={!canManageAll}
        />
        <Textarea
          label="Текст повідомлення"
          value={draft.bodyText}
          onChange={(event) => setDraft({ ...draft, bodyText: event.target.value })}
          rows={4}
          disabled={!canEditTimeBodyOnly && !canManageAll}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="durationDays"
            value={durationValue}
            onChange={(event) => {
              const nextValue = event.target.value
              setDurationValue(nextValue)
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      durationDays: nextValue.trim() ? Number(nextValue) : undefined,
                    }
                  : current,
              )
            }}
            placeholder="1"
            disabled={!canManageAll}
          />
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Стан
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Checkbox
                label="Активне"
                checked={draft.active}
                onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                disabled={!canManageAll}
              />
              <Checkbox
                label="Repeat on miss"
                checked={draft.repeatOnMiss ?? false}
                onChange={(event) => setDraft({ ...draft, repeatOnMiss: event.target.checked })}
                disabled={!canManageAll}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Ролі
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {NOTIFICATION_ROLE_OPTIONS.filter((option): option is typeof option & { id: Notification['roles'][number] } => option.id !== 'all').map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleRole(option.id)}
                  disabled={!canManageAll}
                  className={[
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    draft.roles.includes(option.id)
                      ? 'border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.08)] text-[var(--text-primary)]'
                      : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)]',
                    !canManageAll ? 'cursor-not-allowed opacity-60' : '',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Канали
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {NOTIFICATION_CHANNEL_OPTIONS.filter((option): option is typeof option & { id: Notification['channels'][number] } => option.id !== 'all').map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleChannel(option.id)}
                  disabled={!canManageAll}
                  className={[
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    draft.channels.includes(option.id)
                      ? 'border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.08)] text-[var(--text-primary)]'
                      : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)]',
                    !canManageAll ? 'cursor-not-allowed opacity-60' : '',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="glass" color="muted" onClick={onClose}>
            Скасувати
          </Button>
          <Button
            type="button"
            variant="solid"
            color="accent"
            onClick={() => {
              onSave(draft)
              onClose()
            }}
            disabled={!canEditTimeBodyOnly && !canManageAll}
          >
            Зберегти
          </Button>
        </div>
      </div>
    </BaseModal>
  )
}
