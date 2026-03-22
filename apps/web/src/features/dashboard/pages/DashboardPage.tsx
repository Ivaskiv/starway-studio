// frontend/src/pages/DashboardPage.tsx

import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ABILITIES } from '@/features/auth/permissions/abilities'
import { useAbility } from '@/features/auth/utils/can'
import GamificationWidget from '@/features/gamification/components/GamificationWidget'
import CreateLandingForm from '@/features/landing/components/CreateLandingForm'
import LandingCards from '@/features/landing/components/LandingCards'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import InfoPage from '@/pages/InfoPage'
import { hasSavedAccentColor } from '@/theme/accent.utils'
import { GlassCard } from '@/ui'
import {
  ArrowRight,
  BarChart2,
  Bot,
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
  const canView = useAbility(ABILITIES.DASHBOARD_VIEW)
  if (!canView) return null

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
  if (isLoading || !trial?.isActive) return null

  const totalDays = trial.daysLeft + trial.currentDay
  const currentDay = trial.currentDay

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <span className="text-2xl font-bold text-[var(--accent)]">🔥 {currentDay}</span>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">день поспіль</p>
          <p className="text-xs text-[var(--text-muted)]">День {currentDay} з {totalDays} · залишилось {trial.daysLeft} дн.</p>
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
                  isDone ? 'border-[var(--color-success)] bg-[var(--color-success-bg)]' :
                  isToday ? 'border-2 border-[var(--accent)] bg-[var(--bg-secondary)]' :
                  'border-[var(--border)] opacity-40'
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
          {[
            { icon: '🌞', title: 'Ранок', sub: '7 питань · ~5 хв', status: 'done' },
            { icon: '🌙', title: 'Вечір', sub: 'Відкривається о 21:00', status: 'pending' },
            { icon: '⚖️', title: 'Колесо балансу', sub: 'Раз на місяць (+одна додаткова перегенерація+ нагадування через місяць+аналіз-звіт в профіль користувача', status: 'locked' },
          ].map(task => (
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
          <button
            className="mt-3 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:brightness-110"
            onClick={() => { window.location.href = '/dashboard/cycle' }}
          >
            ▶ Продовжити день
          </button>
        </div>
      </div>
    </section>
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

// ─── ModulesSection ───────────────────────────────────────────────────────────

function ModulesSection({ onNavigate }: { onNavigate: NavFn }) {
  const { user } = useAuth()
  const dashboardUser = user as DashboardUser
  const abilities = dashboardUser?.abilities ?? []

  const can = (ability: string) => abilities.includes(ability)

  const MODULES = [
    { Icon: Bot, title: 'AI Ментор', desc: 'Персональний коуч 24/7', path: ROUTES.AI_MENTOR, ability: ABILITIES.MENTOR_CORE, gradient: 'from-accent from-400 to-accent to-500' },
    { Icon: Target, title: 'Цілі', desc: 'Постав і досягни', path: ROUTES.GOALS, ability: ABILITIES.MENTOR_GOALS, gradient: 'from-green-400 to-teal-500' },
    { Icon: BarChart2, title: 'Аналітика', desc: 'Глибокий аналіз прогресу', path: ROUTES.PROGRESS, ability: ABILITIES.PROGRESS_VIEW, gradient: 'from-blue-400 to-indigo-500' },
    { Icon: Calendar, title: 'Дії та рішення', desc: 'Трекер щоденних виборів', path: ROUTES.CYCLE, ability: ABILITIES.MENTOR_DECISIONS, gradient: 'from-purple-400 to-pink-500' },
  ]

  return (
    <section>
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Модулі</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULES.map(({ Icon, title, desc, path, ability, gradient }) => {
          const hasAccess = can(ability)
          return (
            <GlassCard
              key={path}
              className={`p-5 flex items-center gap-4 transition-all ${hasAccess ? 'cursor-pointer hover:scale-[1.01]' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => hasAccess && onNavigate(path, { requiresAuth: true })}
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)]">{title}</p>
                <p className="text-xs text-[var(--text-muted-light)] mt-0.5">{desc}</p>
              </div>
              {hasAccess ? <ArrowRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" /> : <Lock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
            </GlassCard>
          )
        })}
      </div>
    </section>
  )
}

// ─── RecentActivitySection ────────────────────────────────────────────────────

function RecentActivitySection() {
  const { user } = useAuth()
  const canView = useAbility(ABILITIES.PROGRESS_VIEW)
  if (!canView) return null

  const dashboardUser = user as DashboardUser
  const activity = dashboardUser?.recentActivity ?? FALLBACK_ACTIVITY

  return (
    <section>
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Остання активність</h2>
      <GlassCard className="divide-y divide-[var(--border)]">
        {activity.map(({ id, icon, text, time }) => (
          <div key={id} className="flex items-center gap-3 px-5 py-4">
            <span className="text-xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{text}</p>
              <p className="text-xs text-white/40 mt-0.5">{time}</p>
            </div>
          </div>
        ))}
      </GlassCard>
    </section>
  )
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const { navigateTo } = useSmartNavigation()
  const navigate = useNavigate()
const [showCreateForm,  setShowCreateForm] = useState(false)

  const dashboardUser = user as DashboardUser
  const needsAccentSetup = !dashboardUser?.settings?.accentColor && !hasSavedAccentColor()

  return (
    <div className="space-y-8 p-6">
      {/* Акцентний колір */}
      {needsAccentSetup && (
        <GlassCard className="border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Налаштуй свій акцентний колір</p>
              <p className="text-xs text-[var(--text-muted-light)] mt-1">Обери колір у Налаштуваннях. Значення збережеться у профілі.</p>
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

      {/* Привітання */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Привіт, {dashboardUser?.firstName || dashboardUser?.name || 'user'} 👋
        </h1>
        <p className="text-sm text-[var(--text-muted-light)] mt-1">Твій прогрес сьогодні</p>
      </div>

      {/* Статистика */}
      <StatsGrid />
      <JourneySection />
      <GamificationWidget />

      {/* QuickActions + Modules */}
      <QuickActionsSection onNavigate={navigateTo} />
      <ModulesSection onNavigate={navigateTo} />

      {/* Landing Cards з кнопкою Create + Live Edit */}
{dashboardUser?.id && (
  <section className="space-y-4">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-bold text-[var(--text-primary)]">Мої лендінги</h2>
      <button
        className="px-3 py-1 rounded bg-[var(--accent)] text-black text-sm font-semibold hover:brightness-105 transition"
        onClick={() => setShowCreateForm((prev) => !prev)}
      >
        + Створити лендінг
      </button>
    </div>

    {showCreateForm && <CreateLandingForm userId={dashboardUser.id} />}
    <LandingCards userId={dashboardUser.id} />
  </section>
)}
      {/* InfoPage інтеграція */}
      <InfoPage />

      {/* Остання активність */}
      <RecentActivitySection />
    </div>
  )
}
