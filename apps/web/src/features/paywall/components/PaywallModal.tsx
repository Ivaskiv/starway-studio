import { BaseModal } from '@/features/modals/BaseModal'
import Paywall from '@/features/paywall/components/Paywall'
import { usePaywallUI } from '@/features/paywall/hooks/usePaywallUI'

export default function PaywallModal() {
  const {
    close,
    consequences,
    handleContinue,
    headline,
    isLoading,
    isOpen,
    payload,
    selectPlan,
    selectedPlan,
    selectedPlanId,
    systemLabel,
  } = usePaywallUI()

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={close}
      panelClassName="w-full max-w-[900px] rounded-[28px] border border-[rgba(92,136,255,0.18)] bg-[linear-gradient(180deg,rgba(24,34,61,0.96),rgba(10,16,31,0.98))] p-6 shadow-[0_28px_80px_rgba(8,15,32,0.48)]"
    >
      {payload?.plans?.length ? (
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
              Персональна пропозиція
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Обери план
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {payload.plans.map((plan) => {
              const isActive = plan.id === selectedPlanId

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => selectPlan(plan.id)}
                  className={[
                    'rounded-2xl border p-5 text-left transition-all',
                    isActive
                      ? 'border-[rgba(92,136,255,0.55)] bg-[rgba(92,136,255,0.10)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{plan.title}</p>
                      <p className="mt-1 text-2xl font-semibold text-white">${plan.price}</p>
                    </div>
                    {isActive ? (
                      <span className="rounded-full bg-[rgba(92,136,255,0.18)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">
                        Обрано
                      </span>
                    ) : null}
                  </div>

                  <ul className="mt-4 flex flex-col gap-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="text-sm text-white/70">
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
                    <span className="hero-cta-primary inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium">
                      {plan.cta}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => void handleContinue()}
            disabled={!selectedPlan || isLoading}
            className="hero-cta-primary h-11 w-full rounded-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {selectedPlan?.cta ?? 'Продовжити'}
          </button>
        </div>
      ) : (
        <Paywall
          headline={headline}
          systemLabel={systemLabel}
          consequences={consequences}
          onContinue={() => void handleContinue()}
          isLoading={isLoading}
        />
      )}
    </BaseModal>
  )
}
