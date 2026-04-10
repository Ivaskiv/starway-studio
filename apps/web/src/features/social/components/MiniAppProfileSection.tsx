import { ArrowRight, BellRing, CreditCard, Settings, ShieldCheck, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAppSelector } from '@/app/hooks'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { selectCurrentUser } from '@/features/auth/services/auth.slice'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import { useGetConnectionsQuery } from '@/features/social/services/social.api'
import MiniAppSubscriptionPanel from '@/features/social/components/MiniAppSubscriptionPanel'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { TRIAL_TOTAL_DAYS } from '@/features/trial/utils/trialProgress'
import { useMemo } from 'react'

interface MiniAppProfileSectionProps {
  displayName: string
  panel?: 'subscription' | 'settings' | 'profile' | 'level_up' | null
}

export default function MiniAppProfileSection({
  displayName,
  panel = null,
}: MiniAppProfileSectionProps) {
  const navigate = useNavigate()
  const user = useAppSelector(selectCurrentUser)
  const userId = user?.id ?? ''
  const { accessControl, subscription } = useSystemState()
  const { data: summary } = useGetSummaryQuery(undefined, { skip: !userId })
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !userId })
  const { data: connections } = useGetConnectionsQuery(undefined, { skip: !userId })

  if (panel === 'subscription' || panel === 'level_up') {
    return (
      <div className="pb-4">
        <div className="sr-only">{displayName}</div>
        <MiniAppSubscriptionPanel panel={panel} />
      </div>
    )
  }

  const initials = displayName.charAt(0).toUpperCase()
  const hasTelegram = Boolean(connections?.connections?.some(connection => connection.provider === 'telegram'))
  const hasEmail = Boolean(user?.email && !user.email.startsWith('telegram-guest-'))
  const hasPaidAccess = Boolean(user?.access?.isPaid || subscription?.isActive || accessControl?.hasSubscription)
  const isTrial = !hasPaidAccess && Boolean(trial?.isActive || user?.access?.isTrial)
  const trialDay = useMemo(() => {
    if (subscription?.isActive) {
      const start = subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart) : null
      if (!start || Number.isNaN(start.getTime())) return 1
      return Math.max(1, Math.floor((Date.now() - start.getTime()) / 86_400_000) + 1)
    }

    const day = Math.floor(Number(trial?.currentDay ?? 0))
    return Number.isFinite(day) && day > 0 ? Math.min(TRIAL_TOTAL_DAYS, day) : 0
  }, [subscription?.currentPeriodStart, subscription?.isActive, trial?.currentDay])
  const bitMind = summary?.rewards.bitMind ?? 0
  const neuroGems = summary?.rewards.neuroGems ?? 0
  const streak = summary?.streak.current ?? 0
  const notificationSettings = user?.settings?.notifications as {
    enabled?: boolean
    morningTime?: string
    eveningTime?: string
  } | undefined
  const appLanguage = user?.settings?.language ?? 'uk'
  const appTheme = user?.settings?.theme ?? 'dark'

  if (panel === 'profile') {
    return (
      <div className="space-y-4 px-4 pt-5">
        <section className="dashboard-liquid-card overflow-hidden p-0">
          <div className="dashboard-liquid-edge--top border-b border-[var(--border)] px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.12)] text-xl font-medium text-[var(--text-primary)]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">Мої дані</p>
                <h2 className="mt-2 truncate text-xl font-medium text-[var(--text-primary)]">{displayName}</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Тут видно, як тебе бачить система Starway.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 px-5 py-4">
            <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Контакти</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">Імʼя</span>
                  <span className="text-[var(--text-primary)]">{displayName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">Email</span>
                  <span className={hasEmail ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                    {hasEmail ? user?.email : 'Не додано'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">Telegram</span>
                  <span className={hasTelegram ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                    {hasTelegram ? 'Підключено' : 'Не видно звʼязку'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Ритм і доступ</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">Поточний ритм</span>
                  <span className="text-[var(--text-primary)]">{streak} дн.</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">BitMind</span>
                  <span className="text-[var(--text-primary)]">{bitMind}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">NeuroGems</span>
                  <span className="text-[var(--text-primary)]">{neuroGems}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">ABsystem</span>
                  <span className={hasPaidAccess || isTrial ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                    {hasPaidAccess ? 'Активна підписка' : isTrial ? `Тріал · день ${trialDay || 1}/${TRIAL_TOTAL_DAYS}` : 'Потрібно оновити'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/miniapp/profile')}
              className="btn-liquid-dashboard--ice w-full rounded-[18px] px-4 py-3 text-sm font-medium"
            >
              ← Назад
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (panel === 'settings') {
    return (
      <div className="space-y-4 px-4 pt-5">
        <section className="dashboard-liquid-card overflow-hidden p-0">
          <div className="dashboard-liquid-edge--top border-b border-[var(--border)] px-5 py-5">
            <div className="flex items-center gap-4">
              <span className="btn-icon h-12 w-12 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
                <Settings className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">Налаштування</p>
                <h2 className="mt-2 text-xl font-medium text-[var(--text-primary)]">Що зараз увімкнено</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Короткий зріз параметрів, які впливають на твій щоденний ритм.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 px-5 py-4">
            <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Сповіщення</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">Статус</span>
                  <span className={notificationSettings?.enabled !== false ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                    {notificationSettings?.enabled !== false ? 'Увімкнено' : 'Вимкнено'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">Ранковий час</span>
                  <span className="text-[var(--text-primary)]">{notificationSettings?.morningTime ?? '08:00'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">Вечірній час</span>
                  <span className="text-[var(--text-primary)]">{notificationSettings?.eveningTime ?? '20:00'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Інтерфейс</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">Мова</span>
                  <span className="text-[var(--text-primary)]">{appLanguage.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">Тема</span>
                  <span className="text-[var(--text-primary)]">{appTheme}</span>
                </div>
              </div>
            </div>

            <p className="rounded-[18px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.08)] px-4 py-3 text-xs leading-5 text-[var(--text-secondary)]">
              Глибші налаштування ще можна відкрити на сайті, але основний ритм і доступ у mini app вже видно тут.
            </p>

            <button
              type="button"
              onClick={() => navigate('/miniapp/profile')}
              className="btn-liquid-dashboard--ice w-full rounded-[18px] px-4 py-3 text-sm font-medium"
            >
              ← Назад
            </button>
          </div>
        </section>
      </div>
    )
  }

  const quickActions = [
    {
      label: 'Плани і доступ',
      sub: hasPaidAccess ? 'Керувати активною підпискою' : isTrial ? 'Тріал ще активний' : 'Оновити доступ',
      icon: CreditCard,
      onClick: () => navigate('/miniapp/profile?panel=subscription'),
    },
    {
      label: 'Мої дані',
      sub: 'Імʼя, email і канали звʼязку',
      icon: UserRound,
      onClick: () => navigate('/miniapp/profile?panel=profile'),
    },
    {
      label: 'Налаштування',
      sub: 'Мова, сповіщення і параметри',
      icon: Settings,
      onClick: () => navigate('/miniapp/profile?panel=settings'),
    },
  ]

  return (
    <div className="space-y-4 px-4 pt-5">
      <div className="sr-only">{displayName}</div>
      <section className="dashboard-liquid-card overflow-hidden p-0">
        <div className="dashboard-liquid-edge--top border-b border-[var(--border)] px-5 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.12)] text-xl font-medium text-[var(--text-primary)]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">Starway ID</p>
              <h2 className="mt-2 truncate text-xl font-medium text-[var(--text-primary)]">{displayName}</h2>
              <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                {hasEmail ? user?.email : 'Email можна додати пізніше'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-[var(--border)]">
          <div className="bg-[rgba(255,255,255,0.02)] px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">BitMind</p>
            <p className="mt-1 text-lg font-medium text-[var(--text-primary)]">{bitMind}</p>
          </div>
          <div className="bg-[rgba(255,255,255,0.02)] px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">NeuroGems</p>
            <p className="mt-1 text-lg font-medium text-[var(--text-primary)]">{neuroGems}</p>
          </div>
          <div className="bg-[rgba(255,255,255,0.02)] px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Ритм</p>
            <p className="mt-1 text-lg font-medium text-[var(--text-primary)]">{streak}</p>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
              <p className="text-sm font-medium text-[var(--text-primary)]">Доступ зараз</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--text-secondary)]">Telegram</span>
                <span className={hasTelegram ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                  {hasTelegram ? 'Підключено' : 'Не видно звʼязку'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--text-secondary)]">Email</span>
                <span className={hasEmail ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                  {hasEmail ? 'Є в профілі' : 'Можна додати пізніше'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--text-secondary)]">ABsystem</span>
                <span className={hasPaidAccess || isTrial ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                  {hasPaidAccess ? 'Платний доступ' : isTrial ? `Тріал · день ${trialDay || 1}/${TRIAL_TOTAL_DAYS}` : 'Потрібно оновити'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
              <p className="text-sm font-medium text-[var(--text-primary)]">Швидкі дії</p>
            </div>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="flex w-full items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-left transition-all hover:border-[rgba(var(--accent-rgb),0.18)]"
                >
                  <span className="btn-icon h-10 w-10 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
                    <action.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[var(--text-primary)]">{action.label}</span>
                    <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{action.sub}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
