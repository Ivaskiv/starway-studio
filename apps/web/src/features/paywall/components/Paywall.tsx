import { memo } from 'react'

import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'
import { Button } from '@/ui'

type PaywallProps = {
  headline: string
  systemLabel: string
  consequences: string[]
  onContinue: () => void
  isLoading?: boolean
}

function Paywall({
  headline,
  systemLabel,
  consequences,
  onContinue,
  isLoading = false,
}: PaywallProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
          Далі тільки глибше
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          {headline}
        </h2>
      </div>

      <div className="rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
        <p className="text-sm font-semibold text-white">
          {systemLabel}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {consequences.slice(0, 3).map((item) => (
            <p key={item} className="text-sm leading-6 text-white/68">
              {item}
            </p>
          ))}
        </div>
      </div>

      <Button onClick={onContinue} disabled={isLoading} className="hero-cta-primary h-11 w-full">
        {WHEEL_TEXTS.paywall.cta}
      </Button>
    </div>
  )
}

export default memo(Paywall)
