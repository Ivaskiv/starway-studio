import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  MINI_APP_SESSION_RETRY_TEXT,
  MINI_APP_TELEGRAM_REQUIRED_TEXT,
} from '@/features/social/content/miniAppFallback.content'
import { useGetCalendarSessionsQuery } from '@/features/zoom/zoom.api'
import type { ZoomCalendarMode, ZoomCalendarSession } from '@/features/zoom/zoom.types'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

function resolveRole(role: string | null | undefined): ZoomCalendarMode {
  return role === 'EXPERT' || role === 'ADMIN' || role === 'SUPERADMIN' ? 'coach' : 'user'
}

type HomeTabProps = {
  isTelegramRuntime: boolean
}

export default function HomeTab({ isTelegramRuntime }: HomeTabProps) {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { subscription } = useSystemState()

  const role = resolveRole(user?.activeRole ?? user?.role)
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const userId = role === 'coach' ? (user?.expertId ?? user?.id ?? '') : (user?.id ?? '')

  const { data: sessions = [], isLoading: isSessionsLoading } = useGetCalendarSessionsQuery(
    { from, to, role, userId },
    { skip: !isAuthenticated || !userId, refetchOnMountOrArgChange: true },
  )

  const nextSession = useMemo<ZoomCalendarSession | null>(() => {
    return sessions
      .filter((session) =>
        session.status !== 'COMPLETED'
        && session.status !== 'CANCELLED'
        && new Date(session.scheduledAt).getTime() > Date.now()
        && (role === 'coach' || session.isMyBooking),
      )
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null
  }, [role, sessions])

  const battleCount = useMemo(
    () => sessions.filter((session) => session.type === 'battle_review' && session.status !== 'COMPLETED').length,
    [sessions],
  )

  const bookedSessionsCount = useMemo(
    () => sessions.filter((session) => role === 'coach' ? session.status !== 'CANCELLED' : session.isMyBooking).length,
    [role, sessions],
  )

  if (isAuthLoading || isSessionsLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/70">
          Завантажуємо головний Zoom-екран...
        </div>
      </div>
    )
  }

  if (!user || !isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-6">
        <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-100">
          {isTelegramRuntime
            ? MINI_APP_SESSION_RETRY_TEXT
            : MINI_APP_TELEGRAM_REQUIRED_TEXT}
        </div>
      </div>
    )
  }

  const displayName = user.firstName || user.name || user.email?.split('@')[0] || 'Користувач'
  const subscriptionLabel = subscription?.isActive
    ? subscription.expiresAt
      ? `Активна до ${new Date(subscription.expiresAt).toLocaleDateString('uk-UA')}`
      : 'Активна'
    : user.subscriptionStatus
      ? `Статус: ${user.subscriptionStatus}`
      : 'Не активована'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-6 pb-24">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">Zoom home</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">{displayName}</h1>
            <p className="mt-2 text-sm text-white/60">
              {nextSession ? `${daysUntil(nextSession.scheduledAt)} дн. до наступної Zoom-сесії` : 'Найближча Zoom-сесія ще не запланована'}
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] text-white/60">
            {role === 'coach' ? 'Режим коуча' : 'Режим учасника'}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[rgba(74,144,255,0.10)] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-200/70">Наступна сесія</p>
        {nextSession ? (
          <>
            <h2 className="mt-2 text-lg font-semibold text-white">{nextSession.topic}</h2>
            <p className="mt-2 text-sm text-white/65">{formatDateTime(nextSession.scheduledAt)}</p>
            <p className="mt-1 text-xs text-white/45">
              {nextSession.type}
              {typeof nextSession.attendeesCount === 'number' ? ` · ${nextSession.attendeesCount} учасн.` : ''}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {nextSession.zoomLink ? (
                <button
                  type="button"
                  onClick={() => window.open(nextSession.zoomLink, '_blank', 'noopener,noreferrer')}
                  className="rounded-2xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                >
                  Відкрити Zoom
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => navigate('/dashboard/zoom')}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Увесь календар
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-white/65">Поки немає наступної сесії для цього профілю.</p>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">Підписка</p>
        <p className="mt-2 text-lg font-semibold text-white">{subscription?.isActive ? 'FOCUS активна' : 'FOCUS не активна'}</p>
        <p className="mt-2 text-sm text-white/60">{subscriptionLabel}</p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Сесії" value={String(bookedSessionsCount)} />
        <StatCard label="Battles" value={String(battleCount)} />
        <StatCard label="XP" value={String(user.stats?.xp ?? 0)} accent="amber" />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <ActionCard label="Календар" onClick={() => navigate('/dashboard/zoom')} />
        <ActionCard label="Ментор" onClick={() => navigate('/miniapp/mentor')} />
        <ActionCard label="Прогрес" onClick={() => navigate('/miniapp/tracker')} />
        <ActionCard label="Профіль" onClick={() => navigate('/miniapp/profile')} />
      </section>
    </div>
  )
}

function StatCard({ label, value, accent = 'sky' }: { label: string; value: string; accent?: 'sky' | 'amber' }) {
  const valueClass = accent === 'amber' ? 'text-amber-300' : 'text-sky-300'
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
      <p className={`text-2xl font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-white/55">{label}</p>
    </div>
  )
}

function ActionCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left text-sm font-semibold text-white transition hover:bg-white/[0.08]"
    >
      {label}
    </button>
  )
}
