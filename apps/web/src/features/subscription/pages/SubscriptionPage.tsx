// frontend/src/features/subscription/pages/SubscriptionPage.tsx
// FIX: useGetMeQuery → useAppSelector(selectCurrentUser)
// Причина: useGetMeQuery в 3 місцях → паралельні 401 → множинні refresh
// selectCurrentUser читає з Redux store — без мережевого запиту

import { useAppSelector }   from '@/app/hooks'
import { useTrackFrontendEventMutation } from '@/features/analytics/services/events.api'
import { selectCurrentUser } from '@/features/auth/services/auth.slice'
import { hasPaidAccess }    from '@/shared/utils/access.utils'
import {
  ArrowRight, BookOpen, Brain,
  Check, Crown, MessageCircle, Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface Plan {
  id:            string
  name:          string
  price:         number
  period:        string
  originalPrice?: number
  features:      string[]
  badge?:        string
  badgeColor?:   'blue' | 'purple' | 'amber'
  highlighted?:  boolean
}

const PLANS: Plan[] = [
  {
    id: 'monthly', name: 'Місячна', price: 299, period: 'міс',
    badge: 'Популярний', badgeColor: 'blue',
    features: ['AI Ментор без обмежень','Всі курси та матеріали','Щоденні сесії','Telegram нагадування','Статистика та аналітика'],
  },
  {
    id: 'yearly', name: 'Річна', price: 199, period: 'міс',
    originalPrice: 299, highlighted: true,
    badge: 'Економія 33%', badgeColor: 'purple',
    features: ['Все з місячної підписки','Пріоритетна підтримка','Ранній доступ до нових курсів','Ексклюзивні матеріали','Знижка на наставництво'],
  },
  {
    id: 'yearly_plus', name: 'Річна + Наставник', price: 499, period: 'міс',
    badge: 'Преміум', badgeColor: 'amber',
    features: ['Все з річної підписки','Особистий наставник','4 Zoom-сесії на місяць','Персональний план розвитку','Прямий контакт у Telegram','VIP чат спільноти'],
  },
]

const BADGE_STYLES = {
  blue:   'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600',
  purple: 'bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600',
  amber:  'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600',
}

export default function SubscriptionPage() {
  // ── ВИПРАВЛЕНО: читаємо з store — без мережевого запиту ─────────────────
  const user = useAppSelector(selectCurrentUser)

  const [isProcessing, setIsProcessing] = useState(false)
  const [showTrial,    setShowTrial]    = useState(false)
  const [trackFrontendEvent] = useTrackFrontendEventMutation()
  const hasSubscription = hasPaidAccess(user)

  useEffect(() => {
    setTimeout(() => setShowTrial(true), 10)
    void trackFrontendEvent({
      userId: user?.id ?? null,
      type: 'web_subscription_page_viewed',
      source: 'web',
      state: user?.subscriptionStatus ?? null,
      payload: {
        hasSubscription,
      },
    })
  }, [hasSubscription, trackFrontendEvent, user?.id, user?.subscriptionStatus])

  const trialDaysLeft = user?.access?.trialEnd
    ? Math.max(0, Math.ceil((new Date(user.access.trialEnd).getTime() - Date.now()) / 86_400_000))
    : 0

  const handleSubscribe = async (planId: string) => {
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
    console.log('Subscribe to:', planId)
    setTimeout(() => setIsProcessing(false), 1500)
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm mb-4">
          <Crown className="w-4 h-4" />
          Premium підписка
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
          Розблокуй повний потенціал
        </h1>
        <p className="text-white/60 max-w-lg mx-auto">
          Отримай необмежений доступ до AI-ментора, всіх курсів та персональної підтримки
        </p>
      </div>

      {/* Trial Banner */}
      {!hasSubscription && trialDaysLeft > 0 && (
        <div className={[
          'relative overflow-hidden p-6 rounded-2xl text-center',
          'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10',
          'border border-amber-500/30 transition-all duration-500',
          showTrial ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5',
        ].join(' ')}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,146,60,0.15),transparent_70%)]" />
          <p className="text-amber-400 relative z-10 flex items-center justify-center gap-2">
            <span className="text-2xl">⏰</span>
            <span>
              Безкоштовний період закінчується через{' '}
              <strong className="text-amber-300">{trialDaysLeft} днів</strong>
            </span>
          </p>
        </div>
      )}

      {/* Active subscription */}
      {hasSubscription && (
        <div className="relative overflow-hidden p-8 rounded-2xl text-center border border-green-500/30 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-green-500/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.15),transparent_70%)]" />
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-[0_20px_60px_rgba(34,197,94,0.4)]">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Підписка активна</h2>
            <p className="text-white/70">
              Твій план: <strong className="text-green-400">{user?.subscriptionPlan}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      {!hasSubscription && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={[
                'relative overflow-hidden rounded-2xl p-6 flex flex-col transition-all duration-300',
                plan.highlighted
                  ? 'bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-purple-500/15 border-2 border-purple-500/40 shadow-[0_20px_80px_rgba(168,85,247,0.35)]'
                  : 'bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.07] border border-white/[0.1]',
                'hover:scale-[1.02] hover:shadow-[0_20px_80px_rgba(var(--accent-rgb),0.3)]',
              ].join(' ')}
            >
              <div className={[
                'absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300',
                plan.highlighted
                  ? 'bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.15),transparent_70%)]'
                  : 'bg-[radial-gradient(circle_at_50%_50%,rgba(var(--accent-rgb),0.1),transparent_70%)]',
              ].join(' ')} />

              {plan.badge && (
                <span className={[
                  'absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[11px] font-bold text-white z-10',
                  'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
                  BADGE_STYLES[plan.badgeColor || 'blue'],
                ].join(' ')}>
                  {plan.badge}
                </span>
              )}

              <div className="relative z-10">
                <h3 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">{plan.name}</h3>

                <div className="flex items-baseline gap-2 mb-6">
                  {plan.originalPrice && (
                    <span className="text-base text-[color:var(--text-muted)] line-through opacity-60">
                      ₴{plan.originalPrice}
                    </span>
                  )}
                  <span className="text-5xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    ₴{plan.price}
                  </span>
                  <span className="text-[color:var(--text-muted)] text-sm">/{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-green-400" />
                      </div>
                      <span className="text-[color:var(--text-secondary)] text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isProcessing}
                  className={[
                    'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white transition-all duration-300',
                    plan.highlighted
                      ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:shadow-[0_8px_32px_rgba(168,85,247,0.5)]'
                      : 'bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] hover:shadow-[0_8px_32px_rgba(var(--accent-rgb),0.5)]',
                    'hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Brain,         title: 'AI Ментор',  desc: 'Персональний помічник 24/7', color: 'from-purple-500 to-pink-500'   },
          { icon: BookOpen,      title: 'Всі курси',  desc: '5+ преміум курсів',          color: 'from-blue-500 to-cyan-500'     },
          { icon: MessageCircle, title: 'Підтримка',  desc: 'Швидка відповідь',           color: 'from-green-500 to-emerald-500' },
          { icon: Users,         title: 'Спільнота',  desc: 'Доступ до чату',             color: 'from-amber-500 to-orange-500'  },
        ].map((item, i) => (
          <div
            key={i}
            className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.1] hover:border-white/[0.2] transition-all duration-300 group"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <item.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-white font-semibold mb-1">{item.title}</p>
            <p className="text-white/50 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
