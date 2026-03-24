import { ROUTES } from '@/config/routes'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGetProfileQuery } from '@/features/gamification/services/gamification.api'
import { useGetProgressQuery } from '@/features/progress/services/progress.api'
import { useGetConnectionsQuery } from '@/features/social/services/social.api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { clampTrialDay, TRIAL_TOTAL_DAYS } from '@/features/trial/utils/trialProgress'
import { GlassCard } from '@/ui'
import { ArrowRight, BellRing, CreditCard, Settings, ShieldCheck, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface AccountCabinetContentProps {
  compact?: boolean
}

export default function AccountCabinetContent({
  compact = false,
}: AccountCabinetContentProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { accessControl } = useSystemState()
  const userId = user?.id ?? ''
  const { data: profile } = useGetProfileQuery(undefined, { skip: !userId })
  const { data: progress } = useGetProgressQuery(userId, { skip: !userId })
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !userId })
  const { data: connections } = useGetConnectionsQuery(undefined, { skip: !userId })

  if (!user) return null

  const displayName = user.firstName || user.name || user.email?.split('@')[0] || 'Учень'
  const initials = displayName.charAt(0).toUpperCase()
  const hasTelegram = Boolean(
    connections?.connections?.some(connection => connection.provider === 'telegram'),
  )
  const hasEmail = Boolean(user.email && !user.email.startsWith('telegram-guest-'))
  const isPaid = Boolean(user.access?.isPaid)
  const isTrial = Boolean(trial?.isActive || user.access?.isTrial)
  const hasMentorAccess = Boolean(accessControl?.hasSubscription || isTrial || isPaid)
  const planLabel = isPaid ? 'Активна підписка' : isTrial ? 'Тріал AI Mentor' : 'Немає підписки'
  const planTone = isPaid || isTrial
    ? 'border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.10)] text-[var(--text-primary)]'
    : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
  const currentDay = clampTrialDay(trial?.currentDay)
  const stats = [
    { label: 'BITMIND', value: profile?.bitMind ?? progress?.totalPoints ?? user.stats?.totalPoints ?? 0 },
    { label: 'NEUROGEMS', value: profile?.neuroGems ?? 0 },
    { label: 'Streak', value: profile?.currentStreakDays ?? progress?.streakDays ?? user.stats?.streakDays ?? 0 },
    { label: 'Рівень', value: profile?.level ?? progress?.level ?? user.stats?.level ?? 1 },
  ]

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <GlassCard className={compact ? 'p-4' : 'p-6'}>
        <div className={compact ? 'space-y-4' : 'flex items-center gap-5'}>
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
                {hasMentorAccess ? 'Доступ до AI Mentor активний' : 'Доступ до AI Mentor не активний'}
              </p>
            </div>
          </div>

          {!compact && (
            <div className="ml-auto grid min-w-[240px] grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Контакти</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {hasEmail && hasTelegram ? 'Email + Telegram' : hasEmail ? 'Тільки email' : hasTelegram ? 'Тільки Telegram' : 'Не завершено'}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Тріал</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {currentDay ? `День ${currentDay} з ${TRIAL_TOTAL_DAYS}` : 'Не активний'}
                </p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4'}`}>
        {stats.map((item) => (
          <GlassCard key={item.label} className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{item.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
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
              <span>AI Mentor</span>
              <span className={hasMentorAccess ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                {hasMentorAccess ? (isPaid ? 'Платний доступ' : 'Тріал активний') : 'Недоступно'}
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Кабінет користувача</h4>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Підписка', sub: isPaid ? 'Керування активним планом' : isTrial ? 'Тріал активний' : 'Підключити доступ', icon: CreditCard, path: ROUTES.SUBSCRIPTION },
              { label: 'Налаштування', sub: 'Профіль, тема, параметри', icon: Settings, path: ROUTES.SETTINGS },
              { label: 'Профіль користувача', sub: 'Основні дані та канали доступу', icon: UserRound, path: ROUTES.PROFILE },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.path)}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
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
