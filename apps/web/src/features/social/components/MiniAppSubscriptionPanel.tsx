import { useMemo, useState } from 'react'
import { Check, ChevronRight, Crown, Sparkles } from 'lucide-react'

import { useAppSelector } from '@/app/hooks'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { selectCurrentUser } from '@/features/auth/services/auth.slice'
import { useTrackFrontendEventMutation } from '@/features/analytics/services/events.api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { SUBSCRIPTION_BADGE_CLASS, SUBSCRIPTION_PLANS } from '@/features/subscription/constants/plans'
import { initiateSubscriptionCheckout, runSuperadminSubscriptionTest } from '@/features/subscription/utils/subscriptionCheckout'
import { usePermissions } from '@/hooks/usePermissions'

interface MiniAppSubscriptionPanelProps {
  panel?: 'subscription' | 'level_up' | null
}

export default function MiniAppSubscriptionPanel({
  panel = 'subscription',
}: MiniAppSubscriptionPanelProps) {
  const user = useAppSelector(selectCurrentUser)
  const userId = user?.id ?? ''
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !userId })
  const { accessControl, subscription } = useSystemState()
  const { canManageRoles } = usePermissions()
  const [trackFrontendEvent] = useTrackFrontendEventMutation()
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [isTestProcessing, setIsTestProcessing] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<string | null>(null)

  const isPaidAccess = Boolean(user?.access?.isPaid || subscription?.isActive || accessControl?.hasSubscription)
  const trialEndsAt = !isPaidAccess ? user?.access?.trialEnd ?? trial?.endsAt ?? null : subscription?.expiresAt ?? null
  const monthlyDay = useMemo(() => {
    if (!isPaidAccess) return 0
    const start = subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart) : null
    if (!start || Number.isNaN(start.getTime())) return 1
    return Math.max(1, Math.floor((Date.now() - start.getTime()) / 86_400_000) + 1)
  }, [isPaidAccess, subscription?.currentPeriodStart])
  const trialDaysLeft = useMemo(() => {
    if (!trialEndsAt || isPaidAccess) return 0
    return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
  }, [isPaidAccess, trialEndsAt])

  const title = panel === 'level_up' ? 'Онови доступ і рухайся далі' : 'Доступ і плани'
  const subtitle = panel === 'level_up'
    ? 'Щоб не втратити ритм і звіти, обери формат доступу, який підходить тобі зараз.'
    : 'Після Telegram-кнопки ти вже всередині Starway. Тут можна одразу подивитись плани і продовжити без повторного входу.'

  const handleOpenWebsitePlan = async (planId: string) => {
    try {
      setIsProcessing(planId)
      await trackFrontendEvent({
        userId: user?.id ?? null,
        type: 'miniapp_subscription_plan_selected',
        source: 'miniapp',
        state: user?.subscriptionStatus ?? null,
        payload: { planId },
      })
      await initiateSubscriptionCheckout(planId)
    } catch (error) {
      console.error(error)
    } finally {
      setIsProcessing(null)
    }
  }

  const handleSuperadminTest = async (planId: string | 'trial') => {
    try {
      setIsTestProcessing(planId)
      setTestStatus(null)
      if (planId === 'trial') {
        const data = await runSuperadminSubscriptionTest('trial')
        setTestStatus(`Тестовий trial активовано до ${new Date(data.trialEndsAt).toLocaleDateString('uk-UA')}`)
      } else {
        const data = await runSuperadminSubscriptionTest(planId)
        setTestStatus(`Тестову оплату активовано: ${data.planCode} до ${new Date(data.currentPeriodEnd).toLocaleDateString('uk-UA')}`)
      }
    } catch (error) {
      console.error(error)
      setTestStatus('Не вдалося виконати тестову дію')
    } finally {
      setIsTestProcessing(null)
    }
  }

  return (
    <div className="space-y-4 px-4 pt-5">
      <section className="dashboard-liquid-card overflow-hidden p-0">
        <div className="dashboard-liquid-edge--top border-b border-[var(--border)] px-5 py-5">
          <div className="flex items-start gap-3">
            <span className="btn-icon h-11 w-11 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
              <Crown className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">Starway plans</p>
              <h2 className="mt-2 text-xl font-medium text-[var(--text-primary)]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">Поточний стан доступу</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                {isPaidAccess
                  ? `Місячний період · день ${monthlyDay || 1}`
                  : trialDaysLeft > 0
                    ? `Тріал ще активний. Залишилось приблизно ${trialDaysLeft} дн.`
                    : 'Тріал завершився або доступ не активний. Обери план, щоб продовжити ABsystem без втрати контексту.'}
              </p>
            </div>
              <span className="rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.10)] px-3 py-1 text-[11px] font-medium text-[rgb(var(--accent-soft-rgb))]">
                {isPaidAccess
                  ? `Підписка · день ${monthlyDay || 1}`
                  : trialDaysLeft > 0
                    ? `Trial · ${trialDaysLeft} дн.`
                    : 'Потрібно оновити'}
              </span>
            </div>
          </div>

          {canManageRoles ? (
            <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="btn-icon h-10 w-10 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">SUPERADMIN · тестовий доступ</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    Можна ще раз увімкнути trial або одразу активувати тестову оплату, щоб перевірити purchase-flow без реального платежу.
                  </p>
                  {testStatus ? (
                    <p className="mt-3 text-xs text-[rgb(var(--accent-soft-rgb))]">{testStatus}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { void handleSuperadminTest('trial') }}
                      disabled={Boolean(isTestProcessing)}
                      className="btn-liquid-dashboard--ice rounded-full px-3 py-2 text-xs font-medium disabled:opacity-60"
                    >
                      Ще один trial
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleSuperadminTest('monthly') }}
                      disabled={Boolean(isTestProcessing)}
                      className="btn-liquid-dashboard--tint rounded-full px-3 py-2 text-xs font-medium disabled:opacity-60"
                    >
                      Test monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleSuperadminTest('yearly') }}
                      disabled={Boolean(isTestProcessing)}
                      className="btn-liquid-dashboard--tint rounded-full px-3 py-2 text-xs font-medium disabled:opacity-60"
                    >
                      Test yearly
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <article
                key={plan.id}
                className={[
                  'overflow-hidden rounded-[24px] border px-4 py-4 transition-all duration-300',
                  plan.highlighted
                    ? 'border-[rgba(181,120,255,0.22)] bg-[rgba(181,120,255,0.08)]'
                    : 'border-[var(--border)] bg-[rgba(255,255,255,0.03)]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-medium text-[var(--text-primary)]">{plan.name}</h3>
                      {plan.badge ? (
                        <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${SUBSCRIPTION_BADGE_CLASS[plan.badgeColor || 'blue']}`}>
                          {plan.badge}
                        </span>
                      ) : null}
                    </div>
                    {plan.description ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{plan.description}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    {plan.originalPrice ? (
                      <p className="text-xs text-[var(--text-muted)] line-through">{plan.originalPrice}€</p>
                    ) : null}
                    <p className="text-2xl font-medium text-[var(--text-primary)]">{plan.price}€</p>
                    <p className="text-xs text-[var(--text-muted)]">/{plan.period}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.10)] text-[rgb(var(--accent-soft-rgb))]">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { void handleOpenWebsitePlan(plan.id) }}
                    disabled={Boolean(isProcessing)}
                    className="btn-liquid-dashboard--primary flex flex-1 items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-medium disabled:opacity-60"
                  >
                    {isProcessing === plan.id ? 'Відкриваємо…' : 'Купити підписку'}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
