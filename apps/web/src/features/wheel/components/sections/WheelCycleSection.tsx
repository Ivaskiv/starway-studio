import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'

type Props = {
  onOpenCycle: () => void
}

export default function WheelCycleSection({ onOpenCycle }: Props) {
  return (
    <section className="rounded-2xl p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {WHEEL_TEXTS.cycle.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            {WHEEL_TEXTS.cycle.description}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {WHEEL_TEXTS.cycle.path}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCycle}
          className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
          aria-label={WHEEL_TEXTS.cycle.ctaAria}
        >
          {WHEEL_TEXTS.cycle.cta}
        </button>
      </div>
    </section>
  )
}
