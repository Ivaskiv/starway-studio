import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

interface HeroCardProps {
  displayName: string
  dayNumber?: number
  insight: string
  continueHref: string
  title?: string
  ctaLabel?: string
}

export function HeroCard({
  displayName,
  dayNumber,
  insight,
  continueHref,
  title,
  ctaLabel = 'Продовжити щоденний цикл',
}: HeroCardProps) {
const heading =
  title ?? `${displayName}, твій день ${dayNumber ?? 1}.`
  return (
    <section className="glass-card overflow-hidden border border-[rgba(92,136,255,0.18)] bg-[linear-gradient(180deg,rgba(42,77,155,0.42),rgba(11,19,37,0.92))] px-5 py-6 shadow-[0_28px_80px_rgba(8,15,32,0.42)] sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
        Початок шляху
      </p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/74">
            {insight}
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[rgba(119,164,255,0.22)] bg-[rgba(71,110,196,0.2)] text-sky-200">
          <Sparkles className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5">
        <Link
          to={continueHref}
          className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.16)] px-5 py-3 text-sm font-medium text-[rgb(var(--accent-soft-rgb))] transition-colors duration-200 hover:bg-[rgba(var(--accent-rgb),0.22)]"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

export default HeroCard
