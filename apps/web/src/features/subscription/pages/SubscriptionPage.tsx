// frontend/src/features/subscription/pages/SubscriptionPage.tsx
// FIX: useGetMeQuery → useAppSelector(selectCurrentUser)
// Причина: useGetMeQuery в 3 місцях → паралельні 401 → множинні refresh
// selectCurrentUser читає з Redux store — без мережевого запиту

import { useAppSelector }   from '@/app/hooks'
import { useTrackFrontendEventMutation } from '@/features/analytics/services/events.api'
import { selectCurrentUser } from '@/features/auth/services/auth.slice'
import { usePermissions } from '@/hooks/usePermissions'
import { SUBSCRIPTION_BADGE_CLASS, SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/features/subscription/constants/plans'
import { initiateSubscriptionCheckout, runSuperadminSubscriptionTest } from '@/features/subscription/utils/subscriptionCheckout'
import { hasPaidAccess }    from '@/features/auth/utils/access.utils'
import {
  ArrowRight, BookOpen, Brain,
  Check, Crown, MessageCircle, Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export default function SubscriptionPage() {
  // ── ВИПРАВЛЕНО: читаємо з store — без мережевого запиту ─────────────────
  const user = useAppSelector(selectCurrentUser)
  const { canManageRoles } = usePermissions()

  const [isProcessing, setIsProcessing] = useState(false)
  const [isTestProcessing, setIsTestProcessing] = useState(false)
  const [testStatus, setTestStatus] = useState<string | null>(null)
  const [showTrial,    setShowTrial]    = useState(false)
  const [trackFrontendEvent] = useTrackFrontendEventMutation()
  const hasSubscription = hasPaidAccess(user)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowTrial(true), 10)
    void trackFrontendEvent({
      userId: user?.id ?? null,
      type: 'web_subscription_page_viewed',
      source: 'web',
      state: user?.subscriptionStatus ?? null,
      payload: {
        hasSubscription,
      },
    })

    return () => window.clearTimeout(timer)
  }, [hasSubscription, trackFrontendEvent, user?.id, user?.subscriptionStatus])

  const trialDaysLeft = user?.access?.trialEnd
    ? Math.max(0, Math.ceil((new Date(user.access.trialEnd).getTime() - Date.now()) / 86_400_000))
    : 0

  const handleSubscribe = async (planId: string) => {
    try {
      setIsProcessing(true)
      void trackFrontendEvent({
        userId: user?.id ?? null,
        type: 'web_subscription_cta_clicked',
        source: 'web',
        state: user?.subscriptionStatus ?? null,
        payload: {
          planId,
        },
      })

      await initiateSubscriptionCheckout(planId)
    } catch (error) {
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSuperadminTrialTest = async () => {
    try {
      setIsTestProcessing(true)
      setTestStatus(null)
      const data = await runSuperadminSubscriptionTest('trial')
      setTestStatus(`Тестовий trial активовано до ${new Date(data.trialEndsAt).toLocaleDateString('uk-UA')}`)
    } catch (error) {
      console.error(error)
      setTestStatus('Не вдалося запустити тестовий trial')
    } finally {
      setIsTestProcessing(false)
    }
  }

  const handleSuperadminPaymentTest = async (planId: string) => {
    try {
      setIsTestProcessing(true)
      setTestStatus(null)
      const data = await runSuperadminSubscriptionTest(planId)
      setTestStatus(`Тестову оплату активовано: ${data.planCode} до ${new Date(data.currentPeriodEnd).toLocaleDateString('uk-UA')}`)
    } catch (error) {
      console.error(error)
      setTestStatus('Не вдалося активувати тестову оплату')
    } finally {
      setIsTestProcessing(false)
    }
  }

  const BENEFITS = [
    { icon: Brain, title: 'ABsystem', desc: 'Персональний помічник 24/7' },
    { icon: BookOpen, title: 'Всі курси', desc: '5+ преміум курсів' },
    { icon: MessageCircle, title: 'Підтримка', desc: 'Швидка відповідь' },
    { icon: Users, title: 'Спільнота', desc: 'Доступ до чату' },
  ]

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.12)] px-4 py-2 text-sm text-[rgb(var(--accent-soft-rgb))]">
          <Crown className="w-4 h-4" />
          Premium підписка
        </div>
        <h1 className="mb-3 text-3xl font-medium text-[var(--text-primary)] md:text-4xl">
          Розблокуй повний потенціал
        </h1>
        <p className="mx-auto max-w-lg text-[var(--text-muted)]">
          Отримай необмежений доступ до ментора, всіх курсів та персональної підтримки
        </p>
      </div>

      {/* Trial Banner */}
      {!hasSubscription && trialDaysLeft > 0 && (
        <div className={[
          'rounded-[24px] border border-[rgba(255,188,102,0.18)] bg-[rgba(255,188,102,0.08)] p-6 text-center transition-all duration-500',
          showTrial ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5',
        ].join(' ')}>
          <p className="flex items-center justify-center gap-2 text-[#ffd18f]">
            <span className="text-2xl">⏰</span>
            <span>
              Безкоштовний період закінчується через{' '}
              <strong className="text-[#ffe0b4]">{trialDaysLeft} днів</strong>
            </span>
          </p>
        </div>
      )}

      {canManageRoles && (
        <div className="dashboard-liquid-card overflow-hidden p-0">
          <div className="dashboard-liquid-edge--top border-b border-[var(--border)] px-6 py-5">
            <h2 className="text-xl font-medium text-[var(--text-primary)]">SUPERADMIN · тест доступу</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Тут можна безпечно програти post-trial сценарій: ще раз увімкнути trial або тестово активувати paid-доступ для перевірки WayForPay та lifecycle-повідомлень.
            </p>
          </div>
          <div className="space-y-4 px-6 py-5">
            {testStatus ? (
              <p className="text-sm text-[rgb(var(--accent-soft-rgb))]">{testStatus}</p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSuperadminTrialTest}
                disabled={isTestProcessing}
                className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] disabled:opacity-60"
              >
                Ще один trial
              </button>
              <button
                type="button"
                onClick={() => handleSuperadminPaymentTest('monthly')}
                disabled={isTestProcessing}
                className="rounded-[18px] border border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.12)] px-4 py-3 text-sm font-medium text-[rgb(var(--accent-soft-rgb))] disabled:opacity-60"
              >
                Оплатити · test monthly
              </button>
              <button
                type="button"
                onClick={() => handleSuperadminPaymentTest('yearly')}
                disabled={isTestProcessing}
                className="rounded-[18px] border border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.12)] px-4 py-3 text-sm font-medium text-[rgb(var(--accent-soft-rgb))] disabled:opacity-60"
              >
                Оплатити · test yearly
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active subscription */}
      {hasSubscription && (
        <div className="dashboard-liquid-card overflow-hidden p-0 text-center">
          <div className="dashboard-liquid-edge--top px-8 py-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[22px] border border-emerald-400/20 bg-emerald-500/12">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="mb-2 text-2xl font-medium text-[var(--text-primary)]">Підписка активна</h2>
            <p className="text-[var(--text-secondary)]">
              Твій план: <strong className="text-emerald-300">{user?.subscriptionPlan}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      {!hasSubscription && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUBSCRIPTION_PLANS.map((plan: SubscriptionPlan) => (
            <div
              key={plan.id}
              className={[
                'dashboard-liquid-card relative flex h-full flex-col overflow-visible px-6 pb-6 pt-8 transition-all duration-300',
                plan.highlighted
                  ? 'border-[rgba(181,120,255,0.18)] bg-[rgba(181,120,255,0.06)]'
                  : '',
                'hover:-translate-y-1',
              ].join(' ')}
            >
              {plan.badge && (
                <span className={[
                  'absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-medium tracking-[0.02em]',
                  SUBSCRIPTION_BADGE_CLASS[plan.badgeColor || 'blue'],
                ].join(' ')}>
                  {plan.badge}
                </span>
              )}

              <div className="flex h-full flex-col">
                <h3 className="mb-4 text-xl font-medium text-[var(--text-primary)]">{plan.name}</h3>

                <div className="flex items-baseline gap-2 mb-6">
                  {plan.originalPrice && (
                    <span className="text-base text-[var(--text-muted)] line-through opacity-60">
                      ₴{plan.originalPrice}
                    </span>
                  )}
                  <span className="text-5xl font-medium text-[var(--text-primary)]">
                    ₴{plan.price}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">/{plan.period}</span>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/14">
                        <Check className="w-3 h-3 text-green-400" />
                      </div>
                      <span className="text-sm leading-relaxed text-[var(--text-secondary)]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isProcessing}
                  className={[
                    'mt-auto flex w-full items-center justify-center gap-2 rounded-[18px] px-6 py-3.5 font-medium transition-colors duration-300',
                    plan.highlighted
                      ? 'border border-[rgba(181,120,255,0.22)] bg-[rgba(181,120,255,0.16)] text-[#e2d0ff]'
                      : 'btn-liquid-dashboard--ice text-[var(--text-primary)]',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  ].join(' ')}
                >
                  {isProcessing ? 'Обробка...' : 'Обрати план'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Benefits */}
      <div className="dashboard-liquid-card overflow-hidden p-0">
        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((item, i) => (
            <div
              key={item.title}
              className={[
                'flex items-start gap-3 px-5 py-5',
                'border-t border-[var(--border)] sm:border-t-0',
                i % 2 === 1 ? 'sm:border-l sm:border-[var(--border)]' : '',
                i >= 2 ? 'lg:border-t lg:border-[var(--border)]' : '',
                i === 1 || i === 3 ? 'lg:border-l lg:border-[var(--border)]' : '',
              ].join(' ')}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.12)] text-[rgb(var(--accent-soft-rgb))]">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
