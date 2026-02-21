// frontend/src/pages/DashboardPage.tsx
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useAbility } from '@/features/auth/utils/can'
import { ABILITIES } from '@/features/auth/utils/abilities'
import { ROUTES } from '@/config/routes'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import { hasSavedAccentColor } from '@/shared/utils/accent.utils'
import { GlassCard } from '@/ui'
import {
  ArrowRight, Lock, Zap, Target,
  TrendingUp, Calendar, Bot, BarChart2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────

type NavFn = (path: string, opts?: { requiresAuth?: boolean; requiresPaid?: boolean }) => boolean

// ─── Fallback дані ────────────────────────────────────────────────────────────

const FALLBACK_STATS = {
  streak:    3,
  actions:   5,
  progress:  '87%',
  stability: '12/14',
}

const FALLBACK_ACTIVITY = [
  { id: '1', icon: '⚖️', text: 'Завершено колесо балансу',   time: '2 год тому' },
  { id: '2', icon: '🤖', text: 'AI сесія — цілі на тиждень', time: '5 год тому' },
  { id: '3', icon: '📝', text: 'Щоденний цикл заповнено',    time: 'Вчора'      },
]

// ─── StatsGrid ────────────────────────────────────────────────────────────────

function StatsGrid() {
  const { user }  = useAuth()
  const canView   = useAbility(ABILITIES.DASHBOARD_VIEW)

  if (!canView) return null

  const s = (user as any)?.stats ?? {}

  const STATS = [
    { label: 'Streak',        value: s.streak    ?? FALLBACK_STATS.streak,    Icon: Zap,        gradient: 'from-orange-500 to-amber-500',   description: 'Днів поспіль'    },
    { label: 'Дії',           value: s.actions   ?? FALLBACK_STATS.actions,   Icon: Target,     gradient: 'from-green-500 to-emerald-500',  description: 'Цього тижня'     },
    { label: 'Прогрес',       value: s.progress  ?? FALLBACK_STATS.progress,  Icon: TrendingUp, gradient: 'from-blue-500 to-cyan-500',      description: 'Загальний'       },
    { label: 'Стабільність',  value: s.stability ?? FALLBACK_STATS.stability, Icon: Calendar,   gradient: 'from-purple-500 to-violet-500',  description: 'Днів з циклом'   },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS.map(({ label, value, Icon, gradient, description }) => (
        <GlassCard key={label} className="p-5 hover:scale-[1.02] transition-transform">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-white/70 mt-0.5">{label}</p>
          <p className="text-xs text-white/30 mt-1">{description}</p>
        </GlassCard>
      ))}
    </div>
  )
}

// ─── QuickActions ─────────────────────────────────────────────────────────────

