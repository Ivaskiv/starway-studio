import WheelHistorySection from '@/features/wheel/components/sections/WheelHistorySection'
import WheelReportsSection from '@/features/wheel/components/sections/WheelReportsSection'
import type { WheelAssessment, WheelCategory, WheelSphereId } from '@/features/wheel/types/wheel.types'

type Props = {
  userId: string
  items: WheelAssessment[]
  categoryMap: Map<WheelSphereId, WheelCategory>
  onDownloadPdf: (wheelId: string, createdAt: string) => void
}

export default function WheelHistoryReportsSection({
  userId,
  items,
  categoryMap,
  onDownloadPdf,
}: Props) {
  const hasReports = items.length > 0

  return (
    <section className="card-surface liquid-glass min-h-0 rounded-2xl p-5">
      <div className="flex flex-col gap-6">
        <div>
          <WheelHistorySection userId={userId} />
        </div>

        {hasReports ? (
          <div className="border-t border-white/10 pt-4">
            <WheelReportsSection
              items={items}
              categoryMap={categoryMap}
              onDownloadPdf={onDownloadPdf}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
