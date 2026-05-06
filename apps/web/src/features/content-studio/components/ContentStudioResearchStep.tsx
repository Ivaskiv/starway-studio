import { RefreshCcw } from 'lucide-react'

type CampaignCard = {
  key: string
  eyebrow: string
  title: string
  body: string
  metrics: readonly string[]
}

type Props = {
  sectionTitleClass: string
  researchUpdatedLabel: string
  researchSourceLabel: string
  hasResearchMeta: boolean
  isFallback: boolean
  isResearchStale: boolean
  isRefreshing: boolean
  onRefresh: () => void
  campaignCards: ReadonlyArray<CampaignCard>
}

export default function ContentStudioResearchStep(props: Props) {
  const {
    researchUpdatedLabel,
    researchSourceLabel,
    hasResearchMeta,
    isFallback,
    isResearchStale,
    isRefreshing,
    onRefresh,
    campaignCards,
  } = props

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              AI проаналізував найкращі рекламні кампанії у ніші coaching/personal development. Натисни на hook щоб адаптувати його у свій контент.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>Дані актуальні на: {researchUpdatedLabel}</span>
              <span>Джерело: {researchSourceLabel}</span>
              {!hasResearchMeta ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">Стартовий шаблон</span> : null}
              {isFallback ? <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-cyan-100">Тимчасовий fallback</span> : null}
              {isResearchStale ? <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-amber-200">Дані скоро застаріють</span> : null}
              <span>Автооновлення: 1-го числа кожного місяця</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--accent-soft-rgb))] transition-colors hover:border-[rgba(var(--accent-rgb),0.28)] disabled:opacity-55"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Оновлення…' : 'Оновити дані'}
          </button>
        </div>
      </div>

      <div className="grid gap-2.5 min-[480px]:grid-cols-2">
        {campaignCards.map((card) => (
          <div key={card.key} className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-3.5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{card.eyebrow}</p>
            <p className="mt-2.5 text-base font-semibold text-[var(--text-primary)]">{card.title}</p>
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{card.body}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {card.metrics.map((metric) => (
                <span key={metric} className="rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.09)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--accent-soft-rgb))]">
                  {metric}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
