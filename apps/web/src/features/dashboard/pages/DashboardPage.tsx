import { ROUTES } from '@/config/routes'
import { useGetMyWeeklyReportQuery } from '@/features/ai-mentor/services/mentor.api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import ExpertDashboardView from '@/features/dashboard/components/ExpertDashboardView'
import JourneyPathBoard, {
  type JourneyStep,
  type JourneyStepId,
} from '@/features/dashboard/components/JourneyPathBoard'
import UnifiedDailyJourneyCard, {
  type UnifiedDailyJourneyStep,
} from '@/features/dashboard/components/UnifiedDailyJourneyCard'
import type { MarketingCardConfig } from '@/features/dashboard/types/dashboard.types'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import { BaseModal } from '@/features/modals/BaseModal'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import { cn } from '@/lib/utils'
import { dashboardDesignSystem } from '@/styles/design-system'
import { Card } from '@/ui'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function resolveProducerSection(pathname: string, search: string) {
  const params = new URLSearchParams(search)
  const section = params.get('section')?.trim()

  if (section) return section
  if (pathname === '/dashboard/students') return 'students'
  if (pathname === '/dashboard/leadmagnet') return 'leadmagnet'
  if (pathname === '/dashboard/ai-seo' || pathname === '/dashboard/ads')
    return 'ai-seo'
  if (pathname === '/dashboard/admin/studio') return 'content'
  return 'overview'
}

