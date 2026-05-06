import { memo, useEffect, useMemo, useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Lock, Sparkles } from 'lucide-react'

import { ROUTES } from '@/config/routes'
import { cn } from '@/lib/utils'
import { useAppFlowStore } from '@/features/app/useAppFlowStore'
import { useTrackFrontendEventMutation } from '@/features/analytics/services/events.api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { dashboardDesignSystem } from '@/styles/design-system'
import { getProgressWidthClass } from '@/features/wheel/utils/progressBar'
import type { MonthPlan, WebMapGoal } from '@/features/web-map/services/web-map.api'
import { useUpdateGoalProgressMutation } from '@/features/web-map/services/web-map.api'

import { CoachTab } from '../components/tabs/CoachTab'
import { VisionSystemGraph } from '../components/VisionSystemGraph'
import { GoalsTab } from '../components/tabs/GoalsTab'
import { MonthsTab } from '../components/tabs/MonthsTab'
import { useVisionPage } from '../hooks/useVisionPage'
import type { ActiveTab } from '../types/vision.types'

type VisionEvent =
  | { type: 'FOCUS_SET'; sphere: string | null }
  | { type: 'HOVER_SET'; sphere: string | null }
  | { type: 'GOAL_SET'; goalId: string | null }
  | { type: 'MONTH_PLAN_SET'; plan: MonthPlan | null }
  | { type: 'DAY_ACTION_SET'; action: string | null }
  | { type: 'DAY_RESULT_SET'; result: 'done' | 'not_started' | 'postponed' | 'dropped' | null }
  | { type: 'DATA_UPDATE'; data: { weakestSphere: string | null; goalId: string | null; plan: MonthPlan | null; action: string | null } }

type VisionState = {
  activeSphere: string | null
  hoveredSphere: string | null
  goalId: string | null
  monthPlan: MonthPlan | null
  dayAction: string | null
  dayResult: 'done' | 'not_started' | 'postponed' | 'dropped' | null
  skipHistory: Array<'not_started' | 'postponed' | 'dropped'>
}

const TAB_LABELS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'goals', label: 'Цілі' },
  { id: 'months', label: 'Місяці' },
  { id: 'analysis', label: 'Аналіз' },
  { id: 'coach', label: 'Коуч' },
]
const USER_IDENTITY_KEY = 'starway_user_identity_v1'
const USER_IDENTITY_LOCK_KEY = 'starway_user_identity_locked_v1'
const IMPACT_MAP: Record<string, string[]> = {
  finance: ['freedom', 'mind'],
  career: ['finance', 'selfDevelopment'],
  relationships: ['energy', 'mind'],
  energy: ['career', 'selfDevelopment'],
  freedom: ['energy', 'relationships'],
  mind: ['freedom', 'career'],
  health: ['energy', 'freedom'],
  selfDevelopment: ['career', 'finance'],
}
const initialState: VisionState = {
  activeSphere: null,
  hoveredSphere: null,
  goalId: null,
  monthPlan: null,
  dayAction: null,
  dayResult: null,
  skipHistory: [],
}

const visionTokens = dashboardDesignSystem.vision

function visionReducer(state: VisionState, event: VisionEvent): VisionState {
  switch (event.type) {
    case 'FOCUS_SET': return { ...state, activeSphere: event.sphere }
    case 'HOVER_SET': return { ...state, hoveredSphere: event.sphere }
    case 'GOAL_SET': return { ...state, goalId: event.goalId }
    case 'MONTH_PLAN_SET': return { ...state, monthPlan: event.plan }
    case 'DAY_ACTION_SET': return { ...state, dayAction: event.action }
    case 'DAY_RESULT_SET':
      return event.result && event.result !== 'done'
        ? { ...state, dayResult: event.result, skipHistory: [...state.skipHistory.slice(-6), event.result] }
        : { ...state, dayResult: event.result }
    case 'DATA_UPDATE':
      return { ...state, activeSphere: state.activeSphere ?? event.data.weakestSphere, goalId: state.goalId ?? event.data.goalId, monthPlan: state.monthPlan ?? event.data.plan, dayAction: state.dayAction ?? event.data.action }
    default: return state
  }
}

function mapSphereToGoal(sphere: string | null, goals: WebMapGoal[]) {
  if (!sphere) return goals[0] ?? null
  return goals.find((goal) => goal.sphere === sphere) ?? goals[0] ?? null
}

