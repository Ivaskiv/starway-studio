// frontend/src/features/analytics/components/FunnelHealthCard.tsx

interface FunnelHealthResult {
  health: 'good' | 'needs_attention' | 'critical'
  bottleneck: string
  currentConversion: number
  benchmark: number
  dropoffRate: number
  recommendations: string[]
  urgentAction: string
  readyTexts: {
    day3Email?: string
    day7Push?: string
    retarget?: string
  }
}

interface Props {
  data:      FunnelHealthResult
  isLoading?: boolean
}

const HEALTH_CONFIG = {
  good:             { label: 'Добре',         color: '#10B981', bg: 'rgba(16,185,129,0.10)',  icon: '✅' },
  needs_attention:  { label: 'Потребує уваги', color: 'var(--accent)', bg: 'rgba(var(--accent-rgb), 0.15)',  icon: '⚠️' },
  critical:         { label: 'Критично',       color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  icon: '🚨' },
} as const

const BOTTLENECK_LABELS: Record<string, string> = {
  awareness:      'Мало трафіку',
  registration:   'Низька реєстрація',
  trial_to_paid:  'Trial → Paid',
  engagement:     'Низька залученість',
  retention:      'Відтік користувачів',
}

export function FunnelHealthCard({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div
        className="rounded-2xl p-5 animate-pulse"
      />
    )
  }

  const cfg        = HEALTH_CONFIG[data.health]
  const barWidth   = Math.min(100, Math.round((data.currentConversion / data.benchmark) * 100))

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
    >
      {/* Хедер */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">
            Здоров'я воронки
          </p>
          <div className="flex items-center gap-2">
            <span>{cfg.icon}</span>
            <span className="text-white font-semibold">{cfg.label}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
            >
              {BOTTLENECK_LABELS[data.bottleneck] ?? data.bottleneck}
            </span>
          </div>
        </div>

        {/* Конверсія */}
        <div className="text-right">
          <p className="text-white/40 text-xs mb-0.5">Конверсія</p>
          <p className="text-2xl font-bold">
            {data.currentConversion}%
          </p>
          <p className="text-white/30 text-xs">бенчмарк {data.benchmark}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div
          className="h-1.5 rounded-full"
        >
          <div
            className="h-1.5 rounded-full transition-all duration-700"
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-white/30 text-xs">0%</span>
          <span className="text-white/30 text-xs">{data.benchmark}% ціль</span>
        </div>
      </div>

      {/* Термінова дія */}
      {data.urgentAction && (
        <div
          className="rounded-xl p-3"
        >
          <p className="text-xs font-medium mb-1" >
            ⚡ Зробити сьогодні
          </p>
          <p className="text-white/70 text-sm">{data.urgentAction}</p>
        </div>
      )}

      {/* Рекомендації */}
      {data.recommendations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-white/40 text-xs uppercase tracking-widest">Рекомендації</p>
          {data.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-white/30 text-xs mt-0.5">•</span>
              <p className="text-white/60 text-sm">{r}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
