import type { MiniAppTrackerItem } from '@/features/social/types/miniapp'

interface MiniAppTrackerSectionProps {
  currentDay: number
  trackerData: MiniAppTrackerItem[]
}

export default function MiniAppTrackerSection({
  currentDay,
  trackerData,
}: MiniAppTrackerSectionProps) {
  return (
    <div className="space-y-4 px-4 pt-6">
      <div className="text-center">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
          ТРЕКЕР ЮВЕЛІРА
        </p>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Кожен день — крок до мрії</h2>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-[var(--accent)]">
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--accent)]">{currentDay}</p>
            <p className="text-[10px] text-[var(--text-muted)]">з 100</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {trackerData.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
          >
            <span className="w-28 flex-shrink-0 text-sm text-[var(--text-primary)]">{item.label}</span>
            <progress
              className="miniapp-progressbar flex-1"
              value={item.value}
              max={100}
              aria-label={`${item.label} ${item.value} відсотків`}
            />
            <span className="w-8 text-right text-xs text-[var(--text-muted)]">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
