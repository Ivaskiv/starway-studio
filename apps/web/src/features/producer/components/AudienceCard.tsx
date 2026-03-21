// frontend/src/features/producer/components/AudienceCard.tsx

import type { TargetingAudience } from '../services/producer.api'

interface Props {
  audience: TargetingAudience
  index:    number
}

const COLORS = ['var(--accent)', '#A855F7', '#3B82F6'] as const

export function AudienceCard({ audience, index }: Props) {
  const color = COLORS[index % COLORS.length]!

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
    >
      {/* Назва + вік */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-0.5"
          >
            Аудиторія {index + 1}
          </p>
          <p className="text-white font-semibold text-sm leading-snug">
            {audience.name}
          </p>
        </div>
        <span
          className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium"
        >
          {audience.age}
        </span>
      </div>

      {/* Болі / бажання */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-xl p-2.5"
        >
          <p className="text-red-400 text-[10px] uppercase tracking-widest font-medium mb-1">Біль</p>
          <p className="text-white/70 text-xs leading-relaxed">{audience.pain}</p>
        </div>
        <div
          className="rounded-xl p-2.5"
        >
          <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-medium mb-1">Бажання</p>
          <p className="text-white/70 text-xs leading-relaxed">{audience.desire}</p>
        </div>
      </div>

      {/* Інтереси */}
      <div className="flex flex-wrap gap-1.5">
        {audience.interests.map((interest, i) => (
          <span
            key={i}
            className="text-[11px] px-2 py-0.5 rounded-full"
          >
            {interest}
          </span>
        ))}
      </div>

      {/* Рекламний текст */}
      <div
        className="rounded-xl px-3 py-2.5"
      >
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1.5">Ad text</p>
        <p className="text-white/70 text-xs leading-relaxed">{audience.adText}</p>
      </div>

      {/* Бюджет */}
      <div className="flex items-center justify-between">
        <p className="text-white/30 text-xs">Рекомендований бюджет</p>
        <p className="text-white/70 text-xs font-medium">{audience.budgetRecommendation}</p>
      </div>
    </div>
  )
}
