// frontend/src/pages/DashboardPage.tsx

import { useAppSelector } from '@/app/hooks'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ABILITIES } from '@/features/auth/permissions/abilities'
import { selectUserRole } from '@/features/auth/services/auth.slice'
import { useAbility } from '@/features/auth/utils/can'
import { DailyCycleFlow } from '@/features/daily-cycle/pages/DailyCyclePage'
import GamificationWidget from '@/features/gamification/components/GamificationWidget'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { WheelChart } from '@/features/wheel/components/WheelChart'
import { WheelForm } from '@/features/wheel/components/WheelForm'
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { hasSavedAccentColor } from '@/theme/accent.utils'
import { GlassCard } from '@/ui'
import {
  BarChart3,
  CalendarDays,
  Download,
  RefreshCcw,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────

type UserStats = {
  streak?: number
  actions?: number
  progress?: string
  stability?: string
}

type ActivityItem = {
  id: string
  icon: string
  text: string
  time: string
}

type DashboardUser = {
  id: string
  firstName?: string
  name?: string
  abilities?: string[]
  settings?: {
    accentColor?: string
  }
  stats?: UserStats
  recentActivity?: ActivityItem[]
}

// ─── Fallback Data (тільки якщо нема користувацьких) ───────────────────────

const FALLBACK_STATS: Required<UserStats> = {
  streak: 3,
  actions: 5,
  progress: '87%',
  stability: '12/14',
}

const FALLBACK_ACTIVITY: ActivityItem[] = [
  { id: '1', icon: '⚖️', text: 'Завершено колесо балансу', time: '2 год тому' },
  { id: '2', icon: '🤖', text: 'AI сесія — цілі на тиждень', time: '5 год тому' },
  { id: '3', icon: '📝', text: 'Щоденний цикл заповнено', time: 'Вчора' },
]

const WHEEL_LABEL_MAP = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.nameUk]))
const WHEEL_EMOJI_MAP = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.emoji]))

const formatWheelDate = (value: Date) =>
  value.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })

const LIQUID_FOOTER_BUTTON_BASE =
  'w-full rounded-t-[18px] rounded-b-[22px] border-x border-b border-t-0 py-3 text-sm font-medium transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_30px_rgba(0,0,0,0.12)]'

const LIQUID_FOOTER_BUTTON_PRIMARY =
  `${LIQUID_FOOTER_BUTTON_BASE} border-x-[rgba(var(--accent-rgb),0.18)] border-b-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.88),rgba(var(--accent-rgb),0.72))] text-white hover:brightness-110`

const LIQUID_FOOTER_BUTTON_TINT =
  `${LIQUID_FOOTER_BUTTON_BASE} border-x-[rgba(var(--accent-rgb),0.16)] border-b-[rgba(255,255,255,0.10)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.12),rgba(var(--accent-rgb),0.07))] text-[var(--accent)] hover:bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.16),rgba(var(--accent-rgb),0.10))]`

const LIQUID_FOOTER_BUTTON_ICE =
  `${LIQUID_FOOTER_BUTTON_BASE} border-x-[rgba(var(--accent-rgb),0.14)] border-b-[rgba(255,255,255,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] text-[var(--text-secondary)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] hover:text-[var(--text-primary)]`

const DASHBOARD_USER_CARD =
  'overflow-hidden rounded-[24px] border border-[rgba(var(--accent-rgb),0.14)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.07),rgba(255,255,255,0.02)_18%,rgba(255,255,255,0.015)_100%)] shadow-[0_18px_48px_rgba(0,0,0,0.22),0_0_0_1px_rgba(var(--accent-rgb),0.04),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-18px_30px_rgba(0,0,0,0.10)]'

const DASHBOARD_USER_CARD_SOFT =
  'overflow-hidden rounded-[22px] border border-[rgba(var(--accent-rgb),0.12)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.05),rgba(255,255,255,0.02)_22%,rgba(255,255,255,0.012)_100%)] shadow-[0_14px_36px_rgba(0,0,0,0.18),0_0_0_1px_rgba(var(--accent-rgb),0.03),inset_0_1px_0_rgba(255,255,255,0.06)]'

const EDGE_ACTION_WRAP =
  'border-t border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] px-0 pb-0 pt-0'

const EDGE_ACTION_TOP_WRAP =
  'border-b border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))]'

// ─── StatsGrid ─────────────────────────────────────────────────────────────

