import { openGlobalAssistant } from '@/features/assistant/lib/assistantBridge'
import type { PreviewQueueItem, QueueItemWithSource } from '../types/contentStudio.types'

const STATUS_STYLES = {
  draft: 'border-white/10 bg-white/5 text-white/65',
  approved: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  published: 'border-sky-400/25 bg-sky-500/10 text-sky-300',
} as const

export function QueueItemCard({
  item,
  index,
  previewOnly = false,
  onPrimaryAction,
}: {
  item: QueueItemWithSource | PreviewQueueItem
  index: number
  previewOnly?: boolean
  onPrimaryAction?: (item: QueueItemWithSource) => void
}) {
  const primaryEnabled = !previewOnly && 'sourceItem' in item
  const isApproved = item.status === 'approved'
  const isPublished = item.status === 'published'

  return (
    <div className="rounded-[20px] border border-[rgba(var(--accent-rgb),0.12)] bg-[linear-gradient(180deg,rgba(12,16,28,0.94),rgba(7,10,18,0.98))] px-4 py-4 shadow-[0_14px_32px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.08)] text-sm text-[rgb(var(--accent-soft-rgb))]">
            {index === 0 ? '1' : index === 1 ? '2' : '3'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-6 text-[var(--text-primary)]">{item.title}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{item.formatLabel}</p>
            <div className="mt-2">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[item.status]}`}>
                {isPublished ? 'Опубліковано' : isApproved ? 'Підтверджено' : item.status === 'draft' && index === 1 ? 'Генерується' : 'Чернетка'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 md:w-[176px] md:flex-col">
          <button
            type="button"
            onClick={() => primaryEnabled && onPrimaryAction?.(item as QueueItemWithSource)}
            disabled={!primaryEnabled}
            className={[
              'rounded-[14px] px-3 py-2 text-sm font-semibold text-white transition-transform disabled:opacity-50',
              isApproved
                ? 'bg-[linear-gradient(180deg,rgba(38,208,124,0.96),rgba(28,169,100,0.92))] shadow-[0_10px_24px_rgba(38,208,124,0.18)]'
                : 'bg-[linear-gradient(180deg,rgba(105,112,255,0.98),rgba(79,89,232,0.94))] shadow-[0_10px_24px_rgba(105,112,255,0.16)]',
            ].join(' ')}
          >
            {isApproved ? 'Публікувати' : 'Запустити'}
          </button>
          <button
            type="button"
            onClick={() => openGlobalAssistant({ mode: 'product_assistant' })}
            className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)] hover:text-[var(--text-primary)]"
          >
            Редагувати
          </button>
          <button
            type="button"
            disabled={!primaryEnabled || item.status === 'draft'}
            className="rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition-colors disabled:opacity-50"
          >
            Пропустити
          </button>
        </div>
      </div>
    </div>
  )
}
