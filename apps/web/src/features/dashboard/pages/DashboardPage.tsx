// frontend/src/pages/DashboardPage.tsx

import { ROUTES } from '@/config/routes'
import { useAppSelector } from '@/app/hooks'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ABILITIES } from '@/features/auth/permissions/abilities'
import { selectUserRole } from '@/features/auth/services/auth.slice'
import { useAbility } from '@/features/auth/utils/can'
import GamificationWidget from '@/features/gamification/components/GamificationWidget'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { hasSavedAccentColor } from '@/theme/accent.utils'
import { GlassCard } from '@/ui'
import {
  ArrowRight,
  Calendar,
  Lock,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type NavFn = (
  path: string,
  opts?: { requiresAuth?: boolean; requiresPaid?: boolean }
) => boolean

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

// ─── StatsGrid ─────────────────────────────────────────────────────────────

function StatsGrid() {
  const { user } = useAuth()
  useAbility(ABILITIES.DASHBOARD_VIEW)

  const dashboardUser = user as DashboardUser
  const stats = dashboardUser?.stats ?? FALLBACK_STATS

  const STATS = [
    { label: 'Streak', value: stats.streak ?? FALLBACK_STATS.streak, Icon: Zap, gradient: 'from-accent from-400 to-accent to-500', description: 'Днів поспіль' },
    { label: 'Дії', value: stats.actions ?? FALLBACK_STATS.actions, Icon: Target, gradient: 'from-green-400 to-emerald-500', description: 'Цього тижня' },
    { label: 'Прогрес', value: stats.progress ?? FALLBACK_STATS.progress, Icon: TrendingUp, gradient: 'from-blue-400 to-cyan-500', description: 'Загальний' },
    { label: 'Стабільність', value: stats.stability ?? FALLBACK_STATS.stability, Icon: Calendar, gradient: 'from-purple-400 to-violet-500', description: 'Днів з циклом' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS.map(({ label, value, Icon, gradient, description }) => (
        <GlassCard key={label} className="p-5 hover:scale-[1.02] transition-transform">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{label}</p>
          <p className="text-xs text-[var(--text-muted-light)] mt-1">{description}</p>
        </GlassCard>
      ))}
    </div>
  )
}

function JourneySection() {
  const { data: trial, isLoading } = useGetTrialStatusQuery()
  const navigate = useNavigate()
  if (isLoading) return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center">
      <p className="text-sm text-[var(--text-muted)]">Завантажуємо твій шлях...</p>
    </div>
  )

  const hasEverStarted = !!(trial?.startedAt ?? trial?.currentDay)
  const isTrialExpired = !trial?.isActive && hasEverStarted
  const isPaid = trial?.isPaid ?? false
  const isLocked = isTrialExpired && !isPaid
  const hasNoTrial = !trial?.isActive && !hasEverStarted
  const totalDays = (trial?.daysLeft ?? 0) + (trial?.currentDay ?? 1)
  const currentDay = trial?.currentDay ?? 1
  const isJustStarted = (trial?.currentDay ?? 0) === 1 && (trial?.progress ?? 0) < 5
  const now = new Date()
  const isMorningDone = false
  const isEveningDone = false
  const isAfterMorning = now.getHours() >= 9
  const isAfterEvening = now.getHours() >= 21

  if (hasNoTrial) return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="p-5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
          МІЙ ШЛЯХ
        </p>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          Розпочни свій шлях ✦
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          7 днів безкоштовно — ранкові питання, вечірня рефлексія,
          колесо балансу та AI аналіз твого стану.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { icon: '🌞', label: 'Ранкові питання', sub: 'щодня о 09:00' },
            { icon: '🌙', label: 'Вечірня рефлексія', sub: 'щодня о 21:00' },
            { icon: '⚖️', label: 'Колесо балансу', sub: 'раз на місяць' },
          ].map(item => (
            <div
              key={item.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 text-center"
            >
              <span className="text-2xl">{item.icon}</span>
              <p className="mt-2 text-xs font-medium text-[var(--text-primary)]">{item.label}</p>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{item.sub}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:brightness-110"
          onClick={() => navigate('/dashboard/ai-mentor')}
        >
          ▶ Розпочати 7 днів безкоштовно
        </button>
      </div>
    </div>
  )

  const tasks = [
    {
      icon: '🌞',
      title: 'Ранкові питання',
      sub: '6 питань · ~5 хв',
      status: isMorningDone ? 'done' : isAfterMorning ? 'pending' : 'locked',
      path: '/dashboard/cycle?session=morning',
    },
    {
      icon: '🌙',
      title: 'Вечірня рефлексія',
      sub: 'Афірмації + підсумок дня',
      status: isEveningDone ? 'done' : isAfterEvening ? 'pending' : 'locked',
      path: '/dashboard/cycle?session=evening',
    },
    {
      icon: '⚖️',
      title: 'Колесо балансу',
      sub: (trial?.hasDay4Mirror ?? false) ? 'Наступне через 27 дн.' : 'День 4 — перший аналіз',
      status: (trial?.hasDay4Mirror ?? false) ? 'done' : currentDay >= 4 ? 'pending' : 'locked',
      path: '/dashboard/wheel',
    },
  ] as const

  const nextTask = tasks.find(task => task.status === 'pending') ?? tasks[0]

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
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="bg-[var(--accent-bg,var(--bg-secondary))] p-5">
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
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-primary,var(--bg-secondary))] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{p.plan}</p>
                  <p className="text-xs text-[var(--text-muted)]">{p.desc}</p>
                </div>
                <span className="text-lg font-bold text-[var(--accent)]">{p.price}</span>
              </div>
            ))}
            <button
              type="button"
              className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:brightness-110"
              onClick={() => navigate('/dashboard/subscription')}
            >
              Продовжити шлях →
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <span className="text-2xl font-bold text-[var(--accent)]">🔥 {currentDay}</span>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">день поспіль</p>
          <p className="text-xs text-[var(--text-muted)]">День {currentDay} з {totalDays} · залишилось {trial?.daysLeft ?? 0} дн.</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          {Array.from({ length: Math.min(totalDays, 7) }).map((_, i) => {
            const day = i + 1
            const isDone = day < currentDay
            const isToday = day === currentDay
            return (
              <div
                key={day}
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-all',
                  isDone ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' :
                  isToday ? 'bg-[var(--accent)] text-white' :
                  'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                ].join(' ')}
              >
                {isDone ? '✓' : day}
              </div>
            )
          })}
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2" style={{ width: 'max-content' }}>
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1
            const isDone = day < currentDay
            const isToday = day === currentDay
            return (
              <div
                key={day}
                className={[
                  'w-14 flex-shrink-0 rounded-xl border p-2 text-center transition-all',
                  isLocked
                    ? 'border-[var(--border)] opacity-30 grayscale'
                    : isDone
                      ? 'border-[var(--color-success)] bg-[var(--color-success-bg)]'
                      : isToday
                        ? 'border-2 border-[var(--accent)] bg-[var(--bg-secondary)]'
                        : 'border-[var(--border)] opacity-40'
                ].join(' ')}
              >
                <div
                  className={[
                    'text-base font-medium',
                    isDone ? 'text-[var(--color-success)]' :
                    isToday ? 'text-[var(--accent)]' :
                    'text-[var(--text-muted)]'
                  ].join(' ')}
                >
                  {day}
                </div>
                <div className="text-[9px] text-[var(--text-muted)]">
                  {isDone ? 'готово' : isToday ? 'зараз' : '🔒'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="bg-[var(--accent-bg,var(--bg-secondary))] p-5">
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
            <div key={task.title} className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--bg-tertiary)] text-sm">
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
                  'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                ].join(' ')}
              >
                {task.status === 'done' ? '✓ Готово' :
                  task.status === 'pending' ? 'Сьогодні' : '🔒'}
              </span>
            </div>
          ))}
          {!isLocked ? (
            <button
              className="mt-3 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:brightness-110"
              onClick={() => navigate(nextTask.path)}
            >
              ▶ Продовжити день
            </button>
          ) : (
            <button
              className="mt-3 w-full rounded-xl border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.08)] py-3 text-sm font-medium text-[var(--accent)] transition-all hover:bg-[rgba(var(--accent-rgb),0.15)]"
              onClick={() => navigate('/dashboard/subscription')}
            >
              Розблокувати доступ →
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function Greeting({ name, isExpert, isSuperAdmin }: { name: string; isExpert: boolean; isSuperAdmin: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          {isSuperAdmin ? 'SuperAdmin' : isExpert ? 'Кабінет коуча' : 'Мій кабінет'}
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
            ? 'Повний доступ — всі коучі та учні'
            : isExpert
              ? 'Starway by Nadya — панель коуча'
              : 'Твій особистий простір зростання та трансформації'}
        </p>
      </div>
      <span
        className={[
          'mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
          isSuperAdmin
            ? 'border-[var(--accent)] bg-[var(--accent-bg,var(--bg-secondary))] text-[var(--accent)]'
            : isExpert
              ? 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)]',
        ].join(' ')}
      >
        {isSuperAdmin ? '⭐ SuperAdmin' : isExpert ? '🎓 Коуч' : '🌱 Учень'}
      </span>
    </div>
  )
}