function buildMonthPlan(goal: WebMapGoal | null, plans: MonthPlan[]) {
  if (!goal) return plans[0] ?? null
  return plans.find((plan) => plan.goalIds.includes(goal.id)) ?? plans[0] ?? null
}

function pickTodayAction(plan: MonthPlan | null, goal: WebMapGoal | null) {
  if (plan?.actions.length) return plan.actions[new Date().getDate() % plan.actions.length] ?? plan.actions[0] ?? null
  return goal?.actions[0] ?? null
}

const Card = memo(function Card({ title, description, tone = 'default' }: { title: string; description: string; tone?: 'default' | 'critical' | 'success' }) {
  return (
    <div className={['rounded-3xl border p-4', tone === 'critical' ? 'border-rose-500/20 bg-rose-500/10' : tone === 'success' ? 'border-emerald-500/20 bg-emerald-500/10' : visionTokens.defaultCard].join(' ')}>
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/78">{description}</p>
    </div>
  )
})

export default function VisionPage() {
  const { user } = useAuth()
  const vm = useVisionPage()
  const navigate = useNavigate()
  const completeVision = useAppFlowStore((s) => s.completeVision)
  const [state, dispatch] = useReducer(visionReducer, initialState)
  const [updateGoalProgress, updateGoalProgressState] = useUpdateGoalProgressMutation()
  const [trackFrontendEvent] = useTrackFrontendEventMutation()
  const storedIdentity = typeof window !== 'undefined'
    ? window.localStorage.getItem(USER_IDENTITY_KEY)?.trim() ?? ''
    : ''
  const identityLocked = typeof window !== 'undefined'
    ? window.localStorage.getItem(USER_IDENTITY_LOCK_KEY) === 'true'
    : false

  const wheelScores = useMemo(() => vm.latestWheel?.scores ?? [], [vm.latestWheel])
  const weakestSphere = useMemo(() => [...wheelScores].sort((a, b) => a.score - b.score)[0]?.categoryId ?? null, [wheelScores])
  const systemScore = useMemo(() => {
    if (!wheelScores.length) return 0
    const values = wheelScores.map((item) => item.score)
    return 10 - (Math.max(...values) - Math.min(...values))
  }, [wheelScores])
  const goal = useMemo(() => mapSphereToGoal(state.activeSphere ?? weakestSphere, vm.goals.goals), [state.activeSphere, vm.goals.goals, weakestSphere])
  const monthPlan = useMemo(() => buildMonthPlan(goal, vm.months.months), [goal, vm.months.months])
  const todayAction = useMemo(() => pickTodayAction(monthPlan, goal), [goal, monthPlan])
  const impactChain = useMemo(() => IMPACT_MAP[state.activeSphere ?? weakestSphere ?? ''] ?? [], [state.activeSphere, weakestSphere])
  const shouldShowUpgradeCta = Boolean(vm.trialActive && !vm.subscriptionActive && (vm.trial?.daysLeft ?? 0) <= 1)
  const orderedGoals = useMemo(
    () => [...vm.goals.goals].sort((a, b) => a.order - b.order),
    [vm.goals.goals]
  )
  const currentStepIndex = useMemo(() => {
    const nextIndex = orderedGoals.findIndex((item) => item.progress < 100)
    return nextIndex >= 0 ? nextIndex : Math.max(orderedGoals.length - 1, 0)
  }, [orderedGoals])
  const completedGoals = useMemo(
    () => orderedGoals.filter((item) => item.progress >= 100).length,
    [orderedGoals]
  )
  const completionPercent = orderedGoals.length
    ? Math.round((completedGoals / orderedGoals.length) * 100)
    : 0
  const completionWidthClass = getProgressWidthClass(completionPercent)
  const currentIdentity = identityLocked && storedIdentity ? storedIdentity : vm.header.identity?.trim() ?? storedIdentity
  const { userBehavior } = vm.progress
  const system = vm.webMap?.system ?? null
  const handleCompleteGoal = async (goalItem: WebMapGoal) => {
    if (goalItem.progress >= 100 || updateGoalProgressState.isLoading) return

    try {
      await updateGoalProgress({
        id: goalItem.id,
        progress: 100,
        status: 'completed',
      }).unwrap()
      if (completedGoals === 0) {
        void trackFrontendEvent({
          userId: user?.id ?? null,
          type: 'founder_web_map_first_step_completed',
          source: 'web',
          state: 'vision',
        })
      }
    } catch {
      // keep page stable; mutation errors already handled elsewhere if needed
    }
  }

  useEffect(() => {
    dispatch({ type: 'DATA_UPDATE', data: { weakestSphere, goalId: goal?.id ?? null, plan: monthPlan, action: todayAction } })
  }, [goal?.id, monthPlan, todayAction, weakestSphere])

  useEffect(() => {
    if (!vm.webMap || vm.isDraft || vm.locked) return
    void trackFrontendEvent({
      userId: user?.id ?? null,
      type: 'founder_web_map_opened',
      source: 'web',
      state: 'vision',
    })
  }, [trackFrontendEvent, user?.id, vm.isDraft, vm.locked, vm.webMap])

  if (vm.locked) {
    return (
      <div className={visionTokens.section}>
        <p className={visionTokens.overline}>Доступ потрібен</p>
        <h1 className={visionTokens.titleLg}>WEB-Карта доступна після підключення доступу</h1>
        <p className={visionTokens.body}>
          Тут відкривається наступний крок після цілей: місячний фокус, щоденна дія і системний ритм.
        </p>
        <button
          type="button"
          onClick={() => navigate(ROUTES.SUBSCRIPTION)}
          className="hero-cta-primary mt-6 rounded-2xl px-5 py-3 text-sm font-medium"
        >
          Переглянути плани доступу
        </button>
      </div>
    )
  }
  if (vm.loading) return <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white">Завантаження...</div>
  if (!vm.webMap || vm.isDraft) {
    return (
      <vm.Setup
        onComplete={() => {
          completeVision()
        }}
      />
    )
  }

  return (
    <div className={visionTokens.shell}>
      {shouldShowUpgradeCta ? (
        <section className={visionTokens.trialBanner}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={visionTokens.microLabel}>Trial добігає кінця</p>
              <p className={visionTokens.body}>Залишився {vm.trial?.daysLeft ?? 0} день. Щоб не втратити доступ до WEB-Карти та наступних кроків, продовжи доступ зараз.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.SUBSCRIPTION)}
              className={visionTokens.ctaSoft}
            >
              Переглянути плани доступу
            </button>
          </div>
        </section>
      ) : null}

      <section className={visionTokens.section}>
        <p className={visionTokens.overline}>Твоя карта розвитку</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className={visionTokens.titleLg}>Побудована на основі твого стану та цілей</h1>
            <p className={visionTokens.body}>
              Твоя система нестабільна через сферу «{goal?.title ?? weakestSphere ?? 'сфера'}». Почни звідси.
            </p>
          </div>

          <div className={visionTokens.pillLg}>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-white/40" />
              <span>Редагування завершено</span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>Прогрес карти</span>
            <span>{completedGoals}/{orderedGoals.length || 0} · Імпульс {userBehavior.momentumLevel}%</span>
          </div>
          <div className={visionTokens.progressTrack}>
            <div className={[visionTokens.progressFill, completionWidthClass].join(' ')} />
          </div>
          {userBehavior.riskLevel !== 'low' ? (
            <p className="mt-3 text-xs text-white/60">
              {userBehavior.riskLevel === 'high'
                ? 'Прогрес починає руйнуватись. Повернись до одного наступного кроку сьогодні.'
                : 'Ти близько до втрати ритму. Один крок зараз збереже темп.'}
            </p>
          ) : userBehavior.momentumLevel >= 70 ? (
            <p className="mt-3 text-xs text-emerald-300/80">
              Ти в потоці. Саме зараз найкраще рухатись далі.
            </p>
          ) : null}
        </div>
      </section>

      <section className={visionTokens.section}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={visionTokens.overlineSoft}>Шлях змін</p>
            <h2 className={visionTokens.titleMd}>Від слабкої точки до стабільної системи</h2>
          </div>
          <div className={visionTokens.pill}>
            {completionPercent}% виконано
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-stretch">
          {orderedGoals.map((goalItem, index) => {
            const isCurrent = index === currentStepIndex
            const isDone = goalItem.progress >= 100
            const isFuture = index > currentStepIndex && !isDone
            const tag = index === 0 ? 'today' : index === 1 ? 'week' : 'month'

            return (
              <div key={goalItem.id} className="flex min-w-0 flex-1 items-stretch gap-4">
                <article
                  className={[
                    'relative flex flex-1 flex-col rounded-2xl border p-4 transition-all duration-200',
                    isCurrent
                      ? visionTokens.currentCard
                      : isDone
                        ? visionTokens.doneCard
                        : visionTokens.defaultCard,
                    isFuture ? 'opacity-70' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                        {tag === 'today' ? 'Сьогодні' : tag === 'week' ? 'Цього тижня' : 'До місяця'}
                      </p>
                      <h3 className={visionTokens.titleSm}>
                        {goalItem.title}
                      </h3>
                    </div>
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                    ) : (
                      <div className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/55">
                        {isCurrent ? 'Активна' : 'Далі'}
                      </div>
                    )}
                  </div>

                  <p className="mt-3 flex-1 text-sm leading-6 text-white/70">
                    {goalItem.description || 'Крок у карті розвитку, зібраний з колеса, цілей і місячного фокусу.'}
                  </p>

                  {isDone ? (
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                      Система стала стабільнішою
                    </p>
                  ) : isCurrent ? (
                    <p className={cn('mt-3 text-xs uppercase tracking-[0.18em]', visionTokens.microLabel)}>
                      Це активний крок прямо зараз
                    </p>
                  ) : null}

                  <button
                    type="button"
                    disabled={!isCurrent || isDone || updateGoalProgressState.isLoading}
                    onClick={() => handleCompleteGoal(goalItem)}
                    className={[
                      'mt-4 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                      isCurrent && !isDone
                        ? 'hero-cta-primary'
                        : 'border border-white/10 bg-white/[0.04] text-white/55',
                    ].join(' ')}
                  >
                    {isDone
                      ? 'Виконано'
                      : currentIdentity && isCurrent
                        ? `Це робить тебе ${currentIdentity}`
                        : 'Виконати'}
                  </button>
                </article>

                {index < orderedGoals.length - 1 ? (
                  <div className="hidden xl:flex xl:w-10 xl:items-center xl:justify-center">
                    <div className="h-px w-full bg-white/10" />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className={visionTokens.section}>
          <div className="space-y-4">
            <div>
              <p className={visionTokens.overlineSoft}>WEB graph</p>
              <h2 className={visionTokens.titleMd}>Центр системи та гілки переходу</h2>
            </div>
            <VisionSystemGraph system={system} goals={orderedGoals} />
          </div>
        </div>
        <div className="space-y-4">
          <Card title="Система" description={`${systemScore.toFixed(1)}/10 · найслабша зона ${weakestSphere ?? 'ще не визначена'}`} />
          <Card title="Impact chain" description={impactChain.length ? impactChain.join(' → ') : 'Сфокусуйся на сфері, щоб побачити наслідки.'} tone="critical" />
          <Card title="Фокус" description={goal?.title ?? system?.orchestrator.recommendedFocus ?? 'Натисни на сектор колеса й обери 1 сферу фокусу.'} tone="success" />
          <Card title="Обмеження" description={system?.orchestrator.primaryConstraint ?? 'Після генерації тут зʼявиться головне вузьке місце системи.'} tone="critical" />
          <Card title="Daily cycle" description={system?.dailyCycle.prompt ?? 'Після генерації система підкаже, який вузол відстежувати в daily cycle.'} />
          <Card title="Seed example" description={`Health ${system?.seed.scoreFrom ?? 4}→${system?.seed.scoreTo ?? 7} · ${system?.seed.timeframeMonths ?? 3}м · ${system?.seed.solutions.join(', ') ?? ''}`} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={cn('space-y-4', visionTokens.section)}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={visionTokens.overlineSoft}>Growth loop</p>
              <h2 className={visionTokens.titleMd}>{goal?.title ?? 'Обери фокус'}</h2>
            </div>
            <button type="button" onClick={() => dispatch({ type: 'GOAL_SET', goalId: goal?.id ?? null })} className={visionTokens.chipActive}>
              Обрати фокус
            </button>
          </div>

          <Card title="Місячний план" description={monthPlan?.focus ?? 'План ще не визначений. Система візьме першу дію з активної цілі.'} />

          <div className={visionTokens.sectionSoft}>
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">Ранок</p>
            <p className="mt-2 text-base font-medium text-white">{state.dayAction ?? 'Одна дія на день ще не визначена'}</p>
            <button type="button" onClick={() => dispatch({ type: 'DAY_ACTION_SET', action: todayAction })} className="hero-cta-primary mt-4 h-11 w-full rounded-2xl">
              Почати
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="День" description={state.dayResult ? 'Результат вже зафіксований. Система бачить твій патерн.' : 'Якщо дія зависає до вечора, система маркує це як ризик зриву.'} tone={state.dayResult ? 'default' : 'critical'} />
            <div className={visionTokens.sectionSoft}>
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">Вечір</p>
              <p className="mt-2 text-sm text-white/72">Ти зробила дію?</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => dispatch({ type: 'DAY_RESULT_SET', result: 'done' })} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-white">Зроблено</button>
                <button type="button" onClick={() => dispatch({ type: 'DAY_RESULT_SET', result: 'not_started' })} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white">Не почала</button>
                <button type="button" onClick={() => dispatch({ type: 'DAY_RESULT_SET', result: 'postponed' })} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white">Відклала</button>
                <button type="button" onClick={() => dispatch({ type: 'DAY_RESULT_SET', result: 'dropped' })} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white">Кинула</button>
              </div>
            </div>
          </div>

          {state.skipHistory.length >= 3 ? (
            <Card title="Патерн" description="Ти відкладаєш системно. Це зупиняє систему раніше, ніж вона доходить до результату." tone="critical" />
          ) : null}
        </div>

        <div className="space-y-4">
          <Card title="Сьогодні" description={todayAction ?? 'Одна дія зʼявиться після вибору фокусу.'} tone="success" />
          <Card title="Ланцюг впливу" description={impactChain.length ? `Це б'є по: ${impactChain.join(', ')}` : 'Після вибору фокусу тут зʼявиться ланцюг наслідків.'} />
        </div>
      </section>

      <section className={visionTokens.section}>
        <p className={visionTokens.overline}>WEB-Карта</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-white">WEB-Карта {vm.header.year ?? new Date().getFullYear()}</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/70">{vm.header.identity ?? 'Сформуй систему цілей, місячних фокусів і точок контролю.'}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.22em] text-white/40">
              Редагування після першого збереження закрите
            </p>
            {currentIdentity ? (
              <p className="mt-3 text-sm text-white/64">
                Система веде тебе як {currentIdentity}.
              </p>
            ) : null}
          </div>
          <div className={visionTokens.pillLg}>
            <div>Головна ціль</div>
            <div className="mt-1 font-medium text-white">{vm.header.mainGoal?.title ?? 'Ще не визначена'}</div>
          </div>
        </div>
      </section>

      <section className={visionTokens.section}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={visionTokens.overline}>AI Рекомендації</p>
            <h2 className={visionTokens.titleMd}>Закритий шар адаптації</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.SUBSCRIPTION)}
            className="hero-cta-primary"
          >
            Відкрити повністю
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            'Оптимальний порядок дій',
            'Ризики якщо ігнорувати',
            'Прогноз через 14 днів',
          ].map((item) => (
            <div key={item} className={visionTokens.aiCard}>
              <div className={visionTokens.aiOverlayTop} />
              <div className={visionTokens.aiOverlayBase} />
              <div className="relative">
                <div className="flex items-center gap-2 text-white/60">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm">{item}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/42">
                  Доступно після відкриття повного доступу та AI-підказок для карти.
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => vm.setTab(tab.id)}
            className={[visionTokens.tabButtonBase, vm.activeTab === tab.id ? visionTokens.tabButtonActive : visionTokens.tabButtonIdle].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {vm.activeTab === 'goals' && <GoalsTab {...vm.goals} />}
      {vm.activeTab === 'months' && <MonthsTab {...vm.months} />}
      {vm.activeTab === 'analysis' && <Card title="Аналіз місяця" description={vm.analysis.currentMonth?.aiAnalysis ?? 'Аналіз зʼявиться після запуску місячного огляду.'} />}
      {vm.activeTab === 'coach' && <CoachTab {...vm.coach} />}
    </div>
  )
}