function formatTopLabel() {
  return new Date().toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function DashboardPage() {
  const modalTokens = dashboardDesignSystem.modal
  const { user } = useAuth()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { subscriptionActive, trialActive, trial } = useSystemState()
  const {
    currentStep,
    weeklyReportAvailable,
    coreProgress,
    wheelSnapshot,
    webMap,
    trialStatus,
  } = useUserProgress()
  const canLoadDeepInsights = Boolean(
    user?.id && (subscriptionActive || trialActive)
  )
  const { data: summary } = useGetSummaryQuery(undefined, {
    skip: !canLoadDeepInsights,
  })
  const { data: weeklyReport } = useGetMyWeeklyReportQuery(undefined, {
    skip: !canLoadDeepInsights,
  })
  const [expandedStep, setExpandedStep] = useState<JourneyStepId | null>(null)
  const [paywallContext, setPaywallContext] = useState<JourneyStepId | null>(
    null
  )
  const [modalRoute, setModalRoute] = useState<{
    route: string
    title: string
  } | null>(null)

  const role = String(user?.role ?? 'USER').toUpperCase()
  const isProducerView = ['EXPERT', 'ADMIN', 'SUPERADMIN'].includes(role)
  const producerSection = resolveProducerSection(pathname, search)

  console.log('Dashboard render start')
  console.log('user:', user)
  console.log('coreProgress:', coreProgress)
  console.log('trial:', trial)
  console.log('render flags:', {
    isProducerView,
    subscriptionActive,
    trialActive,
  })

  useEffect(() => {
    console.log('effect fired:', {
      userId: user?.id,
      pathname,
      search,
      isProducerView,
    })
  }, [user?.id, pathname, search, isProducerView])

  useEffect(() => {
    console.log('effect fired:', {
      coreProgress,
      currentStep,
      weeklyReportAvailable,
    })
  }, [coreProgress, currentStep, weeklyReportAvailable])

  useEffect(() => {
    console.log('effect fired:', {
      trial,
      subscriptionActive,
      trialActive,
    })
  }, [trial, subscriptionActive, trialActive])

  // [FIX] All derived vars and useMemo hooks moved above early returns — Rules of Hooks
  const displayName = user?.firstName || user?.name || 'TESTUser' // [FIX] moved above early returns
  const { streakCount, totalXp, level } = useMemo(
    () => ({
      streakCount: summary?.streak.current ?? 0,
      totalXp: summary?.xp.total ?? 0,
      level: summary?.xp.level ?? 1,
    }),
    [summary]
  )

  const trialMetrics = useMemo(() => {
    const maxTrialDays = 4
    return {
      total: Math.min(
        maxTrialDays,
        Math.max(1, trialStatus?.daysTotal ?? maxTrialDays)
      ),
      current: Math.min(
        maxTrialDays,
        Math.max(1, trialStatus?.currentDay ?? (trialStatus?.daysUsed ?? 0) + 1)
      ),
      left: Math.max(0, trialStatus?.daysLeft ?? 0),
      expired: !subscriptionActive && trialStatus?.isActive === false,
    }
  }, [trialStatus, subscriptionActive])

  const progress = useMemo(
    () => ({
      hasWheel: coreProgress?.wheelDone ?? false,
      hasGoals: coreProgress?.goalsDone ?? false,
      hasVision: coreProgress?.visionDone ?? false,
      hasCycle: (coreProgress?.cycleDays ?? 0) > 0,
      hasWebMapAccess: subscriptionActive || trialActive,
    }),
    [coreProgress, subscriptionActive, trialActive]
  )

  const completedCoreSteps = Object.values(progress).filter(Boolean).length

  const orderedGoals = useMemo(
    () =>
      [...(webMap?.goals ?? [])].sort(
        (left, right) => left.order - right.order
      ),
    [webMap?.goals]
  ) // [FIX] moved above early returns
  const journeyCoreSteps: JourneyStep[] = [
    // [FIX] moved above early returns
    {
      id: 'wheel',
      title: 'Колесо балансу',
      hint: STEP_HINTS.wheel,
      route: ROUTES.WHEEL,
      status: progress.hasWheel ? 'done' : 'active',
    },
    {
      id: 'goals',
      title: 'Цілі',
      hint: STEP_HINTS.goals,
      route: ROUTES.GOALS,
      status: !progress.hasWheel ? 'locked' : 'active',
    },
    {
      id: 'vision',
      title: 'Web Map',
      hint: STEP_HINTS.vision,
      route: ROUTES.VISION,
      status: !progress.hasGoals
        ? 'locked'
        : progress.hasVision
          ? 'done'
          : progress.hasWebMapAccess
            ? 'active'
            : 'locked',
    },
    {
      id: 'cycle',
      title: 'Щоденний цикл',
      hint: STEP_HINTS.cycle,
      route: ROUTES.CYCLE,
      status: !progress.hasVision
        ? 'locked'
        : progress.hasCycle
          ? 'done'
          : 'locked',
    },
  ] // [FIX] moved above early returns
  const unifiedSteps = useMemo<UnifiedDailyJourneyStep[]>(() => {
    // [FIX] moved above early returns
    const decisionActive = weeklyReportAvailable
    const progressActive = progress.hasCycle || weeklyReportAvailable

    return [
      {
        id: 'wheel',
        title: 'Діагностика',
        description: 'Колесо балансу',
        xp: 50,
        status: progress.hasWheel ? 'done' : 'active',
        statusLabel: progress.hasWheel ? '✔' : 'Зараз',
        onClick: () => {
          if (!wheelSnapshot) {
            navigate(ROUTES.WHEEL_START)
            return
          }
          setPaywallContext(null)
          setExpandedStep('wheel')
        },
      },
      {
        id: 'goals',
        title: 'Вибір',
        description: 'Фокус і цілі',
        xp: 40,
        status: !progress.hasWheel
          ? 'locked'
          : progress.hasGoals
            ? 'done'
            : 'active',
        statusLabel: !progress.hasWheel
          ? 'Заблоковано'
          : progress.hasGoals
            ? '✔'
            : 'Зараз',
        onClick: () => {
          if (!progress.hasWheel) {
            setPaywallContext('goals')
            return
          }
          if (progress.hasGoals) {
            navigate(ROUTES.VISION)
            return
          }
          navigate(ROUTES.GOALS)
        },
      },
      {
        id: 'morning',
        title: 'Ранок',
        description: 'Старт дня',
        xp: 20,
        status: !progress.hasGoals
          ? 'locked'
          : currentStep === 'morning'
            ? 'active'
            : progress.hasCycle
              ? 'done'
              : 'locked',
        statusLabel: !progress.hasGoals
          ? 'Заблоковано'
          : currentStep === 'morning'
            ? 'Зараз'
            : progress.hasCycle
              ? '✔'
              : '—',
        onClick: () => {
          if (!progress.hasGoals) {
            setPaywallContext('cycle')
            return
          }
          navigate(`${ROUTES.CYCLE}?session=morning`)
        },
      },
      {
        id: 'task',
        title: 'Задача',
        description: 'Дія дня',
        xp: 15,
        status: !progress.hasGoals
          ? 'locked'
          : currentStep === 'tasks'
            ? 'active'
            : currentStep === 'evening' || currentStep === 'report'
              ? 'done'
              : 'locked',
        statusLabel: !progress.hasGoals
          ? 'Заблоковано'
          : currentStep === 'tasks'
            ? 'Зараз'
            : currentStep === 'evening' || currentStep === 'report'
              ? '✔'
              : '—',
        onClick: () => {
          if (!progress.hasGoals) {
            setPaywallContext('cycle')
            return
          }
          navigate(ROUTES.MICROTASKS)
        },
      },
      {
        id: 'evening',
        title: 'Вечір',
        description: 'Завершення дня',
        xp: 15,
        status: !progress.hasGoals
          ? 'locked'
          : currentStep === 'evening' || currentStep === 'report'
            ? 'active'
            : 'locked',
        statusLabel: !progress.hasGoals
          ? 'Заблоковано'
          : currentStep === 'evening' || currentStep === 'report'
            ? 'Зараз'
            : '—',
        onClick: () => {
          if (!progress.hasGoals) {
            setPaywallContext('cycle')
            return
          }
          navigate(`${ROUTES.CYCLE}?session=evening`)
        },
      },
      ...(progressActive
        ? [
            {
              id: 'progress',
              title: 'Прогрес',
              description: 'Перші результати',
              status: weeklyReportAvailable ? 'done' : 'active',
              statusLabel: weeklyReportAvailable ? '✔' : 'Зараз',
              onClick: () => navigate(ROUTES.PROGRESS),
            } satisfies UnifiedDailyJourneyStep,
          ]
        : []),
      ...(decisionActive
        ? [
            {
              id: 'decision',
              title: 'Рішення',
              description: 'Твій наступний крок',
              status: 'active',
              statusLabel: 'Зараз',
              onClick: () => navigate(ROUTES.SUBSCRIPTION),
            } satisfies UnifiedDailyJourneyStep,
          ]
        : []),
    ]
  }, [currentStep, navigate, progress, weeklyReportAvailable, wheelSnapshot]) // [FIX] moved above early returns

  if (!user) {
    return <div className="p-6 text-sm text-white/70">Loading user...</div>
  }

  if (!coreProgress) {
    return <div className="p-6 text-sm text-white/70">Loading progress...</div>
  }

  if (isProducerView) {
    return (
      <ExpertDashboardView
        currentRole={role}
        displayName={user?.firstName || user?.name || 'Expert'}
        todayLabel={new Date().toLocaleDateString('uk-UA')}
        section={producerSection}
        metrics={[]}
        producerProducts={[]}
        generatedCards={{}}
        marketingCards={[] as MarketingCardConfig[]}
        onGenerateCard={() => {}}
      />
    )
  }

  const trialProgressPercent = Math.max(
    0,
    Math.min(100, Math.round((completedCoreSteps / 4) * 100))
  )

  const trialProgressWidthClass =
    trialProgressPercent === 0
      ? 'w-0'
      : trialProgressPercent <= 25
        ? 'w-1/4'
        : trialProgressPercent <= 50
          ? 'w-1/2'
          : trialProgressPercent <= 75
            ? 'w-3/4'
            : 'w-full'

  const handleToggleJourneyStep = (id: JourneyStepId) => {
    const step = journeyCoreSteps.find((item) => item.id === id)
    if (!step) return
    if (step.status === 'locked') {
      setPaywallContext(id)
      return
    }
    setPaywallContext(null)
    setModalRoute({
      route: `${step.route}?embedded=1`,
      title: step.title,
    })
  }

  const lockedTitle =
    paywallContext === 'vision'
      ? '✦ Web Map доступний у Pro'
      : paywallContext === 'cycle'
        ? '✦ Щоденний цикл доступний у Pro'
        : '✦ Повний шлях доступний у Pro'

  const lockedText =
    paywallContext === 'vision'
      ? "Стратегічна карта зв'язків між сферами."
      : paywallContext === 'cycle'
        ? 'Ранок → задача → вечір → паттерн.'
        : 'Розблокуй повний маршрут, щоб перейти від інсайту до стабільної системи дій.'

  try {
    // SAFE: previous layout fallback can be restored by replacing only the user-dashboard branch below.
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
          <Card className="flex flex-wrap items-center gap-3 rounded-2xl border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3.5">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] border border-[rgba(251,191,36,.22)] bg-[rgba(251,191,36,.1)]">
              <span className="h-[11px] w-[11px] rounded-full bg-[#fbbf24]" />
            </div>

            <div className="min-w-[160px] flex-1">
              <p className="mb-0.5 text-sm font-medium text-[var(--text-primary)]">
                {trialMetrics.expired
                  ? 'ABsystem Premium — Trial завершено'
                  : `ABsystem Premium — ${trialMetrics.left} день безкоштовно`}
              </p>
              <p className="mb-1.5 text-xs text-[var(--text-muted)]">
                {trialMetrics.expired
                  ? `${completedCoreSteps}/4 кроки відкрито`
                  : `День ${trialMetrics.current} з ${trialMetrics.total} · ${completedCoreSteps}/4 кроки відкрито`}
              </p>
              <div className="h-[3px] rounded-full bg-white/8">
                <div
                  className={[
                    'h-[3px] rounded-full bg-[#fbbf24] transition-all duration-700',
                    trialProgressWidthClass,
                  ].join(' ')}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(ROUTES.SUBSCRIPTION)}
              className="shrink-0 rounded-xl border border-[var(--border-accent)] bg-[rgba(var(--accent-rgb),0.12)] px-4 py-2 text-sm font-medium text-[rgb(var(--accent-soft-rgb))] transition-colors hover:bg-[rgba(var(--accent-rgb),0.2)]"
            >
              Переглянути плани →
            </button>
          </Card>

          {/* SAFE: temporarily disabled to isolate dashboard flicker source */}
          {false ? (
            <UnifiedDailyJourneyCard
              dateLabel={formatTopLabel()}
              displayName={displayName}
              streakCount={streakCount}
              totalXp={totalXp}
              trialLabel={
                trialMetrics.expired
                  ? 'Trial завершено'
                  : `Trial · день ${trialMetrics.current} з ${trialMetrics.total}`
              }
              currentDay={trialMetrics.current}
              totalDays={trialMetrics.total}
              daysLeft={trialMetrics.left}
              steps={unifiedSteps}
            />
          ) : null}

          {paywallContext ? (
            <Card className="rounded-2xl border-[rgba(251,191,36,.18)] bg-[rgba(251,191,36,.06)] px-3 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex-1">
                  <p className="mb-0.5 text-sm font-medium text-[#fbbf24]">
                    {lockedTitle}
                  </p>
                  <p className="text-xs leading-snug text-[var(--text-muted)]">
                    {lockedText}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.SUBSCRIPTION)}
                  className="flex-shrink-0 whitespace-nowrap rounded-xl border border-[rgba(251,191,36,.28)] bg-[rgba(251,191,36,.12)] px-3 py-2 text-xs font-medium text-[#fbbf24] transition-colors hover:bg-[rgba(251,191,36,.22)]"
                >
                  Відкрити
                </button>
              </div>
            </Card>
          ) : null}

          <JourneyPathBoard
            steps={journeyCoreSteps}
            expandedStep={expandedStep}
            onToggleStep={handleToggleJourneyStep}
            onLockedStep={(id) => setPaywallContext(id)}
            wheel={wheelSnapshot}
            goals={orderedGoals}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="rounded-2xl border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)]">
                  01 · Ритм
                </span>
                <span className="rounded-full bg-emerald-600/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  Активно
                </span>
              </div>
              <div className="h-[2px] rounded-full bg-white/8">
                <div className="h-[2px] w-[18%] rounded-full bg-[#4f8ef7]" />
              </div>
              <p className="mt-4 text-[10px] uppercase tracking-[.16em] text-[rgb(var(--accent-soft-rgb))]">
                Ритм
              </p>
              <h3 className="mt-2 text-lg font-medium text-[var(--text-primary)]">
                Твій темп сьогодні
              </h3>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'XP', value: totalXp },
                  { label: 'Серія', value: streakCount },
                  { label: 'Рівень', value: level },
                ].map((item) => (
                  <Card
                    key={item.label}
                    className="rounded-xl border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.08)] px-2 py-3 text-center shadow-none"
                  >
                    <div className="text-2xl font-semibold text-[var(--text-primary)]">
                      {item.value}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[.18em] text-[var(--text-muted)]">
                      {item.label}
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            <Card className="rounded-2xl border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)]">
                  02 · Контекст
                </span>
                <span className="rounded-full bg-emerald-600/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  {weeklyReportAvailable ? 'Готово' : 'Активно'}
                </span>
              </div>
              <div className="h-[2px] rounded-full bg-white/8">
                <div className="h-[2px] w-[35%] rounded-full bg-[#4f8ef7]" />
              </div>
              <p className="mt-4 text-[10px] uppercase tracking-[.16em] text-[rgb(var(--accent-soft-rgb))]">
                Тиждень
              </p>
              <h3 className="mt-2 text-lg font-medium text-[var(--text-primary)]">
                {weeklyReportAvailable
                  ? 'Тижневий звіт доступний'
                  : 'Звіт відкриється після 7 днів'}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {weeklyReport?.summaryText?.trim() ||
                  'Тиждень був тихішим, але система зберегла контекст і напрям.'}
              </p>
              <button
                type="button"
                onClick={() => navigate(ROUTES.PROGRESS)}
                className={cn(
                  dashboardDesignSystem.buttons.ghost,
                  'mt-4 h-11 min-w-0 w-fit rounded-xl px-4 py-2 text-sm'
                )}
              >
                Відкрити звіт
              </button>
            </Card>
          </div>
        </div>

        <BaseModal
          isOpen={Boolean(modalRoute)}
          onClose={() => setModalRoute(null)}
          overlayClassName={modalTokens.overlay}
          containerClassName={modalTokens.container}
          panelClassName={modalTokens.panel}
        >
          <div className={modalTokens.shell}>
            <div className={modalTokens.header}>
              <div className="min-w-0">
                <p className={modalTokens.headerKicker}>Journey Step</p>
                <p className={modalTokens.headerTitle}>
                  {modalRoute?.title ?? 'Крок'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalRoute(null)}
                aria-label="Закрити модалку"
                className={modalTokens.closeButton}
              >
                ×
              </button>
            </div>

            <div className={modalTokens.body}>
              {modalRoute ? (
                <div className={modalTokens.frameWrap}>
                  <iframe
                    key={modalRoute.route}
                    title={modalRoute.title}
                    src={modalRoute.route}
                    className={modalTokens.frame}
                  />
                </div>
              ) : null}
            </div>

            <div className={modalTokens.footer}>
              <button
                type="button"
                onClick={() => {
                  if (!modalRoute) return
                  navigate(modalRoute.route.replace('?embedded=1', ''))
                }}
                className={dashboardDesignSystem.buttons.gold}
              >
                Відкрити крок →
              </button>
            </div>
          </div>
        </BaseModal>
      </main>
    )
  } catch (error) {
    console.error('Dashboard crash', error)
    return <div className="p-6 text-sm text-white/70">Dashboard error</div>
  }
}

const STEP_HINTS: Record<JourneyStepId, string> = {
  wheel: 'Діагностика · 8 сфер',
  goals: 'Фокус · пріоритет · напрям',
  vision: "Зв'язки · ресурси · обмеження",
  cycle: 'СТАН → ЦІЛЬ → ВИБІР → ДІЯ',
}
