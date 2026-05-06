import { Lock } from 'lucide-react'
import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'

type Props = {
  onOpenSubscription: () => void
}

const PREMIUM_ITEMS = [
  {
    title: WHEEL_TEXTS.features.recovery.title,
    hint: WHEEL_TEXTS.paywall.available,
    text: WHEEL_TEXTS.features.recovery.desc,
  },
  {
    title: WHEEL_TEXTS.features.patterns.title,
    hint: WHEEL_TEXTS.paywall.available,
    text: WHEEL_TEXTS.features.patterns.desc,
  },
  {
    title: WHEEL_TEXTS.features.mentor.title,
    hint: WHEEL_TEXTS.paywall.available,
    text: WHEEL_TEXTS.features.mentor.desc,
  },
]

export default function WheelPremiumPreviewSection({ onOpenSubscription }: Props) {
  return (
    <section className="card-surface liquid-glass rounded-2xl border border-white/10 p-5 shadow-[0_0_40px_rgba(31,79,143,0.18)]">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f5be37]">
            {WHEEL_TEXTS.paywall.preview}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#f5be37]">
            {WHEEL_TEXTS.paywall.locked}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {WHEEL_TEXTS.paywall.description}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSubscription}
          className="hero-cta-primary shrink-0 justify-center"
        >
          {WHEEL_TEXTS.paywall.cta}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PREMIUM_ITEMS.map((item) => (
          <article
            key={item.title}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(74,47,99,0.10),transparent_42%,rgba(31,79,143,0.08))]" />
            <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
              <Lock className="h-4 w-4 text-white/70" />
            </div>
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f5be37]">
                {item.hint}
              </p>
              <h3 className="mt-3 text-base font-semibold text-white/90">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/58">
                {item.text}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
