import { ROUTES } from '@/config/routes'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import { cn } from '@/lib/utils'
import { useGetConnectionsQuery } from '@/features/social/services/social.api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { TRIAL_TOTAL_DAYS } from '@/features/trial/utils/trialProgress'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { GlassCard } from '@/ui'
import { ArrowRight, BellRing, CreditCard, Settings, ShieldCheck, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface AccountCabinetContentProps {
  compact?: boolean
  preferredPanel?: 'subscription' | 'settings' | 'profile' | 'level_up' | null
}

export default function AccountCabinetContent({
  compact = false,
  preferredPanel = null,
}: AccountCabinetContentProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { accessControl, subscription } = useSystemState()
  const userId = user?.id ?? ''
  const { data: summary } = useGetSummaryQuery(undefined, { skip: !userId })
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !userId })
  const { data: connections } = useGetConnectionsQuery(undefined, { skip: !userId })
  const { dayNumber } = useUserProgress()

  if (!user) return null

  const displayName = user.firstName || user.name || user.email?.split('@')[0] || 'Учень'
  const initials = displayName.charAt(0).toUpperCase()
  const hasTelegram = Boolean(
    connections?.connections?.some(connection => connection.provider === 'telegram'),
  )
  const hasEmail = Boolean(user.email && !user.email.startsWith('telegram-guest-'))
  const isPaid = Boolean(user.access?.isPaid || subscription?.isActive || accessControl?.hasSubscription)
  const isTrial = !isPaid && Boolean(trial?.isActive || user.access?.isTrial)
  const hasMentorAccess = Boolean(accessControl?.hasSubscription || isTrial || isPaid)
  const planLabel = isPaid ? 'Активна підписка' : isTrial ? 'Тріал ABsystem' : 'Немає підписки'
  const planTone = isPaid || isTrial
    ? 'border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.10)] text-[var(--text-primary)]'
    : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
  const currentDay = dayNumber || Math.max(0, trial?.currentDay ?? 0)
  const effectivePanel = preferredPanel === 'level_up' ? 'subscription' : preferredPanel
  const panelCopy = {
    subscription: {
      title: 'Панель доступу відкрита',
      description: 'Тут зібрано тріал, план і наступний крок для продовження доступу без втрати контексту.',
    },
    level_up: {
      title: 'Оновлення рівня відкрите',
      description: 'Тут видно поточний доступ, ритм і крок, який допоможе перейти на наступний рівень системно.',
    },
    settings: {
      title: 'Налаштування відкриті',
      description: 'Тут можна швидко перевірити канали, параметри профілю й точки синхронізації між модулями.',
    },
    profile: {
      title: 'Профіль відкритий',
      description: 'Тут зібрано базові дані, канали звʼязку і поточний статус доступу.',
    },
  } as const
  const stats = [
    { label: 'BITMIND', value: summary?.rewards.bitMind ?? 0 },
    { label: 'NEUROGEMS', value: summary?.rewards.neuroGems ?? 0 },
    { label: 'Streak', value: summary?.streak.current ?? 0 },
    { label: 'Рівень', value: summary?.xp.level ?? 1 },
  ]
  const actionItems = [
    { key: 'subscription', label: 'Підписка', sub: isPaid ? 'Керування активним планом' : isTrial ? 'Тріал активний' : 'Підключити доступ', icon: CreditCard, path: ROUTES.SUBSCRIPTION },
    { key: 'settings', label: 'Налаштування', sub: 'Профіль, тема, параметри', icon: Settings, path: ROUTES.SETTINGS },
    { key: 'profile', label: 'Профіль користувача', sub: 'Основні дані та канали доступу', icon: UserRound, path: ROUTES.PROFILE },
  ] as const
  const orderedActionItems = [
    ...actionItems.filter(item => item.key === effectivePanel),
    ...actionItems.filter(item => item.key !== effectivePanel),
  ]

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <GlassCard className={compact ? 'p-4' : 'p-6'}>
        <div className={compact ? 'space-y-4' : 'flex flex-col gap-5 lg:flex-row lg:items-center'}>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(var(--accent-rgb),0.28)] bg-[rgba(var(--accent-rgb),0.16)] text-2xl font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-xl font-semibold text-[var(--text-primary)]">{displayName}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${planTone}`}>
                  {planLabel}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{user.email ?? 'Email не додано'}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {hasMentorAccess ? 'Доступ до ABsystem активний' : 'Доступ до ABsystem не активний'}
              </p>
            </div>
          </div>

          {!compact && (
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:ml-auto lg:w-auto lg:min-w-[240px]">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Контакти</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {hasEmail && hasTelegram ? 'Email + Telegram' : hasEmail ? 'Тільки email' : hasTelegram ? 'Тільки Telegram' : 'Не завершено'}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Тріал</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {currentDay
                    ? isPaid
                      ? `Місячний період · день ${currentDay}`
                      : `День ${currentDay} з ${TRIAL_TOTAL_DAYS}`
                    : 'Не активний'}
                </p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'min-[931px]:grid-cols-2 xl:grid-cols-4'}`}>
        {stats.map((item) => (
          <GlassCard key={item.label} className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{item.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 min-[931px]:grid-cols-2'}`}>
        <GlassCard className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Статус доступу</h4>
          </div>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
              <span>Email</span>
              <span className={hasEmail ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                {hasEmail ? 'Підключено' : 'Потрібно додати'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
              <span>Telegram</span>
              <span className={hasTelegram ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                {hasTelegram ? 'Підключено' : 'Не підключено'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
              <span>ABsystem</span>
              <span className={hasMentorAccess ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                {hasMentorAccess ? (isPaid ? 'Місячний період' : 'Тріал активний') : 'Недоступно'}
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Кабінет користувача</h4>
          </div>
          {preferredPanel ? (
            <div className="mb-3 rounded-2xl border border-[rgba(var(--accent-rgb),0.2)] bg-[rgba(var(--accent-rgb),0.08)] px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">
                {panelCopy[preferredPanel].title}
              </p>
              <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
                {panelCopy[preferredPanel].description}
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            {orderedActionItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-tertiary)]',
                  effectivePanel === item.key && 'border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.10)]',
                )}
              >
                <span className="btn-icon h-10 w-10 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{item.sub}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
