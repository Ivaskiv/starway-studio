import { getWheelCategoryById, getWheelScoreTone } from '@/features/wheel/constants/wheelContent'
import type { SphereState } from '@/features/wheel/hooks/useWheelFlowState'

import { ScoreSlider } from './ScoreSlider'

interface WheelInputListProps {
  spheres: SphereState[]
  activeIndex: number
  onSelect: (index: number) => void
  onScoreChange: (index: number, value: number) => void
  onNoteChange: (index: number, value: string) => void
}

export const WheelInputList = ({
  spheres,
  activeIndex,
  onSelect,
  onScoreChange,
  onNoteChange,
}: WheelInputListProps) => (
  <section className="space-y-3">
    {spheres.map((sphere, index) => {
      const category = getWheelCategoryById(sphere.categoryId)
      const score = sphere.score ?? 0
      const tone = getWheelScoreTone(score)
      const active = index === activeIndex

      return (
        <button
          key={sphere.categoryId}
          type="button"
          onClick={() => onSelect(index)}
          className={[
            'glass-card w-full rounded-[24px] border p-4 text-left transition-all duration-200',
            active
              ? 'border-[var(--border-accent)] bg-[rgba(var(--accent-rgb),0.08)]'
              : 'border-[var(--border-primary)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(var(--accent-rgb),0.24)]',
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{category?.nameUk ?? sphere.categoryId}</div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">{category?.description ?? 'Оціни сферу чесно'}</div>
            </div>
            <div className="rounded-full border border-[var(--border-primary)] px-2.5 py-1 text-sm font-semibold text-[var(--text-primary)]">
              {score}
            </div>
          </div>

          <div className="mt-3">
            <ScoreSlider value={score} onChange={(value) => onScoreChange(index, value)} tone={tone} testId={`wheel-slider-${sphere.categoryId}`} />
          </div>

          <textarea
            value={sphere.note}
            onChange={(event) => onNoteChange(index, event.target.value)}
            onClick={(event) => event.stopPropagation()}
            rows={2}
            placeholder="Чому така оцінка?"
            className="mt-3 w-full resize-none rounded-[18px] border border-[var(--border-primary)] bg-white/[0.02] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus:border-[rgba(var(--accent-rgb),0.34)]"
          />
        </button>
      )
    })}
  </section>
)

export default WheelInputList
