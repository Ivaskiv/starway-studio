import AIBlock from '@/features/wheel/components/AIBlock'
import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'
import type { WheelInsights } from '@/features/wheel/utils/wheel.utils'
import { Suspense } from 'react'

type Props = {
  isPending: boolean
  insights: WheelInsights | null
  onOpenPlan: () => void
  ctaLabel: string
}

export default function WheelAnalysisSection({
  isPending,
  insights,
  onOpenPlan,
  ctaLabel,
}: Props) {
  return (
    <div {...(isPending ? { 'aria-busy': 'true' } : {})}>
      <Suspense
        fallback={
          <section className="card-surface rounded-2xl p-4 text-sm text-[var(--text-secondary)]">
            {WHEEL_TEXTS.analysis.loading}
          </section>
        }
      >
        <AIBlock
          insights={insights}
          onOpenPlan={onOpenPlan}
          ctaLabel={ctaLabel}
        />
      </Suspense>
    </div>
  )
}
