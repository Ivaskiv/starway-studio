import type { PreviewQueueItem, QueueItemWithSource } from '../types/contentStudio.types'
import { REELS_ENGINE_NODES } from '../config/contentStudio.config'
import { QueueItemCard } from './QueueItemCard'

export function ContentStudioReelsTab({
  sectionTitleClass,
  queueItems,
  fallbackItems,
  completedNodeCount,
  onPrimaryAction,
}: {
  sectionTitleClass: string
  queueItems: QueueItemWithSource[]
  fallbackItems: PreviewQueueItem[]
  completedNodeCount: number
  onPrimaryAction: (item: QueueItemWithSource) => void
}) {
  const visibleItems = queueItems.length > 0 ? queueItems : fallbackItems
  const previewOnly = queueItems.length === 0
  const completionPercent = Math.round((Math.max(0, Math.min(REELS_ENGINE_NODES.length, completedNodeCount)) / REELS_ENGINE_NODES.length) * 100)
  const activeNodeIndex = Math.max(0, Math.min(REELS_ENGINE_NODES.length - 1, completedNodeCount - 1))

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] border border-[rgba(var(--accent-rgb),0.14)] bg-[linear-gradient(180deg,rgba(13,18,32,0.94),rgba(8,12,20,0.98))] px-4 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.26)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={sectionTitleClass}>Reels Engine</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)]">Стан → контент → продаж</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              Кожен вузол підсилює попередній: контекст, СТА, hook, research, формула, API, тексти, банери і фінальний запуск Reels.
            </p>
          </div>
          <div className="min-w-[220px] rounded-[18px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.06)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Progress</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{completionPercent}%</p>
            <div className="mt-3 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(var(--accent-rgb),0.95),rgba(94,234,212,0.9))]" style={{ width: `${completionPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Активний вузол: {REELS_ENGINE_NODES[activeNodeIndex] ?? 'Reels Engine'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-9">
          {REELS_ENGINE_NODES.map((label, index) => {
            const stepNumber = index + 1
            const isDone = stepNumber < completedNodeCount
            const isActive = stepNumber === completedNodeCount
            return (
              <div
                key={label}
                className={[
                  'flex min-h-[112px] flex-col items-center justify-center rounded-[18px] border px-3 py-3 text-center transition-all',
                  isDone
                    ? 'border-[rgba(94,234,212,0.28)] bg-[rgba(94,234,212,0.08)] shadow-[0_10px_24px_rgba(0,0,0,0.16)]'
                    : isActive
                      ? 'border-[rgba(var(--accent-rgb),0.42)] bg-[rgba(var(--accent-rgb),0.12)] shadow-[0_14px_30px_rgba(44,72,180,0.16)]'
                      : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)]',
                ].join(' ')}
              >
                <span className={['inline-flex h-10 w-10 items-center justify-center rounded-full border text-[14px] font-semibold', isDone ? 'border-[rgba(94,234,212,0.28)] bg-[rgba(94,234,212,0.1)] text-[rgb(94,234,212)]' : isActive ? 'border-[rgba(var(--accent-rgb),0.42)] bg-[rgba(var(--accent-rgb),0.12)] text-[rgb(var(--accent-soft-rgb))]' : 'border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]'].join(' ')}>
                  {isDone ? '✓' : stepNumber}
                </span>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)]">{label}</p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {isDone ? 'done' : isActive ? 'active' : `step ${stepNumber}`}
                </p>
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Коли всі вузли зелені, система готова до публікації й запуску через Reels queue.
        </p>
      </div>

      <div className="rounded-[26px] border border-[rgba(var(--accent-rgb),0.14)] bg-[linear-gradient(180deg,rgba(12,16,28,0.92),rgba(8,11,19,0.98))] px-4 py-5 shadow-[0_16px_42px_rgba(0,0,0,0.22)]">
        <p className={sectionTitleClass}>Черга Reels (reels_queue)</p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Тут видно, який ролик уже готовий, який у черзі, і що саме треба зробити далі.
        </p>
        <div className="mt-4 space-y-3">
          {visibleItems.map((item, index) => (
            <QueueItemCard key={item.id} item={item} index={index} previewOnly={previewOnly} onPrimaryAction={onPrimaryAction} />
          ))}
        </div>
      </div>

      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">DB schema · reels_queue</p>
        <pre className="mt-3 overflow-x-auto rounded-[14px] bg-[rgba(7,10,18,0.88)] px-4 py-3 text-xs leading-6 text-[var(--text-secondary)]">{`model ReelsQueue {\n  id        String\n  text      String\n  imageUrl  String?\n  voiceUrl  String?\n  finalUrl  String?\n  status    String\n}`}</pre>
      </div>
    </div>
  )
}