// ─── QuickActionsSection ──────────────────────────────────────────────────────

function QuickActionsSection({ onNavigate }: { onNavigate: NavFn }) {
  const { user } = useAuth()
  const dashboardUser = user as DashboardUser
  const abilities = dashboardUser?.abilities ?? []

  const can = (ability: string) => abilities.includes(ability)

  const ACTIONS = [
    { icon: '🤖', title: 'AI сесія', desc: 'Поговори з ментором', path: ROUTES.AI_MENTOR, paid: false, gradient: 'from-accent from-400 to-accent to-500', ability: ABILITIES.MENTOR_CORE },
    { icon: '📝', title: 'Щоденний цикл', desc: 'Зафіксуй стан дня', path: ROUTES.CYCLE, paid: false, gradient: 'from-blue-400 to-cyan-500', ability: ABILITIES.DASHBOARD_VIEW },
    { icon: '⚖️', title: 'Колесо балансу', desc: 'Оціни сфери життя', path: ROUTES.WHEEL, paid: false, gradient: 'from-purple-400 to-pink-500', ability: ABILITIES.WHEEL_VIEW },
    { icon: '📊', title: 'Прогрес', desc: 'Твоя аналітика', path: ROUTES.PROGRESS, paid: false, gradient: 'from-green-400 to-emerald-500', ability: ABILITIES.PROGRESS_VIEW },
    { icon: '🎯', title: 'Бачення', desc: 'Визнач точку Б', path: ROUTES.VISION, paid: true, gradient: 'from-yellow-400 to-orange-500', ability: ABILITIES.MENTOR_VISION },
    { icon: '🎬', title: 'Zoom-сесія', desc: 'Живе заняття', path: ROUTES.ZOOM, paid: true, gradient: 'from-indigo-400 to-purple-500', ability: ABILITIES.MENTOR_ZOOM },
  ]

  return (
    <section>
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Швидкі дії</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACTIONS.map((a) => {
          const hasAccess = can(a.ability)
          return (
            <GlassCard
              key={a.path}
              className={`p-5 group relative overflow-hidden transition-all ${hasAccess ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-60 cursor-not-allowed'}`}
              onClick={() => hasAccess && onNavigate(a.path, { requiresAuth: true, requiresPaid: a.paid })}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${a.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
              {a.paid && !hasAccess && (
                <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[10px] text-[var(--text-muted)] font-semibold">
                  <Lock className="w-3 h-3" /> Paid
                </span>
              )}
              <div className="relative">
                <div className="text-3xl mb-3">{a.icon}</div>
                <p className="font-bold text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent)] transition-colors">{a.title}</p>
                <p className="text-xs text-[var(--text-muted-light)]">{a.desc}</p>
                {hasAccess && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-[var(--accent)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Відкрити <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            </GlassCard>
          )
        })}
      </div>
    </section>
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
          { label: 'Лідмагніт', value: '—', pct: 100 },
          { label: 'Реєстрація', value: '—', pct: 60 },
          { label: 'Активація', value: '—', pct: 40 },
          { label: 'Підписка', value: '—', pct: 13 },
        ].map(f => (
          <div key={f.label} className="mb-3 flex items-center gap-3">
            <span className="w-24 flex-shrink-0 text-xs text-[var(--text-muted)]">{f.label}</span>
            <div className="h-1.5 flex-1 rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${f.pct}%` }}
              />
            </div>
            <span className="w-6 text-right text-xs text-[var(--text-muted)]">{f.value}</span>
          </div>
        ))}
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          AI Producer — рекомендації
        </h2>
        {[
          { icon: '🎯', text: 'Підключіть аналітику щоб побачити рекомендації' },
          { icon: '📣', text: 'Дані з\'являться після першого деплою воронки' },
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

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const { navigateTo } = useSmartNavigation()
  const navigate = useNavigate()

  const dashboardUser = user as DashboardUser
  const userRole = useAppSelector(selectUserRole)
  const role = (userRole ?? 'USER').toUpperCase()
  const isSuperAdmin = role === 'SUPERADMIN'
  const isExpert = role === 'EXPERT' || role === 'SUPERADMIN'
  const name = dashboardUser?.firstName || dashboardUser?.name || 'Користувач'
  const needsAccentSetup = !dashboardUser?.settings?.accentColor && !hasSavedAccentColor()
  const [activeTab, setActiveTab] = useState<'session' | 'products' | 'progress'>('session')

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
          <div className="flex gap-2 border-b border-[var(--border)] pb-1">
            {([
              { id: 'session', label: 'Сесія', icon: '📅' },
              { id: 'products', label: 'Продукти', icon: '🎁' },
              { id: 'progress', label: 'Прогрес', icon: '↗' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.12)] text-[var(--text-primary)]'
                    : 'border border-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                <span className="text-sm">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'session' && (
            <div className="space-y-5">
              <StatsGrid />
              <JourneySection />
              <QuickActionsSection onNavigate={navigateTo} />
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                Всі продукти
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { tag: 'free', tagLabel: 'Безкоштовно', title: '5 точок опори', price: 'практикум', path: '/dashboard/courses', locked: false },
                  { tag: 'trial', tagLabel: 'Тріал', title: 'Система 21', price: '33€ · 21 день', path: '/dashboard/courses', locked: false },
                  { tag: 'paid', tagLabel: '33€', title: 'Страхи', price: '30 днів', path: '/dashboard/subscription', locked: true },
                  { tag: 'paid', tagLabel: '33€', title: 'Код змін', price: '30 днів', path: '/dashboard/subscription', locked: true },
                  { tag: 'paid', tagLabel: '10€', title: 'Стан — ключ до успіху', price: '14 днів', path: '/dashboard/subscription', locked: true },
                  { tag: 'paid', tagLabel: '150€', title: 'Консультація з Надею', price: '60 хв', path: 'https://t.me/Nadya2316', locked: true },
                ].map(p => (
                  <GlassCard
                    key={p.title}
                    className={[
                      'cursor-pointer p-5 transition-all hover:scale-[1.01]',
                      p.locked ? 'opacity-60' : '',
                      p.tag === 'free' ? 'border-[var(--color-success)]' : '',
                    ].join(' ')}
                    onClick={() => p.path.startsWith('http')
                      ? window.open(p.path, '_blank')
                      : navigate(p.path)}
                  >
                    <span
                      className={[
                        'mb-3 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        p.tag === 'free' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' :
                        p.tag === 'trial' ? 'bg-[var(--color-info-bg,var(--bg-tertiary))] text-[var(--accent)]' :
                        'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
                      ].join(' ')}
                    >
                      {p.locked ? '🔒 ' : ''}{p.tagLabel}
                    </span>
                    <p className="font-semibold text-[var(--text-primary)]">{p.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{p.price}</p>
                    {p.locked && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); navigate('/dashboard/subscription') }}
                        className="mt-3 w-full rounded-lg border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.08)] py-1.5 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[rgba(var(--accent-rgb),0.15)]"
                      >
                        Відкрити доступ →
                      </button>
                    )}
                  </GlassCard>
                ))}
              </div>
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
