import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'
import type { WheelAssessment, WheelCategory, WheelSphereId } from '@/features/wheel/types/wheel.types'
import { isWheelSphereId } from '@/features/wheel/types/wheel.types'

type Props = {
  items: WheelAssessment[]
  categoryMap: Map<WheelSphereId, WheelCategory>
  onDownloadPdf: (wheelId: string, createdAt: string) => void
}

export default function WheelReportsSection({
  items,
  categoryMap,
  onDownloadPdf,
}: Props) {
  if (!items.length) return null

  return (
    <section className="flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {WHEEL_TEXTS.reports.section}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            {WHEEL_TEXTS.reports.title}
          </h2>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">
                {WHEEL_TEXTS.reports.itemTitle(new Date(item.createdAt).toLocaleDateString('uk-UA'))}
              </p>
              <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                {WHEEL_TEXTS.reports.averageAndWeakest(
                  item.averageScore.toFixed(1),
                  isWheelSphereId(item.gaps?.[0]) ? categoryMap.get(item.gaps[0])?.nameUk ?? '—' : '—'
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => window.open(`/api/wheel/${item.id}/view`, '_blank')}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 transition-colors hover:text-white"
              >
                {WHEEL_TEXTS.reports.view}
              </button>
              <button
                type="button"
                onClick={() => onDownloadPdf(item.id, item.createdAt)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 transition-colors hover:text-white"
              >
                {WHEEL_TEXTS.reports.pdf}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
