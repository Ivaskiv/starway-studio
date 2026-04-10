import { GlassCard } from '@/ui'
import type { MarketingCardConfig } from '../types/dashboard.types'
import { StatusPill } from './dashboardPrimitives'

export default function ExpertMarketingTaskCard({
  card,
  generated,
  onGenerate,
}: {
  card: MarketingCardConfig
  generated: string[]
  onGenerate: () => void
}) {
  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{card.icon}</span>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{card.title}</h2>
        </div>
        <StatusPill
          active
          label={card.sphere}
          tone="muted"
        />
      </div>

      <div className="space-y-5 px-6 py-6">
        <blockquote className="border-l-4 border-[rgba(255,255,255,0.18)] pl-4 text-lg italic leading-8 text-[var(--text-secondary)]">
          “{card.why}”
        </blockquote>

        <div className="space-y-3">
          {card.steps.map((step, index) => (
            <div key={step} className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-primary)] text-lg font-semibold text-[var(--text-primary)]">
                {index + 1}
              </span>
              <span className="text-xl text-[var(--text-primary)]">{step}</span>
            </div>
          ))}
        </div>

        {generated.length > 0 ? (
          <div className="rounded-[24px] border border-[rgba(99,102,241,0.26)] bg-[rgba(99,102,241,0.08)] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
              Система сформувала
            </p>
            <div className="mt-4 space-y-2">
              {generated.map((line) => (
                <p key={line} className="text-sm leading-7 text-[var(--text-primary)]">
                  {line}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
          <p className="text-xl font-semibold text-[rgb(var(--accent-rgb))]">+{card.xp} XP за виконання</p>
          <button type="button" onClick={onGenerate} className="hero-cta-primary inline-flex items-center gap-2">
            {card.buttonLabel}
          </button>
        </div>
      </div>
    </GlassCard>
  )
}
