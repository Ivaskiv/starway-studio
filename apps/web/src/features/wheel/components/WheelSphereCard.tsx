import React, { type MutableRefObject } from 'react'
import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'
import Hint from '@/features/wheel/components/Hint'
import { WheelCategory, WheelSphere } from '@/features/wheel/types/wheel.types'
import { Textarea } from '@/ui'

const SPHERE_UI_MAP: Record<
  WheelSphere['id'],
  { dot: string; accent: string }
> = {
  finance: { dot: 'bg-[#F59E0B]', accent: 'accent-[#F59E0B]' },
  career: { dot: 'bg-[#3B82F6]', accent: 'accent-[#3B82F6]' },
  relationships: { dot: 'bg-[#EF4444]', accent: 'accent-[#EF4444]' },
  energy: { dot: 'bg-[#8B5CF6]', accent: 'accent-[#8B5CF6]' },
  freedom: { dot: 'bg-[#EC4899]', accent: 'accent-[#EC4899]' },
  mind: { dot: 'bg-[#A855F7]', accent: 'accent-[#A855F7]' },
  health: { dot: 'bg-[#022D4A]', accent: 'accent-[#022D4A]' },
  selfDevelopment: { dot: 'bg-[#14B8A6]', accent: 'accent-[#14B8A6]' },
}

type Props = {
  sphere: WheelSphere
  category?: WheelCategory
  isWeak: boolean
  isStrong: boolean
  isGap: boolean
  onScoreChange: (id: WheelSphere['id'], value: number) => void
  onActionChange: (sphereId: WheelSphere['id'], index: number, value: string) => void
  onAddAction: (sphereId: WheelSphere['id']) => void
  onRemoveAction: (sphereId: WheelSphere['id'], index: number) => void
  actionInputRefs: MutableRefObject<Record<string, HTMLTextAreaElement | null>>
}

function WheelSphereCard({
  sphere: s,
  category,
  isWeak,
  isStrong,
  isGap,
  onScoreChange,
  onActionChange,
  onAddAction,
  onRemoveAction,
  actionInputRefs,
}: Props) {
  const actions = Array.from({ length: 3 }, (_, i) => s.actions?.[i] ?? { text: '' })

  const borderColor =
    isWeak
      ? 'border-red-500/30'
      : isStrong
      ? 'border-emerald-500/20'
      : isGap
      ? 'border-amber-500/20'
      : 'border-white/[0.06]'

  const scoreColor =
    s.score <= 3
      ? 'text-red-400'
      : s.score <= 5
      ? 'text-amber-400'
      : s.score >= 8
      ? 'text-emerald-400'
      : 'text-[var(--text-primary)]'

  const ui = SPHERE_UI_MAP[s.id]

  return (
    <div className={`card-surface rounded-xl border ${borderColor} p-3 space-y-3 transition-all hover:border-white/10`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${ui.dot}`} />
        <span className="flex-1 text-sm font-medium truncate">{s.name}</span>
        <span className={`text-sm font-semibold tabular-nums ${scoreColor}`}>
          {s.score}/10
        </span>
      </div>

      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={10}
          value={s.score}
          onChange={(e) => onScoreChange(s.id, Number(e.target.value))}
          className={`w-full h-1.5 rounded-full border-0 bg-white/10 outline-none ring-0 ${ui.accent}`}
          aria-label={`Оцінка ${s.name}`}
        />
        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      {s.score === 0 ? (
        <p className="text-[11px] leading-snug text-rose-300">
          {WHEEL_TEXTS.sphere.zeroHint}
        </p>
      ) : null}

      {category?.description && (
        <p className="text-[11px] text-[var(--text-muted)] leading-snug">
          {category.description}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">
            {WHEEL_TEXTS.sphere.actions}
          </p>
          <Hint text={WHEEL_TEXTS.sphere.aiHint} />
        </div>

        {actions.map((action, index) => {
          const key = `${s.id}-${index}`
          const isEmpty = !action.text

          return (
            <div key={key} className="flex items-start gap-2 group">
              <button
                type="button"
                onClick={() =>
                  isEmpty
                    ? onAddAction(s.id)
                    : actionInputRefs.current[key]?.focus()
                }
                className="w-4 text-xs text-[var(--text-muted)] hover:text-white"
                aria-label={WHEEL_TEXTS.sphere.editActionAria}
              >
                {isEmpty ? '+' : '✏️'}
              </button>

              <Textarea
                ref={(el: HTMLTextAreaElement | null) => {
                  actionInputRefs.current[key] = el
                }}
                value={action.text}
                onChange={(e) =>
                  onActionChange(s.id, index, e.target.value)
                }
                placeholder={WHEEL_TEXTS.sphere.addActionPlaceholder}
                rows={1}
                className="min-h-7 flex-1 resize-none overflow-hidden bg-transparent text-xs text-[var(--text-secondary)] placeholder:text-white/20 outline-none"
              />

              {!!action.text && (
                <button
                  type="button"
                  onClick={() => onRemoveAction(s.id, index)}
                  className="text-xs text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100"
                  aria-label={WHEEL_TEXTS.sphere.removeActionAria}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default React.memo(WheelSphereCard)