function QuickActionsSection({ onNavigate }: { onNavigate: NavFn }) {
  const { user } = useAuth()
  const abilities = user?.abilities ?? []
  const can = (ability: string) => abilities.includes(ability as any)

  const ACTIONS = [
    { icon: '🤖', title: 'AI сесія',        desc: 'Поговори з ментором',  path: ROUTES.AI_MENTOR, paid: false, gradient: 'from-orange-500 to-pink-500',   ability: ABILITIES.MENTOR_CORE      },
    { icon: '📝', title: 'Щоденний цикл',   desc: 'Зафіксуй стан дня',   path: ROUTES.CYCLE,     paid: false, gradient: 'from-blue-500 to-cyan-500',     ability: ABILITIES.DASHBOARD_VIEW   },
    { icon: '⚖️', title: 'Колесо балансу',  desc: 'Оціни сфери життя',   path: ROUTES.WHEEL,     paid: false, gradient: 'from-purple-500 to-pink-500',   ability: ABILITIES.WHEEL_VIEW       },
    { icon: '📊', title: 'Прогрес',          desc: 'Твоя аналітика',      path: ROUTES.PROGRESS,  paid: false, gradient: 'from-green-500 to-emerald-500', ability: ABILITIES.PROGRESS_VIEW    },
    { icon: '🎯', title: 'Бачення',          desc: 'Визнач точку Б',      path: ROUTES.VISION,    paid: true,  gradient: 'from-yellow-500 to-orange-500', ability: ABILITIES.MENTOR_VISION    },
    { icon: '🎬', title: 'Zoom-сесія',       desc: 'Живе заняття',        path: ROUTES.ZOOM,      paid: true,  gradient: 'from-indigo-500 to-purple-500', ability: ABILITIES.MENTOR_ZOOM      },
  ]

  return (
    <section>
      <h2 className="text-lg font-bold text-white mb-4">Швидкі дії</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACTIONS.map(a => {
          const hasAccess = can(a.ability)
          return (
            <GlassCard
              key={a.path}
              className={`p-5 group relative overflow-hidden transition-all
                ${hasAccess ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-60 cursor-not-allowed'}`}
              onClick={() => hasAccess && onNavigate(a.path, { requiresAuth: true, requiresPaid: a.paid })}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${a.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
              {a.paid && !hasAccess && (
                <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-600/40 text-[10px] text-slate-400 font-semibold">
                  <Lock className="w-3 h-3" /> Paid
                </span>
              )}
              <div className="relative">
                <div className="text-3xl mb-3">{a.icon}</div>
                <p className="font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">{a.title}</p>
                <p className="text-xs text-white/50">{a.desc}</p>
                {hasAccess && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-orange-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
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
  const abilities = user?.abilities ?? []
  const can = (ability: string) => abilities.includes(ability as any)

  const MODULES = [
    { Icon: Bot,       title: 'AI Ментор',      desc: 'Персональний коуч 24/7',   path: ROUTES.AI_MENTOR, ability: ABILITIES.MENTOR_CORE,      gradient: 'from-orange-500 to-rose-500'   },
    { Icon: Target,    title: 'Цілі',            desc: 'Постав і досягни',         path: ROUTES.GOALS,     ability: ABILITIES.MENTOR_GOALS,     gradient: 'from-green-500 to-teal-500'    },
    { Icon: BarChart2, title: 'Аналітика',       desc: 'Глибокий аналіз прогресу', path: ROUTES.PROGRESS,  ability: ABILITIES.PROGRESS_VIEW,    gradient: 'from-blue-500 to-indigo-500'   },
    { Icon: Calendar,  title: 'Дії та рішення',  desc: 'Трекер щоденних виборів',  path: ROUTES.CYCLE,     ability: ABILITIES.MENTOR_DECISIONS, gradient: 'from-purple-500 to-pink-500'   },
  ]

  return (
    <section>
      <h2 className="text-lg font-bold text-white mb-4">Модулі</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULES.map(({ Icon, title, desc, path, ability, gradient }) => {
          const hasAccess = can(ability)
          return (
            <GlassCard
              key={path}
              className={`p-5 flex items-center gap-4 transition-all
                ${hasAccess ? 'cursor-pointer hover:scale-[1.01]' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => hasAccess && onNavigate(path, { requiresAuth: true })}
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{title}</p>
                <p className="text-xs text-white/50 mt-0.5">{desc}</p>
              </div>
              {hasAccess
                ? <ArrowRight className="w-4 h-4 text-white/30 shrink-0" />
                : <Lock      className="w-4 h-4 text-white/30 shrink-0" />
              }
            </GlassCard>
          )
        })}
      </div>
    </section>
  )
}

// ─── RecentActivity ───────────────────────────────────────────────────────────

function RecentActivitySection() {
  const { user }  = useAuth()
  const canView   = useAbility(ABILITIES.PROGRESS_VIEW)

  if (!canView) return null

  const activity = (user as any)?.recentActivity ?? FALLBACK_ACTIVITY

  return (
    <section>
      <h2 className="text-lg font-bold text-white mb-4">Остання активність</h2>
      <GlassCard className="divide-y divide-white/5">
        {activity.map(({ id, icon, text, time }: typeof FALLBACK_ACTIVITY[0]) => (
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
  const { user }       = useAuth()
  const { navigateTo } = useSmartNavigation()
  const navigate = useNavigate()
  const needsAccentSetup = !user?.settings?.accentColor && !hasSavedAccentColor()

  return (
    <div className="space-y-8 p-6">
      {needsAccentSetup && (
        <GlassCard className="border-white/20 bg-white/10 p-4">
          {/* fix_code_x: explicit post-login UX prompt to choose and persist accent color in settings. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Налаштуй свій акцентний колір</p>
              <p className="text-xs text-white/60">
                Обери колір у Налаштуваннях: список або палітра. Значення збережеться у профілі.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/settings?accent=1')}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
            >
              Відкрити налаштування
            </button>
          </div>
        </GlassCard>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">
          Привіт, {user?.firstName || user?.name || 'user'} 👋
        </h1>
        <p className="text-white/50 text-sm mt-1">Твій прогрес сьогодні</p>
      </div>

      <StatsGrid />

      <GlassCard className="p-5 border border-[color:rgba(var(--accent-rgb),0.32)] bg-[color:rgba(var(--accent-rgb),0.08)]">
        {/* fix code_x: explicit dashboard CTA to AI Generator route for quick discoverability. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Створення AI-воронки</p>
            <p className="text-xs text-white/65 mt-1">
              Відкрий AI Генератор і збудуй funnel покроково через AI Producer flow.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              navigateTo(ROUTES.AI_GENERATOR, {
                requiresAuth: true,
                requiresPaid: true,
                onAccessDenied: () =>
                  navigate(`/dashboard/subscription?from=${encodeURIComponent(ROUTES.AI_GENERATOR)}`),
              })
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[color:rgba(var(--accent-rgb),0.55)] bg-[color:rgba(var(--accent-rgb),0.22)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:rgba(var(--accent-rgb),0.32)] transition-colors whitespace-nowrap"
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span>Відкрити AI Генератор</span>
          </button>
        </div>
      </GlassCard>

      <QuickActionsSection onNavigate={navigateTo} />
      <ModulesSection      onNavigate={navigateTo} />
      <RecentActivitySection />
    </div>
  )
}
