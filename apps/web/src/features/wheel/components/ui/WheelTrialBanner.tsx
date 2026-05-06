import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'
import { getProgressWidthClass } from '@/features/wheel/utils/progressBar'

type Props = {
  trialDaysLeft: number
  trialProgress: number
  onOpenSubscription: () => void
}

export default function WheelTrialBanner({
  trialDaysLeft,
  trialProgress,
  onOpenSubscription,
}: Props) {
  const progressWidthClass = getProgressWidthClass(trialProgress)

  return (
    <section className="trial-banner w-full max-w-full overflow-hidden rounded-[22px] border border-[rgba(245,190,55,0.22)] bg-[linear-gradient(180deg,rgba(21,32,54,0.98),rgba(10,18,36,0.96))] px-5 py-5 text-white shadow-[0_18px_48px_rgba(8,15,32,0.28)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[rgba(245,190,55,0.22)] bg-[rgba(255,255,255,0.04)]">
            <span className="h-5 w-5 rounded-full bg-[#f5be37]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 rounded-lg border border-[rgba(245,190,55,0.22)] bg-[rgba(245,190,55,0.08)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.16em] text-[#f5be37]">
                {WHEEL_TEXTS.trial.badge}
              </span>
              <p className="truncate text-sm font-semibold text-[#f5be37]">
                {WHEEL_TEXTS.trial.daysLeft(trialDaysLeft)}
              </p>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">
              {WHEEL_TEXTS.trial.title}
            </h2>
            <p className="mt-1 text-sm text-white/72">
              {WHEEL_TEXTS.trial.description}
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 lg:max-w-[280px]">
          <button
            type="button"
            onClick={onOpenSubscription}
            className="w-full rounded-xl border border-[rgba(245,190,55,0.28)] bg-[rgba(245,190,55,0.08)] px-4 py-3 text-sm font-semibold text-[#f5be37] transition-colors hover:bg-[rgba(245,190,55,0.12)]"
          >
            {WHEEL_TEXTS.trial.cta}
          </button>

          <div className="h-1.5 rounded-full bg-[rgba(150,160,180,0.22)]">
            <div
              className={['h-full rounded-full bg-[#f5be37] transition-all duration-200', progressWidthClass].join(' ')}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
