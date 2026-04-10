import { ArrowDown, ArrowUp, Copy, PencilLine, Trash2 } from 'lucide-react'

import { FUNNEL_CHANNEL_META, FUNNEL_SCREEN_TYPE_META, type FunnelScreen } from '@/features/funnels/types/funnel.types'
import { Badge } from '@/ui'

export function FunnelScreenCard({
  screen,
  selected,
  canEdit,
  canReorder,
  canDuplicateDelete,
  onSelect,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  screen: FunnelScreen
  selected: boolean
  canEdit: boolean
  canReorder: boolean
  canDuplicateDelete: boolean
  onSelect: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}) {
  const meta = FUNNEL_SCREEN_TYPE_META[screen.type]
  const channels: FunnelScreen['channels'] = screen.channels.length ? screen.channels : ['telegram']

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={[
        'rounded-[24px] border bg-[var(--card)] px-4 py-4 text-left transition-colors outline-none',
        selected
          ? 'border-[rgba(var(--accent-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.06)] shadow-[0_0_0_1px_rgba(var(--accent-rgb),0.12)]'
          : 'border-[var(--border)] hover:border-[rgba(var(--accent-rgb),0.18)] hover:bg-[var(--bg-secondary)]',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 text-[11px] font-semibold text-[var(--text-primary)]">
              {screen.order}
            </span>
            <Badge variant="info" size="sm">
              {meta.label}
            </Badge>
          </div>

          <div className="mt-3 flex items-start gap-3">
            <span
              className={[
                'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                selected ? 'bg-[rgb(var(--accent-rgb))]' : 'bg-[var(--text-muted)]',
              ].join(' ')}
            />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-6 text-[var(--text-primary)]">{screen.title}</p>
              <p className="mt-1 line-clamp-2 text-[11.5px] leading-6 text-[var(--text-muted)]">
                {screen.bodyText}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canEdit ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect()
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)]"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Edit
              </button>
              {canDuplicateDelete ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDuplicate()
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Dup
                </button>
              ) : null}
              {canReorder ? (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMoveUp()
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)]"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMoveDown()
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)]"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : null}
              {canDuplicateDelete ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete()
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)] hover:text-[var(--text-primary)]"
                  aria-label="Delete screen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <div className="flex flex-wrap gap-2">
          {channels.map((channel) => (
            <span
              key={channel}
              className={[
                'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
                channel === 'telegram'
                  ? 'border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.06)] text-[var(--text-primary)]'
                  : channel === 'miniapp'
                    ? 'border-[rgba(129,140,248,0.22)] bg-[rgba(129,140,248,0.08)] text-[var(--text-primary)]'
                    : 'border-[rgba(92,214,148,0.22)] bg-[rgba(92,214,148,0.08)] text-[var(--text-primary)]',
              ].join(' ')}
            >
              {FUNNEL_CHANNEL_META[channel]}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {canReorder ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onMoveUp()
                }}
                disabled={!canEdit}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ↑ Move
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onMoveDown()
                }}
                disabled={!canEdit}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ↓ Move
              </button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function ScreenConnector() {
  return (
    <div className="flex justify-center py-2">
      <div className="relative h-10 w-px bg-[var(--border)] after:absolute after:bottom-0 after:left-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:rotate-45 after:border-b after:border-r after:border-[var(--border)] after:bg-[var(--bg-secondary)]" />
    </div>
  )
}

export function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1 rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="text-lg font-semibold text-[var(--text-primary)]">{value}%</p>
    </div>
  )
}
