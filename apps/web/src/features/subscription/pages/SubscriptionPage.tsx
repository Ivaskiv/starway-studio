import { ROUTES } from '@/config/routes'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { consumePostPaymentRedirect, POST_PAYMENT_REDIRECT_KEY } from '@/features/paywall/usePaywall'
import { useCreatePaymentMutation, useGetSubscriptionQuery } from '@/features/subscription/services/billing.api'
import { SUBSCRIPTION_BADGE_CLASS, SUBSCRIPTION_PLANS } from '@/features/subscription/constants/plans'
import { useStartTrialMutation, useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'
import { submitWayForPayForm } from '@/features/subscription/utils/wayforpayCheckout'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const { onboardingState } = useUserProgress()
  const { hasCoreAccess: systemHasCoreAccess, subscriptionActive: systemSubscriptionActive, trialActive } = useSystemState()
  const { data: trial } = useGetTrialStatusQuery()
  const { data: subscriptionStatus } = useGetSubscriptionQuery()
  const [startTrial, startTrialState] = useStartTrialMutation()
  const [createPayment, createPaymentState] = useCreatePaymentMutation()
  const [paymentFailed, setPaymentFailed] = useState(false)

  const subscriptionActive = Boolean(
    systemSubscriptionActive || subscriptionStatus?.subscription?.status === 'ACTIVE'
  )
  const hasCoreAccess = Boolean(systemHasCoreAccess || subscriptionActive)
  const isTrialActive = Boolean(trialActive && !subscriptionActive)
  const isTrialExpired = Boolean(
    !hasCoreAccess
    && !trialActive
    && ((trial?.currentDay ?? 0) > 0 || trial?.startedAt),
  )
  const trialDaysLeft = Math.max(0, trial?.daysLeft ?? 0)
  const pricingOptions = SUBSCRIPTION_PLANS.map((plan) => {
    if (plan.id === 'monthly') {
      return {
        ...plan,
        displayName: 'Starter',
        eyebrow: 'Якір',
        subtitle: 'Для тих, хто ще не готовий збирати систему повністю.',
        dayPrice: `€${(33 / 30).toFixed(1)} / день`,
        cta: subscriptionActive ? 'Повернутись у дашборд' : 'Рухатись далі',
      }
    }

    if (plan.id === 'yearly') {
      return {
        ...plan,
        displayName: 'Growth',
        eyebrow: 'Найчастіший вибір',
        subtitle: 'WEB-Карта, щоденний цикл, Telegram і аналітика без розриву.',
        dayPrice: `€${(199 / 30).toFixed(1)} / день`,
        cta: subscriptionActive ? 'Повернутись у дашборд' : 'Зібрати систему',
      }
    }

    return {
      ...plan,
      displayName: 'Architect',
      eyebrow: 'Для тих, хто не хоче гальмувати',
      subtitle: 'Усе разом із Zoom-сесіями, супроводом і преміальним ритмом.',
      dayPrice: `€${(499 / 30).toFixed(1)} / день`,
      cta: subscriptionActive ? 'Повернутись у дашборд' : 'Продовжити розвиток',
    }
  })

  useEffect(() => {
    if (hasCoreAccess || isTrialActive || isTrialExpired || !onboardingState.isNewUser) return
    startTrial().catch(() => undefined)
  }, [hasCoreAccess, isTrialActive, isTrialExpired, onboardingState.isNewUser, startTrial])

  useEffect(() => {
    if (!subscriptionActive) return
    const redirectPath = consumePostPaymentRedirect()
    navigate(redirectPath ?? ROUTES.CYCLE, { replace: true })
  }, [navigate, subscriptionActive])

  const handleStartTrial = async () => {
    if (!hasCoreAccess && !isTrialActive && !isTrialExpired) {
      try {
        await startTrial().unwrap()
      } catch {
        // no-op, user may already have active/used trial
      }
    }

    navigate(onboardingState.isOnboardingComplete ? ROUTES.DASHBOARD : `${ROUTES.DASHBOARD}?focusStep=1`)
  }

  const handleUpgrade = async () => {
    setPaymentFailed(false)
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(POST_PAYMENT_REDIRECT_KEY, ROUTES.CYCLE)
      }
      const response = await createPayment({ plan: 'monthly', variant: 'A' }).unwrap()
      submitWayForPayForm(response.paymentUrl, response.payment)
    } catch {
      setPaymentFailed(true)
    }
  }

  const statusCopy = subscriptionActive
    ? 'У тебе відкритий повний доступ до системи. Можна повертатись у дашборд і продовжувати цикл.'
    : isTrialActive
      ? WHEEL_TEXTS.subscription.activeCopy
      : isTrialExpired
        ? WHEEL_TEXTS.subscription.expiredCopy
        : WHEEL_TEXTS.subscription.readyCopy

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="glass-card border border-[rgba(92,136,255,0.18)] bg-[linear-gradient(180deg,rgba(42,77,155,0.38),rgba(11,19,37,0.94))] px-5 py-6 shadow-[0_28px_80px_rgba(8,15,32,0.42)] sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
            Підписка
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Який рівень змін ти хочеш?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
            Не вибір функцій, а вибір того, наскільки глибоко ти хочеш зібрати свою систему. Без системи ти повернешся в хаос.
          </p>
          {isTrialActive ? (
            <p className="mt-3 text-sm font-medium text-[#f5be37]">
              Залишилось {trialDaysLeft} дні
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-4 lg:grid-cols-3">
            {pricingOptions.map((plan) => {
              const isGrowth = plan.displayName === 'Growth'
              const isArchitect = plan.displayName === 'Architect'
              const badgeClass = plan.badgeColor ? SUBSCRIPTION_BADGE_CLASS[plan.badgeColor] : ''

              return (
                <article
                  key={plan.id}
                  className={[
                    'glass-card rounded-[26px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(18,22,31,0.96))] p-5 shadow-[0_22px_56px_rgba(8,15,32,0.3)]',
                    isGrowth ? 'border-[rgba(245,190,55,0.24)]' : 'border-[var(--border-primary)]',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
                        {plan.eyebrow}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{plan.displayName}</h2>
                    </div>
                    {plan.badge ? (
                      <span className={['inline-flex rounded-full px-3 py-1 text-[11px] font-semibold', badgeClass].join(' ')}>
                        {isGrowth ? 'Найчастіший вибір' : plan.badge}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-white/72">
                    {plan.subtitle}
                  </p>

                  <div className="mt-5">
                    <div className="text-4xl font-semibold tracking-tight text-white">
                      €{plan.price}
                      <span className="ml-2 text-sm text-white/35">/ міс</span>
                    </div>
                    <div className="mt-1 text-sm text-white/45">{plan.dayPrice}</div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {plan.features.slice(0, isArchitect ? 6 : 5).map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm leading-6 text-white/70">
                        <span className="mt-1 text-[rgb(45,212,191)]">✓</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={
                        subscriptionActive
                          ? () => navigate(ROUTES.DASHBOARD)
                          : isGrowth
                            ? handleUpgrade
                            : plan.id === 'monthly'
                              ? handleUpgrade
                              : () => navigate(ROUTES.SUBSCRIPTION)
                      }
                      disabled={createPaymentState.isLoading && !subscriptionActive}
                      className={[
                        'w-full rounded-[16px] px-4 py-3 text-sm font-semibold transition-colors duration-150 disabled:cursor-wait disabled:opacity-60',
                        isGrowth
                          ? 'bg-[#1C2B4A] text-white hover:bg-[#24365F]'
                          : 'border border-white/10 bg-white/6 text-white/78 hover:bg-white/10',
                      ].join(' ')}
                    >
                      {createPaymentState.isLoading && !subscriptionActive && (isGrowth || plan.id === 'monthly')
                        ? 'Переходимо до оплати…'
                        : plan.cta}
                    </button>
                  </div>
                </article>
              )
            })}

            {paymentFailed || createPaymentState.isError ? (
              <div className="lg:col-span-3 rounded-[16px] border border-rose-500/20 bg-rose-500/[0.06] p-4">
                <p className="text-sm text-white/78">
                  Не вдалося перейти до оплати. Спробуй ще раз, і ми повернемо тебе в щоденний цикл після успіху.
                </p>
                <button
                  type="button"
                  onClick={handleUpgrade}
                  className="mt-3 text-sm font-semibold text-rose-300 transition-colors duration-150 hover:text-white"
                >
                  Спробувати ще раз
                </button>
              </div>
            ) : null}
          </div>

          <aside className="glass-card rounded-[26px] border border-[var(--border-primary)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(18,22,31,0.96))] p-5 shadow-[0_22px_56px_rgba(8,15,32,0.3)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
              Доступ
            </p>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3">
                <span>Стан</span>
                <span className="font-semibold text-white">
                  {subscriptionActive
                    ? WHEEL_TEXTS.subscription.paidStatus
                    : isTrialActive
                      ? WHEEL_TEXTS.subscription.trialStatus
                      : isTrialExpired
                        ? WHEEL_TEXTS.subscription.expiredStatus
                        : WHEEL_TEXTS.subscription.startingStatus}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3">
                <span>{WHEEL_TEXTS.subscription.trialLabel}</span>
                <span className="font-semibold text-white">
                  {isTrialActive
                    ? WHEEL_TEXTS.subscription.trialLeft(trialDaysLeft)
                    : isTrialExpired
                      ? WHEEL_TEXTS.subscription.expiredStatus
                      : WHEEL_TEXTS.subscription.autostart}
                </span>
              </div>
              <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3 text-white/60">
                {statusCopy}
              </div>
              <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3 text-white/60">
                Без системи ти повернешся в хаос. Тут ти обираєш не ціну, а те, наскільки сильно хочеш закріпити новий ритм.
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartTrial}
              disabled={startTrialState.isLoading}
              className="mt-5 w-full rounded-[16px] border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white/78 transition-colors duration-150 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
            >
              {startTrialState.isLoading
                ? WHEEL_TEXTS.subscription.startTrialLoading
                : WHEEL_TEXTS.subscription.startTrial}
            </button>
          </aside>
        </section>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="text-sm text-white/40 transition-colors duration-150 hover:text-white/64"
          >
            Назад до дашборду
          </button>
        </div>
      </div>
    </main>
  )
}
