// frontend/src/features/ai-generator/components/HeroVariantsPicker.tsx

import { useState } from 'react'
import type { HeroVariant } from '../types/ai-generator.types'

interface Props {
  variants:   HeroVariant[]
  onSelect:   (variant: HeroVariant) => void
  isLoading?: boolean
}

const ANGLE_CONFIG = {
  pain:      { label: 'Біль',      color: '#EF4444', bg: 'rgba(239,68,68,0.08)'          },
  desire:    { label: 'Бажання',   color: 'rgb(var(--accent-rgb))', bg: 'rgba(var(--accent-rgb),0.10)' },
  curiosity: { label: 'Цікавість', color: '#A855F7', bg: 'rgba(168,85,247,0.08)'         },
} as const

export function HeroVariantsPicker({ variants, onSelect, isLoading }: Props) {
  const [selected, setSelected] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="h-28 rounded-2xl animate-pulse bg-[rgba(var(--accent-rgb),0.06)] border border-[rgba(var(--accent-rgb),0.10)]"
          />
        ))}
      </div>
    )
  }

  if (!variants.length) return null

  return (
    <div className="space-y-3">
      <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest font-medium">
        Оберіть Hero-варіант
      </p>

      {variants.map((v, i) => {
        const angle    = ANGLE_CONFIG[v.angle] ?? ANGLE_CONFIG.pain
        const isActive = selected === i

        return (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={[
              'w-full text-left rounded-2xl border p-4 transition-all duration-200',
              isActive
                ? 'bg-[rgba(var(--accent-rgb),0.10)] border-[rgba(var(--accent-rgb),0.40)] shadow-[0_0_20px_rgba(var(--accent-rgb),0.12)]'
                : 'bg-[rgba(var(--accent-rgb),0.03)] border-[rgba(var(--accent-rgb),0.12)] hover:bg-[rgba(var(--accent-rgb),0.07)] hover:border-[rgba(var(--accent-rgb),0.25)]',
            ].join(' ')}
          >
            {/* Бейдж кута */}
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2"
              style={{ color: angle.color, background: angle.bg }}
            >
              {angle.label}
            </span>

            {/* Заголовок */}
            <p className={[
              'font-semibold text-base leading-snug mb-1 transition-colors',
              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
            ].join(' ')}>
              {v.headline}
            </p>

            {/* Підзаголовок */}
            <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-3">
              {v.subline}
            </p>

            {/* CTA */}
            <span className={[
              'inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-lg transition-colors',
              isActive
                ? 'bg-[rgba(var(--accent-rgb),0.18)] text-[rgb(var(--accent-rgb))] border border-[rgba(var(--accent-rgb),0.30)]'
                : 'bg-[rgba(var(--accent-rgb),0.08)] text-[var(--text-muted)] border border-[rgba(var(--accent-rgb),0.15)]',
            ].join(' ')}>
              {v.cta} →
            </span>

            {/* Пояснення */}
            {v.description && (
              <p className="text-[var(--text-subtle)] text-xs mt-3 italic">
                {v.description}
              </p>
            )}
          </button>
        )
      })}

      {selected !== null && (
        <button
          onClick={() => onSelect(variants[selected]!)}
          className="w-full py-3 rounded-2xl font-semibold text-sm transition-all duration-150 active:scale-[0.98] bg-[rgb(var(--accent-rgb))] text-[var(--on-accent)] shadow-[0_4px_16px_rgba(var(--accent-rgb),0.35)] hover:shadow-[0_6px_24px_rgba(var(--accent-rgb),0.45)] hover:-translate-y-px"
        >
          Використати цей варіант
        </button>
      )}
    </div>
  )
}