function StatsGrid() {
  const { user } = useAuth()
  useAbility(ABILITIES.DASHBOARD_VIEW)

  const dashboardUser = user as DashboardUser
  const stats = dashboardUser?.stats ?? FALLBACK_STATS

  const STATS = [
    { label: 'Streak', value: stats.streak ?? FALLBACK_STATS.streak, sub: 'Днів поспіль', icon: '🔥' },
    { label: 'Дії', value: stats.actions ?? FALLBACK_STATS.actions, sub: 'Цього тижня', icon: '⚡' },
    { label: 'Прогрес', value: stats.progress ?? FALLBACK_STATS.progress, sub: 'Загальний', icon: '📈' },
    { label: 'Стабільність', value: stats.stability ?? FALLBACK_STATS.stability, sub: 'Днів з циклом', icon: '🗓' },
  ]

  return (
    <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      {STATS.map(({ label, value, sub, icon }, idx) => (
        <div
          key={label}
          className={[
            'flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3',
            idx < STATS.length - 1
              ? 'border-r border-[var(--border-primary)]'
              : '',
          ].join(' ')}
        >
          <span className="flex-shrink-0 text-xl">{icon}</span>
          <div className="min-w-0">
            <p className="text-base font-bold leading-none text-[var(--text-primary)]">
              {value}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
              {label} · {sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function JourneySection({ onOpenWheelFrame }: { onOpenWheelFrame: () => void }) {
  const { user } = useAuth()
  const { data: trial, isLoading } = useGetTrialStatusQuery()
  const navigate = useNavigate()
  const dashboardUser = user as DashboardUser
  const userId = dashboardUser?.id
  const hasWheelAccess = (trial?.isActive ?? false) || (trial?.isPaid ?? false)
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId ?? '', {
    skip: !userId || !hasWheelAccess,
  })
  const [embeddedSession, setEmbeddedSession] = useState<'morning' | 'evening' | null>(null)
  if (isLoading) return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center">
      <p className="text-sm text-[var(--text-muted)]">Завантажуємо твій шлях...</p>
    </div>
  )

  const hasEverStarted = (trial?.currentDay ?? 0) > 0
    || (trial?.startedAt != null && trial.startedAt !== null)
  const isTrialExpired  = !trial?.isActive && hasEverStarted
  const isPaid          = trial?.isPaid ?? false
  const isLocked        = isTrialExpired && !isPaid
  const hasNoTrial      = !trial?.isActive && !hasEverStarted
  const totalDays = 7
  const currentDay = Math.min(7, Math.max(1, trial?.currentDay ?? 1))
  const isJustStarted = (trial?.currentDay ?? 0) === 1 && (trial?.progress ?? 0) < 5
  const now = new Date()
  const isMorningDone = false
  const isEveningDone = false
  const isAfterMorning = now.getHours() >= 9
  const isAfterEvening = now.getHours() >= 21
  const currentDate = new Date()
  const lastWheelDate = latestWheel
    ? new Date(latestWheel.completedAt ?? latestWheel.createdAt)
    : null
  const nextWheelDate = lastWheelDate
    ? new Date(lastWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null
  const formatShortDate = (value: Date) =>
    value.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  const wheelSubtitle = lastWheelDate
    ? `Було ${formatShortDate(lastWheelDate)} · далі ${nextWheelDate ? formatShortDate(nextWheelDate) : '—'}`
    : 'Пройти колесо балансу'
  const wheelStatus: 'done' | 'pending' =
    lastWheelDate
      ? nextWheelDate && nextWheelDate <= currentDate ? 'pending' : 'done'
      : 'pending'

  if (hasNoTrial) return (
    <div className={DASHBOARD_USER_CARD_SOFT}>
      <div className="bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.12),rgba(255,255,255,0.02))] p-5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
          МІЙ ШЛЯХ
        </p>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          Розпочни свій шлях ✦
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          7 днів безкоштовно — ранкові питання, вечірня рефлексія,
          колесо балансу та AI аналіз стану.
        </p>
      </div>
      <div className="p-4">
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { icon: '🌞', label: 'Ранкові питання', sub: 'щодня о 09:00' },
            { icon: '🌙', label: 'Вечірня рефлексія', sub: 'щодня о 21:00' },
            { icon: '⚖️', label: 'Колесо балансу', sub: 'раз на місяць' },
          ].map(item => (
            <div
              key={item.label}
              className="rounded-xl border border-[var(--border-primary)] bg-[rgba(255,255,255,0.03)] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <span className="text-xl">{item.icon}</span>
              <p className="mt-2 text-xs font-medium text-[var(--text-primary)]">{item.label}</p>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{item.sub}</p>
            </div>
          ))}
        </div>
        <div className={EDGE_ACTION_WRAP}>
          <button
            type="button"
            className={LIQUID_FOOTER_BUTTON_PRIMARY}
            onClick={() => navigate('/dashboard/ai-mentor')}
          >
            ▶ Розпочати 7 днів безкоштовно
          </button>
        </div>
      </div>
    </div>
  )

  const tasks: Array<{
    icon: string
    title: string
    sub: string
    status: 'done' | 'pending' | 'locked' | 'time-locked'
    path: string
  }> = [
    {
      icon: '🌞',
      title: 'Ранкові питання',
      sub: '6 питань · ~5 хв',
      status: isMorningDone ? 'done' : isAfterMorning ? 'pending' : 'time-locked',
      path: '/dashboard/cycle?session=morning',
    },
    {
      icon: '🌙',
      title: 'Вечірня рефлексія',
      sub: 'Афірмації + підсумок дня',
      status: isEveningDone ? 'done' : isAfterEvening ? 'pending' : 'time-locked',
      path: '/dashboard/cycle?session=evening',
    },
    {
      icon: '⚖️',
      title: 'Колесо балансу',
      sub: wheelSubtitle,
      status: wheelStatus,
      path: '/dashboard/wheel',
    },
  ]

  const nextTask = tasks.find(task => task.status === 'pending') ?? tasks[0]
  const openTask = (task: (typeof tasks)[number]) => {
    if (isLocked) return
    if (task.path.startsWith('/dashboard/cycle')) {
      const session = task.path.includes('evening') ? 'evening' : 'morning'
      setEmbeddedSession(session)
      return
    }
    if (task.path === '/dashboard/wheel') {
      onOpenWheelFrame()
      return
    }
    navigate(task.path)
  }

  return (
    <section className="space-y-4">
      {isJustStarted && (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-bg,var(--bg-secondary))] p-4 text-center">
          <p className="text-sm font-medium text-[var(--accent)]">
            🎉 Вітаємо! Твій 7-денний шлях розпочато
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Щодня о 09:00 — ранкові питання · о 21:00 — вечірня рефлексія
          </p>
        </div>
      )}
      {isTrialExpired && !isPaid && (
        <div className={DASHBOARD_USER_CARD_SOFT}>
          <div className="bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.12),rgba(255,255,255,0.02))] p-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
              ТВІЙ ШЛЯХ · ПАУЗА
            </p>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              7 днів завершено 🎯
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Ти пройшов пробний період. Продовж щоб зберегти прогрес
              і розблокувати повний доступ.
            </p>
          </div>
          <div className="space-y-3 p-4">
            {[
              { plan: 'Тиждень', price: '7€', desc: 'Продовжити знайомство', key: 'WEEK' },
              { plan: 'Місяць', price: '30€', desc: 'Глибинна робота', key: 'MONTH' },
              { plan: 'Рік', price: '300€', desc: 'Максимальна економія', key: 'YEAR' },
            ].map(p => (
              <div
                key={p.key}
                className="flex items-center justify-between rounded-xl border border-[var(--border-primary)] bg-[rgba(255,255,255,0.02)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{p.plan}</p>
                  <p className="text-xs text-[var(--text-muted)]">{p.desc}</p>
                </div>
                <span className="text-lg font-bold text-[var(--accent)]">{p.price}</span>
              </div>
            ))}
            <div className={EDGE_ACTION_WRAP}>
              <button
                type="button"
                className={LIQUID_FOOTER_BUTTON_PRIMARY}
                onClick={() => navigate('/dashboard/subscription')}
              >
                Продовжити шлях →
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={DASHBOARD_USER_CARD}>
        <div className="bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.18),rgba(255,255,255,0.02)_58%,rgba(255,255,255,0.01))] p-5">
          <div className="mb-4 border-b border-[rgba(255,255,255,0.06)] pb-4">
            <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-[var(--accent)]">🔥 {currentDay}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">день поспіль</p>
              <p className="text-xs text-[var(--text-muted)]">День {currentDay} з {totalDays} · залишилось {trial?.daysLeft ?? 0} дн.</p>
            </div>
            <div className="ml-auto overflow-x-auto pb-1">
              <div className="flex gap-2" style={{ width: 'max-content' }}>
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = i + 1
                  const isDone = day < currentDay
                  const isToday = day === currentDay
                  return (
                    <div
                      key={day}
                      className={[
                        'w-11 flex-shrink-0 rounded-2xl px-2 py-1.5 text-center transition-all',
                        isLocked
                          ? 'bg-[rgba(255,255,255,0.02)] opacity-25 grayscale cursor-not-allowed'
                          : isDone
                            ? 'bg-[rgba(120,190,120,0.14)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                            : isToday
                              ? 'bg-[rgba(var(--accent-rgb),0.16)] ring-1 ring-[rgba(var(--accent-rgb),0.28)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                              : 'bg-[rgba(255,255,255,0.03)] opacity-70'
                      ].join(' ')}
                    >
                      <div
                        className={[
                          'text-sm font-medium leading-none',
                          isDone ? 'text-[var(--color-success)]' :
                          isToday ? 'text-[var(--accent)]' :
                          'text-[var(--text-muted)]'
                        ].join(' ')}
                      >
                        {day}
                      </div>
                      <div className="mt-0.5 text-[8px] text-[var(--text-muted)]">
                        {isDone ? 'готово' : isToday ? 'зараз' : '🔒'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          </div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
            ДЕНЬ {currentDay} · МІЙ ШЛЯХ
          </p>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Ранкова сесія</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Зафіксуй стан та отримай мікрозавдання на день
          </p>
          <div className="mt-3 h-1 rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${Math.round((currentDay / totalDays) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            Прогрес {Math.round((currentDay / totalDays) * 100)}%
          </p>
        </div>
        <div className="divide-y divide-[var(--border)] p-4">
          {tasks.map(task => (
            <div
              key={task.title}
              className={[
                'flex items-center gap-3 py-3',
                task.status === 'pending' || task.status === 'done' ? 'cursor-pointer' : '',
                isLocked ? 'pointer-events-none opacity-40' : '',
              ].join(' ')}
              onClick={() => {
                if (isLocked) return
                if (task.status === 'pending' || task.status === 'done') {
                  openTask(task)
                }
              }}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.03)] text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                {task.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">{task.title}</p>
                <p className="text-xs text-[var(--text-muted)]">{task.sub}</p>
              </div>
              <span
                className={[
                  'flex-shrink-0 rounded-full px-2 py-1 text-xs',
                  task.status === 'done' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' :
                  task.status === 'pending' ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]' :
                  task.status === 'time-locked' ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' :
                  'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                ].join(' ')}
              >
                {task.status === 'done' ? '✓ Готово' :
                  task.status === 'pending' ? 'Сьогодні' :
                  task.status === 'time-locked' ? (
                    <span className="flex items-center gap-1">
                      <span>🕐</span>
                      <span>{task.title === 'Ранкові питання' ? '09:00' : '21:00'}</span>
                    </span>
                  ) : '🔒'}
              </span>
            </div>
          ))}
        </div>
        {embeddedSession && (
          <div className="border-t border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))]">
            <div className="p-4">
              <DailyCycleFlow
                embedded
                initialSession={embeddedSession}
                onClose={() => setEmbeddedSession(null)}
                onComplete={() => setEmbeddedSession(null)}
              />
            </div>
          </div>
        )}
        <div className={EDGE_ACTION_WRAP}>
          {isLocked ? (
            <button
              type="button"
              className={LIQUID_FOOTER_BUTTON_TINT}
              onClick={() => navigate('/dashboard/subscription')}
            >
              Розблокувати доступ →
            </button>
          ) : (
            <button
              type="button"
              className={LIQUID_FOOTER_BUTTON_PRIMARY}
              onClick={() => openTask(nextTask)}
            >
              ▶ Продовжити день
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function Greeting({ name, isExpert, isSuperAdmin }: { name: string; isExpert: boolean; isSuperAdmin: boolean }) {
  if (!isExpert && !isSuperAdmin) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-semibold text-[var(--text-primary)]">
            Твій особистий простір зростання
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
          🌱 Учень
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          {isSuperAdmin ? 'SuperAdmin' : 'Кабінет коуча'}
        </p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isSuperAdmin
            ? `SuperAdmin · ${name}`
            : isExpert
              ? `Starway by Nadya · ${name}`
              : `Кабінет · ${name}`}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {isSuperAdmin
            ? 'Повний доступ — всі коучі, учні, аналітика'
            : isExpert
              ? 'Панель коуча — учні, продукти, AI-система'
              : 'Твій особистий простір зростання'}
        </p>
      </div>
      <span
        className={[
          'mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
          isSuperAdmin
            ? 'border-[var(--accent)] bg-[var(--accent-bg,var(--bg-secondary))] text-[var(--accent)]'
            : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
        ].join(' ')}
      >
        {isSuperAdmin ? '⭐ SuperAdmin' : '🎓 Коуч'}
      </span>
    </div>
  )
}

function ExpertStatsSection({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: isSuperAdmin ? 'Всіх учнів (всі коучі)' : 'Активних учнів', value: '—', icon: '👥', sub: 'підключається' },
          { label: 'Завершують день', value: '—', icon: '📊', sub: 'підключається' },
          { label: 'Потреб уваги', value: '—', icon: '⚠️', sub: 'підключається' },
          { label: 'Дохід місяця', value: '—', icon: '💰', sub: 'підключається' },
        ].map(s => (
          <GlassCard key={s.label} className="p-5">
            <div className="mb-2 text-2xl">{s.icon}</div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</p>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">{s.label}</p>
            <p className="mt-1 text-xs text-[var(--text-muted-light)]">{s.sub}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          {isSuperAdmin ? 'Загальна воронка — всі коучі' : 'AI Воронка — конверсія'}
        </h2>
        {[
          { label: 'Лідмагніт', value: '—', pct: 100, color: '#4d9de0' },
          { label: 'Реєстрація', value: '—', pct: 60, color: '#3a7bd5' },
          { label: 'Активація', value: '—', pct: 40, color: '#2d6bc4' },
          { label: 'Підписка', value: '—', pct: 13, color: '#1f5aad' },
        ].map(f => (
          <div key={f.label} className="mb-3 flex items-center gap-3">
            <span className="w-24 flex-shrink-0 text-xs text-[var(--text-muted)]">{f.label}</span>
            <div className="h-1.5 flex-1 rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${f.pct}%`, background: f.color }}
              />
            </div>
            <span className="w-6 text-right text-xs text-[#4d9de0]">{f.value}</span>
          </div>
        ))}
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          AI аналітика — рекомендації
        </h2>
        {[
          { icon: '🎯', text: 'Підключіть аналітику щоб побачити рекомендації' },
          { icon: '📣', text: 'Дані з\'являться після першого запуску навчального сценарію' },
          { icon: '🔍', text: 'SEO аналіз стане доступний після налаштування' },
        ].map((r, i) => (
          <div key={i} className="flex items-start gap-3 border-b border-[var(--border)] py-2.5 last:border-0">
            <span className="flex-shrink-0 text-base">{r.icon}</span>
            <span className="text-xs leading-relaxed text-[var(--text-muted)]">{r.text}</span>
          </div>
        ))}
      </GlassCard>
    </div>
  )
}

function FunnelConversionSection() { return null }

function AIProducerRecommendations() { return null }

function WheelStatusNotice({ onOpenInline }: { onOpenInline: () => void }) {
  const { user } = useAuth()
  const { data: trial } = useGetTrialStatusQuery()
  const dashboardUser = user as DashboardUser
  const userId = dashboardUser?.id
  const hasWheelAccess = (trial?.isActive ?? false) || (trial?.isPaid ?? false)
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId ?? '', {
    skip: !userId || !hasWheelAccess,
  })

  if (!hasWheelAccess) return null

  const now = new Date()
  const lastWheelDate = latestWheel
    ? new Date(latestWheel.completedAt ?? latestWheel.createdAt)
    : null
  const nextWheelDate = lastWheelDate
    ? new Date(lastWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null

  const needsWheel = !lastWheelDate || (nextWheelDate ? nextWheelDate <= now : false)

  if (!needsWheel) return null

  return (
    <div className={DASHBOARD_USER_CARD_SOFT}>
      <div className="p-4">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
            КОЛЕСО БАЛАНСУ
          </p>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {!lastWheelDate ? 'Пройти колесо балансу' : 'Час оновити колесо балансу'}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {!lastWheelDate
              ? 'Ще не було жодного проходження. Заповни 8 сфер і отримай новий зріз стану.'
              : `Було ${formatWheelDate(lastWheelDate)} · наступне було заплановане на ${nextWheelDate ? formatWheelDate(nextWheelDate) : '—'}`}
          </p>
        </div>
      </div>
        <div className={EDGE_ACTION_WRAP}>
        <button
          type="button"
          onClick={onOpenInline}
          className={LIQUID_FOOTER_BUTTON_PRIMARY}
        >
          Відкрити колесо →
        </button>
      </div>
    </div>
  )
}

function WheelInlineFrame({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { user } = useAuth()
  const accessToken = useAppSelector(state => state.auth.accessToken)
  const dashboardUser = user as DashboardUser
  const userId = dashboardUser?.id

  const {
    data: latestWheel,
    isLoading,
    refetch,
  } = useGetLatestWheelAssessmentQuery(userId ?? '', {
    skip: !userId || !isOpen,
    refetchOnFocus: true,
    pollingInterval: isOpen ? 30_000 : 0,
  })

  if (!isOpen || !userId) return null

  const lastWheelDate = latestWheel
    ? new Date(latestWheel.completedAt ?? latestWheel.createdAt)
    : null
  const nextWheelDate = lastWheelDate
    ? new Date(lastWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null
  const weakestId = latestWheel?.gaps?.[0]
  const strongestId = latestWheel?.strengths?.[0]
  const weakestLabel = weakestId ? (WHEEL_LABEL_MAP.get(weakestId) ?? weakestId) : '—'
  const strongestLabel = strongestId ? (WHEEL_LABEL_MAP.get(strongestId) ?? strongestId) : '—'
  const weakestEmoji = weakestId ? (WHEEL_EMOJI_MAP.get(weakestId) ?? '⚖️') : '⚖️'
  const strongestEmoji = strongestId ? (WHEEL_EMOJI_MAP.get(strongestId) ?? '✨') : '✨'
  const summaryText = latestWheel?.notes?.trim()
    ? latestWheel.notes
    : `Зараз найбільше уваги просить сфера "${weakestLabel}". Найсильніша опора — "${strongestLabel}".`

  const handleDownloadPdf = async () => {
    if (!latestWheel?.id) return
    try {
      const headers: Record<string, string> = {}
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`
      const response = await fetch(`/api/wheel/${latestWheel.id}/pdf`, {
        headers,
        credentials: 'include',
      })
      if (!response.ok) throw new Error('pdf_failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `wheel-report-${new Date().toISOString().slice(0, 10)}.pdf`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (error) {
      console.error('[Dashboard] wheel pdf failed:', error)
    }
  }

  return (
    <div className={`relative ${DASHBOARD_USER_CARD}`}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_24px_rgba(0,0,0,0.18)] transition-all hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] hover:text-[var(--text-primary)]"
        aria-label="Закрити колесо"
      >
        <X className="h-4 w-4" />
      </button>
      <div className={`flex flex-wrap items-start justify-between gap-3 p-5 ${EDGE_ACTION_TOP_WRAP}`}>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
            КОЛЕСО БАЛАНСУ
          </p>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {!latestWheel ? 'Заповни колесо прямо тут' : 'Твій зріз стану по 8 сферах'}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {!latestWheel
              ? 'Форма відкривається в кабінеті. Якщо пройдеш колесо в Telegram або miniapp, цей блок оновиться автоматично.'
              : `Було ${lastWheelDate ? formatWheelDate(lastWheelDate) : '—'} · наступне ${nextWheelDate ? formatWheelDate(nextWheelDate) : '—'}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {latestWheel && (
            <>
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-2 rounded-t-[14px] rounded-b-[18px] border-x border-b border-t-0 border-x-[rgba(var(--accent-rgb),0.12)] border-b-[rgba(255,255,255,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] px-3 py-2 text-xs text-[var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_22px_rgba(0,0,0,0.14)] transition-all hover:text-[var(--text-primary)]"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Оновити
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-t-[14px] rounded-b-[18px] border-x border-b border-t-0 border-x-[rgba(var(--accent-rgb),0.18)] border-b-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.88),rgba(var(--accent-rgb),0.72))] px-3 py-2 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_26px_rgba(0,0,0,0.16)] transition-all hover:brightness-110"
              >
                <Download className="h-3.5 w-3.5" />
                PDF звіт
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-center text-sm text-[var(--text-muted)]">
            Завантажуємо колесо балансу...
          </div>
        ) : latestWheel ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(320px,1.1fr)_minmax(280px,0.9fr)]">
            <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.12)] bg-[rgba(255,255,255,0.02)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <WheelChart scores={latestWheel.scores} size={340} />
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                  Короткий звіт
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {summaryText}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.08)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-success)]">
                    Сильна сфера
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <span>{strongestEmoji}</span>
                    <span>{strongestLabel}</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                    Сфера фокусу
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <span>{weakestEmoji}</span>
                    <span>{weakestLabel}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                  Легенда
                </p>
                <div className="space-y-2">
                  {latestWheel.scores.map(score => {
                    const label = WHEEL_LABEL_MAP.get(score.categoryId) ?? score.categoryId
                    const emoji = WHEEL_EMOJI_MAP.get(score.categoryId) ?? '•'
                    return (
                      <div key={score.categoryId} className="flex items-center justify-between gap-3 text-xs">
                        <span className="inline-flex min-w-0 items-center gap-2 text-[var(--text-secondary)]">
                          <span>{emoji}</span>
                          <span className="truncate">{label}</span>
                        </span>
                        <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-1 font-medium text-[var(--text-primary)]">
                          {score.score}/10
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <WheelForm
            userId={userId}
            onComplete={() => void refetch()}
            onCancel={onClose}
          />
        )}
      </div>

      <div className={EDGE_ACTION_WRAP}>
        <button
          type="button"
          onClick={onClose}
          className={LIQUID_FOOTER_BUTTON_ICE}
        >
          ↑ Згорнути вгору
        </button>
      </div>
    </div>
  )
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const dashboardUser = user as DashboardUser
  const userRole = useAppSelector(selectUserRole)
  const role = (userRole ?? 'USER').toUpperCase()
  const isSuperAdmin = role === 'SUPERADMIN'
  const isExpert = role === 'EXPERT' || role === 'SUPERADMIN'
  const name = dashboardUser?.firstName || dashboardUser?.name || 'Користувач'
  const needsAccentSetup = !dashboardUser?.settings?.accentColor && !hasSavedAccentColor()
  const [activeTab, setActiveTab] = useState<'session' | 'progress'>('session')
  const [showWheelFrame, setShowWheelFrame] = useState(false)

  return (
    <div className="space-y-6 p-6">
      {needsAccentSetup && (
        <GlassCard className="border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Налаштуй свій акцентний колір
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted-light)]">
                Обери колір у Налаштуваннях.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/settings?accent=1')}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] transition-colors"
            >
              Відкрити налаштування
            </button>
          </div>
        </GlassCard>
      )}

      <Greeting name={name} isExpert={isExpert} isSuperAdmin={isSuperAdmin} />

      {!isExpert && (
        <div className="space-y-5">
          <WheelStatusNotice onOpenInline={() => setShowWheelFrame(true)} />
          <WheelInlineFrame
            isOpen={showWheelFrame}
            onClose={() => setShowWheelFrame(false)}
          />
          <div className="h-px bg-[rgba(255,255,255,0.06)]" />
          <div className="overflow-x-auto no-scrollbar">
            <div className="app-tabs-shell">
            {([
              { id: 'session', label: 'Сесія', Icon: CalendarDays },
              { id: 'progress', label: 'Прогрес', Icon: BarChart3 },
            ] as const).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'app-tab',
                  activeTab === tab.id
                    ? 'app-tab-active'
                    : 'app-tab-inactive',
                ].join(' ')}
              >
                <tab.Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
            </div>
          </div>

          {activeTab === 'session' && (
            <div className="space-y-5">
              <JourneySection onOpenWheelFrame={() => setShowWheelFrame(true)} />
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                Прогрес
              </p>
              <GamificationWidget />
              <StatsGrid />
            </div>
          )}
        </div>
      )}

      {isExpert && (
        <div className="space-y-5">
          <GlassCard className="border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                {isSuperAdmin ? 'Аналітика платформи' : 'Аналітика коуча'}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {isSuperAdmin ? 'Усі коучі · всі учні' : 'Starway by Nadya · поточний період'}
              </p>
            </div>
            <ExpertStatsSection isSuperAdmin={isSuperAdmin} />
          </GlassCard>
        </div>
      )}
    </div>
  )
}
