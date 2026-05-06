import { getWheelScoreTone } from '@/features/wheel/constants/wheelContent'
import type { WheelSphereId } from '@/features/wheel/types/wheel.types'

import { ScoreSlider } from './ScoreSlider'

interface SphereSliderProps {
  sphereName: string
  sphereDescription?: string
  question: string
  score: number | null
  note: string
  onScoreChange: (value: number) => void
  onNoteChange: (value: string) => void
  sphereId: WheelSphereId
  step: number
}

const valueToneClassMap = {
  critical: 'text-[rgb(226,75,74)]',
  warning: 'text-[rgb(239,159,39)]',
  good: 'text-[rgb(29,158,117)]',
} as const

export const SphereSlider = ({
  sphereName,
  sphereDescription,
  question,
  score,
  note,
  onScoreChange,
  onNoteChange,
  sphereId,
  step,
}: SphereSliderProps) => {
  const value = score ?? 0
  const tone = getWheelScoreTone(value)

  return (
    <div
      className="glass-card rounded-[28px] border border-[var(--border-primary)] bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(14,18,26,0.98))] p-5"
      data-testid={`wheel-question-${step}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
            Сфера {step} з 8
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{sphereName}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {sphereDescription ?? 'Оціни стан цієї сфери від 1 до 10'}
          </p>
        </div>
        <div className={`shrink-0 text-4xl font-semibold ${valueToneClassMap[tone]}`}>{value}</div>
      </div>

      <p className="mt-5 text-lg italic leading-8 text-[var(--text-primary)]">{question}</p>

      <div className="mt-5">
        <ScoreSlider
          value={value}
          onChange={onScoreChange}
          tone={tone}
          testId={`wheel-slider-${sphereId}`}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>Спочатку обери оцінку</span>
        <span>Все чудово</span>
      </div>

      <textarea
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        rows={3}
        placeholder="Чому така оцінка?"
        className="mt-4 w-full resize-none rounded-[18px] border border-[var(--border-primary)] bg-white/[0.02] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus:border-[rgba(var(--accent-rgb),0.34)]"
      />
    </div>
  )
}
