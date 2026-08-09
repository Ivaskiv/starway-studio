import { ROUTES } from '@/config/routes'
import {
  dashboardDesignSystem,
} from '@/styles/design-system'
import type { WebMapGoal } from '@/features/web-map/services/web-map.api'
import WheelChart from '@/features/wheel/components/WheelChart'
import { getWheelCategoryById } from '@/features/wheel/constants/wheelContent'
import type { WheelAssessment, WheelSphereId } from '@/features/wheel/types/wheel.types'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export type JourneyStepId = 'wheel' | 'goals' | 'vision' | 'cycle'
type JourneyStepStatus = 'done' | 'active' | 'locked'

export type JourneyStep = {
  id: JourneyStepId
  title: string
  hint: string
  route: string
  status: JourneyStepStatus
}

type Props = {
  steps: readonly JourneyStep[]
  expandedStep: JourneyStepId | null
  onToggleStep: (id: JourneyStepId) => void
  onLockedStep?: (id: JourneyStepId) => void
  wheel?: WheelAssessment | null
  goals?: WebMapGoal[]
}

type Point = { x: number; y: number }

const STEP_META: Record<JourneyStepId, { subtitle: string; reward: string }> = {
  wheel: { subtitle: 'Діагностика · 8 сфер', reward: '+50 XP · виконано' },
  goals: { subtitle: 'Фокус · пріоритет · напрям', reward: '+40 XP · в процесі' },
  vision: { subtitle: "Зв'язки · ресурси · обмеження", reward: '+60 XP · Pro' },
  cycle: { subtitle: 'СТАН → ЦІЛЬ → ВИБІР → ДІЯ', reward: '+30 XP/день · Pro' },
}

const journeyTokens = dashboardDesignSystem.journey

const STEP_PROGRESS_CLASS: Record<JourneyStepStatus, string> = {
  done: journeyTokens.progressDone,
  active: journeyTokens.progressActive,
  locked: journeyTokens.progressLocked,
}

const STEP_REWARD_CLASS: Record<JourneyStepStatus, string> = {
  done: journeyTokens.rewardDone,
  active: journeyTokens.rewardActive,
  locked: journeyTokens.rewardLocked,
}

const SCORE_BAR_WIDTH_CLASS: Record<number, string> = {
  0: 'w-0',
  1: 'w-[10%]',
  2: 'w-[20%]',
  3: 'w-[30%]',
  4: 'w-[40%]',
  5: 'w-[50%]',
  6: 'w-[60%]',
  7: 'w-[70%]',
  8: 'w-[80%]',
  9: 'w-[90%]',
  10: 'w-full',
}

const CATEGORY_DOT_CLASS: Record<WheelSphereId, string> = {
  finance: 'bg-amber-500',
  career: 'bg-blue-500',
  relationships: 'bg-red-500',
  energy: 'bg-violet-500',
  freedom: 'bg-pink-500',
  mind: 'bg-purple-500',
  health: 'bg-sky-900',
  selfDevelopment: 'bg-teal-500',
}

const CATEGORY_BAR_CLASS: Record<WheelSphereId, string> = {
  finance: 'bg-amber-500',
  career: 'bg-blue-500',
  relationships: 'bg-red-500',
  energy: 'bg-violet-500',
  freedom: 'bg-pink-500',
  mind: 'bg-purple-500',
  health: 'bg-sky-900',
  selfDevelopment: 'bg-teal-500',
}

const GOAL_TAG_CLASS = [journeyTokens.goalsTagDay, journeyTokens.goalsTagWeek, journeyTokens.goalsTagMonth] as const

const DETAIL_SPHERE_ORDER: WheelSphereId[] = [
  'freedom',
  'career',
  'selfDevelopment',
  'energy',
  'health',
  'finance',
  'mind',
  'relationships',
]

const DETAIL_SPHERE_LABELS: Record<WheelSphereId, string> = {
  freedom: 'Свобода',
  career: 'Реалізація',
  selfDevelopment: 'Розвиток',
  energy: 'Енергія',
  health: "Здоров'я",
  finance: 'Гроші',
  mind: 'Духовність',
  relationships: 'Відносини',
}

function lerpColor(c1: string, c2: string, t: number): string {
  const parse = (value: string) => value.match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255, 1]
  const [r1, g1, b1, a1] = parse(c1)
  const [r2, g2, b2, a2] = parse(c2)
  const rgbaFn = 'rgb' + 'a'
  return `${rgbaFn}(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)},${+(a1 + (a2 - a1) * t).toFixed(2)})`
}

function seededRand(n: number): number {
  const seed = (n * 1664525 + 1013904223) & 0xffffffff
  return (seed >>> 0) / 4294967296
}

function interpolateSegment(from: Point, to: Point, spacing = 18): Point[] {
  const distance = Math.hypot(to.x - from.x, to.y - from.y) || 1
  const steps = Math.max(1, Math.ceil(distance / spacing))
  const points: Point[] = []

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    points.push({
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    })
  }

  return points
}

function buildOrthogonalRoute(
  from: Point,
  to: Point,
  fromRect: DOMRect | undefined,
  toRect: DOMRect | undefined,
  fromDirection: 1 | -1,
  toDirection: 1 | -1,
): Point[] {
  const sideOffset = 20
  const gapOffset = 12
  const fromDetourX = from.x + fromDirection * sideOffset
  const toDetourX = to.x + toDirection * sideOffset
  const gapTop = (fromRect?.bottom ?? from.y) + gapOffset
  const gapBottom = (toRect?.top ?? to.y) - gapOffset
  const corridorY = gapBottom > gapTop ? (gapTop + gapBottom) / 2 : (from.y + to.y) / 2

  return [
    from,
    { x: fromDetourX, y: from.y },
    { x: fromDetourX, y: corridorY },
    { x: toDetourX, y: corridorY },
    { x: toDetourX, y: to.y },
    to,
  ]
}

function expandRoutePoints(route: Point[]): Point[] {
  const expanded: Point[] = []

  route.forEach((point, index) => {
    if (index === 0) {
      expanded.push(point)
      return
    }
    expanded.push(...interpolateSegment(route[index - 1], point).slice(1))
  })

  return expanded
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function diffInDays(from: Date, to: Date) {
  const start = new Date(from)
  const end = new Date(to)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
}

function diffInMonthsLabel(from: Date, to: Date) {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())

  if (months <= 0) return 'цього місяця'
  if (months === 1) return '1 міс тому'
  if (months < 5) return `${months} міс тому`
  return `${months} міс тому`
}

function NodeCircle({ step, index, isOdd }: { step: JourneyStep; index: number; isOdd: boolean }) {
  const nodeStatusClass =
    step.status === 'done'
      ? journeyTokens.nodeDone
      : step.status === 'active'
        ? journeyTokens.nodeActive
        : journeyTokens.nodeLocked

  return (
    <div
      data-node-id={step.id}
      className={cn(
        journeyTokens.nodeBase,
        nodeStatusClass,
        isOdd ? journeyTokens.nodeOffsetLeft : journeyTokens.nodeOffsetRight,
      )}
    >
      {step.status === 'done' ? '✓' : step.status === 'locked' ? '🔒' : index + 1}
    </div>
  )
}

export default function JourneyPathBoard({
  steps,
  expandedStep,
  onToggleStep,
  onLockedStep,
  wheel,
  goals,
}: Props) {
  const navigate = useNavigate()
  const journeyRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [wheelDetailsOpen, setWheelDetailsOpen] = useState(false)

  const topScores = useMemo(() => {
    if (!wheel?.scores?.length) return []

    return [...wheel.scores]
      .sort((left, right) => right.score - left.score)
      .slice(0, 5)
      .map((score) => {
        const category = getWheelCategoryById(score.categoryId)
        const roundedScore = Math.max(0, Math.min(10, Math.round(score.score)))
        return {
          ...score,
          categoryName: category?.nameUk ?? score.categoryId,
          dotClass: CATEGORY_DOT_CLASS[score.categoryId],
          barClass: CATEGORY_BAR_CLASS[score.categoryId],
          widthClass: SCORE_BAR_WIDTH_CLASS[roundedScore],
        }
      })
  }, [wheel])

  const avgScore = wheel?.averageScore?.toFixed(1) ?? '0.0'
  const wheelCompleted = Boolean(wheel?.scores?.length)
  const wheelCreatedLabel = wheel?.createdAt ? new Date(wheel.createdAt).toLocaleDateString('uk-UA') : null
  const wheelCreatedAt = wheel?.createdAt ? new Date(wheel.createdAt) : null
  const recommendedAt = wheelCreatedAt ? addMonths(wheelCreatedAt, 3) : null
  const daysUntilRecommended = recommendedAt ? Math.max(0, diffInDays(new Date(), recommendedAt)) : 0
  const wheelScoresInOrder = useMemo(() => {
    const scoreMap = new Map((wheel?.scores ?? []).map((score) => [score.categoryId, score]))
    return DETAIL_SPHERE_ORDER.map((id) => {
      const score = scoreMap.get(id)
      const roundedScore = Math.max(0, Math.min(10, Math.round(score?.score ?? 0)))
      return {
        id,
        label: DETAIL_SPHERE_LABELS[id],
        score: roundedScore,
        barClass: CATEGORY_BAR_CLASS[id],
        widthClass: SCORE_BAR_WIDTH_CLASS[roundedScore],
      }
    })
  }, [wheel])
  const wheelMin = wheelScoresInOrder.length ? Math.min(...wheelScoresInOrder.map((item) => item.score)) : 0
  const wheelMax = wheelScoresInOrder.length ? Math.max(...wheelScoresInOrder.map((item) => item.score)) : 0
  const wheelImbalance = wheelMax - wheelMin

  const goalRows = useMemo(() => {
    if (goals?.length) return goals.slice(0, 3)
    return [
      { id: 'fallback-1', title: 'Написати одному контакту — просто "як ти?"', actions: [] },
      { id: 'fallback-2', title: 'Запланувати вечір. Конкретна дата в календарі.', actions: [] },
      { id: 'fallback-3', title: '10 хв рефлексії щоранку без телефону.', actions: [] },
    ] as Array<Pick<WebMapGoal, 'id' | 'title' | 'actions'>>
  }, [goals])

  useEffect(() => {
    const container = journeyRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return undefined

    const drawPath = () => {
      const currentContainer = journeyRef.current
      const currentCanvas = canvasRef.current
      if (!currentContainer || !currentCanvas) return

      const containerRect = currentContainer.getBoundingClientRect()
      currentCanvas.width = currentContainer.offsetWidth
      currentCanvas.height = currentContainer.offsetHeight

      const ctx = currentCanvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height)

      const nodePositions: Array<Point & { status: JourneyStepStatus }> = []
      steps.forEach((step) => {
        const element = currentContainer.querySelector<HTMLElement>(`[data-node-id="${step.id}"]`)
        if (!element) return
        const rect = element.getBoundingClientRect()
        nodePositions.push({
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          status: step.status,
        })
      })

      const cardRects = steps.reduce<Record<string, DOMRect>>((acc, step) => {
        const element = currentContainer.querySelector<HTMLElement>(`[data-card-id="${step.id}"]`)
        if (!element) return acc
        const rect = element.getBoundingClientRect()
        acc[step.id] = new DOMRect(
          rect.left - containerRect.left,
          rect.top - containerRect.top,
          rect.width,
          rect.height,
        )
        return acc
      }, {})

      for (let segment = 0; segment < nodePositions.length - 1; segment += 1) {
        const from = nodePositions[segment]
        const to = nodePositions[segment + 1]
        const fromStep = steps[segment]
        const toStep = steps[segment + 1]
        const fromDirection: 1 | -1 = segment % 2 === 0 ? 1 : -1
        const toDirection: 1 | -1 = (segment + 1) % 2 === 0 ? 1 : -1

        let colorA: string = dashboardDesignSystem.colors.pathIdle
        let colorB: string = dashboardDesignSystem.colors.pathIdle

        if (from.status === 'done' && to.status === 'done') {
          colorA = dashboardDesignSystem.colors.pathDone
          colorB = dashboardDesignSystem.colors.pathDone
        } else if (from.status === 'done') {
          colorA = dashboardDesignSystem.colors.pathDone
          colorB = dashboardDesignSystem.colors.pathActive
        } else if (from.status === 'active') {
          colorA = dashboardDesignSystem.colors.pathActive
          colorB = dashboardDesignSystem.colors.pathActiveMuted
        }

        const routedPoints = buildOrthogonalRoute(
          from,
          to,
          cardRects[fromStep.id],
          cardRects[toStep.id],
          fromDirection,
          toDirection,
        )
        const expandedPoints = expandRoutePoints(routedPoints)

        expandedPoints.forEach((point, index) => {
          const t = index / Math.max(expandedPoints.length - 1, 1)
          const isEndpoint = index === 0 || index === expandedPoints.length - 1
          const radius = isEndpoint ? 5 : index % 5 === 0 ? 4 : index % 3 === 0 ? 3 : 2
          const alpha = isEndpoint ? 1 : 0.45 + seededRand(segment * 100 + index) * 0.45

          ctx.beginPath()
          ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
          ctx.fillStyle = lerpColor(colorA, colorB, t)
          ctx.globalAlpha = alpha
          ctx.fill()
          ctx.globalAlpha = 1
        })
      }
    }

    const timeoutId = window.setTimeout(drawPath, 420)
    const resizeObserver = new ResizeObserver(() => drawPath())
    resizeObserver.observe(container)

    return () => {
      window.clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [expandedStep, steps])

  const renderPanelContent = (step: JourneyStep) => {
    if (step.id === 'wheel') {
      return (
        <div>
          <p className={journeyTokens.overline}>
            Результат · бал {avgScore}
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-5">
            <WheelChart scores={wheel?.scores ?? []} size={80} className="shrink-0 pt-2" showInsights={false} />
            <div className="flex min-w-[140px] flex-1 flex-col gap-[5px] pt-1 sm:min-w-[180px] sm:pl-3">
              {topScores.map((score) => (
                <div key={score.categoryId} className="flex items-center gap-1.5">
                  <div className={['h-[6px] w-[6px] shrink-0 rounded-full', score.dotClass].join(' ')} />
                  <span className={journeyTokens.scoreName}>{score.categoryName}</span>
                  <div className="h-[2px] w-[40px] shrink-0 rounded-full bg-white/7">
                    <div className={['h-[2px] rounded-full', score.barClass, score.widthClass].join(' ')} />
                  </div>
                  <span className={journeyTokens.scoreValue}>{score.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={journeyTokens.buttonRow}>
            <button
              type="button"
              onClick={() => setWheelDetailsOpen((prev) => !prev)}
              className={journeyTokens.buttonSecondary}
            >
              Деталі
            </button>
            <button
              type="button"
              onClick={() => onToggleStep('goals')}
              className={journeyTokens.buttonPrimary}
            >
              До цілей →
            </button>
          </div>

          {wheelDetailsOpen ? (
            <div className={journeyTokens.detailsWrap}>
              <div className={journeyTokens.detailsScroll}>
                {wheelCompleted ? (
                  <div className="space-y-4">
                  <div className={journeyTokens.detailHeader}>
                    <div>
                      <p className={journeyTokens.detailKicker}>ОСТАННІЙ АНАЛІЗ СТАНУ СФЕР</p>
                      <p className={journeyTokens.detailTitle}>Колесо балансу · результати</p>
                    </div>
                    <div className="text-right">
                      <p className={journeyTokens.detailDate}>{wheelCreatedLabel}</p>
                      <p className={journeyTokens.detailMeta}>
                        {wheelCreatedAt ? diffInMonthsLabel(wheelCreatedAt, new Date()) : 'цього місяця'}
                      </p>
                    </div>
                  </div>

                  <div className={journeyTokens.statsGrid}>
                    <div className={journeyTokens.detailCard}>
                      <p className={journeyTokens.detailStatLabel}>Середній</p>
                      <p className={journeyTokens.detailStatValue}>{avgScore}</p>
                    </div>
                    <div className={journeyTokens.detailCard}>
                      <p className={journeyTokens.detailStatLabel}>Мін</p>
                      <p className={journeyTokens.detailStatValue}>{wheelMin}</p>
                    </div>
                    <div className={journeyTokens.detailCard}>
                      <p className={journeyTokens.detailStatLabel}>Макс</p>
                      <p className={journeyTokens.detailStatValue}>{wheelMax}</p>
                    </div>
                    <div className={journeyTokens.detailCard}>
                      <p className={journeyTokens.detailStatLabel}>Дисбаланс</p>
                      <p className={journeyTokens.detailStatValue}>{wheelImbalance}</p>
                    </div>
                  </div>

                    <div className={journeyTokens.detailCard}>
                      <div className={journeyTokens.detailChartRow}>
                        <WheelChart scores={wheel?.scores ?? []} size={112} className="shrink-0 pt-3" />
                        <div className={journeyTokens.detailLegend}>
                        {wheelScoresInOrder.map((score) => (
                          <div key={score.id} className="flex items-center gap-2">
                            <span className={journeyTokens.scoreLabel}>{score.label}</span>
                            <div className="h-[3px] flex-1 rounded-full bg-white/8">
                              <div className={['h-[3px] rounded-full', score.barClass, score.widthClass].join(' ')} />
                            </div>
                            <span className={journeyTokens.scoreNumber}>{score.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={journeyTokens.detailCard}>
                    <p className={journeyTokens.detailStatLabel}>РЕГУЛЯРНІСТЬ</p>
                    <p className={journeyTokens.detailRegularText}>
                      Оптимально — раз на 3 місяці, щоб відстежувати реальний зсув у сферах без шуму.
                    </p>
                    <p className={journeyTokens.detailSecondaryText}>
                      Останнє заповнення: {wheelCreatedLabel} · наступне рекомендовано:{' '}
                      {recommendedAt ? recommendedAt.toLocaleDateString('uk-UA') : '—'}
                    </p>
                  </div>

                  <div className={journeyTokens.alertCard}>
                    <p className={journeyTokens.alertText}>
                      Наступне оновлення рекомендовано через {daysUntilRecommended} днів
                    </p>
                  </div>

                  {wheel?.notes ? (
                    <div className={journeyTokens.detailCard}>
                      <p className={journeyTokens.detailStatLabel}>АНАЛІЗ</p>
                      <p className={journeyTokens.detailRegularText}>{wheel.notes}</p>
                    </div>
                  ) : null}

                    <div className={journeyTokens.actionGrid}>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Ти впевнений? Попередні результати буде втрачено')) {
                            navigate(ROUTES.WHEEL_START)
                          }
                        }}
                        className={journeyTokens.buttonPrimary}
                      >
                        Оновити колесо
                      </button>
                      <button type="button" className={journeyTokens.actionButton}>
                        PDF (сайт)
                      </button>
                      <button type="button" className={journeyTokens.actionButton}>
                        Завантажити
                      </button>
                      <button type="button" className={journeyTokens.actionButton}>
                        TG
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                  <div className={cn(journeyTokens.detailCardLg, 'text-center')}>
                    <div className={journeyTokens.emptyIcon}>
                      ◎
                    </div>
                    <p className={journeyTokens.emptyTitle}>Ти ще не проходив колесо балансу</p>
                    <p className={journeyTokens.emptyText}>
                      Колесо — це 5-хвилинна діагностика, яка показує поточний стан сфер життя та точки дисбалансу.
                    </p>
                  </div>

                  <div className={journeyTokens.detailCard}>
                    <p className={journeyTokens.detailStatLabel}>ОПТИМАЛЬНА РЕГУЛЯРНІСТЬ</p>
                    <p className={journeyTokens.detailRegularText}>
                      Раз на 3 місяці — достатньо, щоб бачити реальні зміни без хаотичних повторів.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.WHEEL_START)}
                    className={cn(journeyTokens.buttonPrimary, 'w-full')}
                  >
                    Пройти колесо
                  </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )
    }

    if (step.id === 'goals') {
      const tags = ['Сьогодні', 'Тиждень', 'Місяць'] as const
      return (
        <div>
          <p className={journeyTokens.overline}>
            Дії · редагуй один раз
          </p>
          {goalRows.map((goal, goalIndex) => (
            <div key={goal.id ?? goalIndex} className={journeyTokens.goalsRow}>
              <div
                className={cn(
                  journeyTokens.goalsIndexBase,
                  goalIndex === 0 ? journeyTokens.goalsIndexActive : journeyTokens.goalsIndexIdle,
                )}
              >
                {goalIndex + 1}
              </div>
              <p className={journeyTokens.goalsText}>
                {goal.actions?.[0] || goal.title}
              </p>
              <span className={cn(journeyTokens.goalsTagBase, GOAL_TAG_CLASS[goalIndex])}>
                {tags[goalIndex]}
              </span>
              <button type="button" className={journeyTokens.iconButton}>
                
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onToggleStep('goals')}
            className={journeyTokens.saveButton}
          >
            Зберегти цілі 
          </button>
        </div>
      )
    }

    return (
      <div className={journeyTokens.lockedCard}>
        <div className="flex-1">
          <p className={journeyTokens.lockedTitle}>✦ Доступно у Pro</p>
          <p className={journeyTokens.lockedText}>
            {step.id === 'vision' ? "Стратегічна карта зв'язків між сферами" : 'Ранок → задача → вечір → паттерн'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.SUBSCRIPTION)}
          className={journeyTokens.lockedButton}
        >
          Відкрити
        </button>
      </div>
    )
  }

  return (
    <section className={journeyTokens.section} ref={journeyRef}>
      <canvas ref={canvasRef} className={journeyTokens.canvas} />
      <div className={journeyTokens.list}>
        {steps.map((step, index) => {
          const isOdd = index % 2 === 0
          const isExpanded = expandedStep === step.id
          const meta = STEP_META[step.id]
          const panelBorderClass = step.status === 'active' ? journeyTokens.panelActive : journeyTokens.panelLocked

          return (
            <div key={step.id}>
              <div className={cn(journeyTokens.row, isOdd ? journeyTokens.rowLeft : journeyTokens.rowRight)}>
                {!isOdd ? <NodeCircle step={step} index={index} isOdd={isOdd} /> : null}

                <div data-card-id={step.id} className={journeyTokens.cardWrap}>
                  <div
                    onClick={() => {
                      if (step.status === 'locked') {
                        onLockedStep?.(step.id)
                        return
                      }
                      onToggleStep(step.id)
                    }}
                    className={[
                      journeyTokens.cardBase,
                      isExpanded ? journeyTokens.cardExpanded : journeyTokens.cardCollapsed,
                      step.status === 'done' ? journeyTokens.cardDone : '',
                      step.status === 'active' ? journeyTokens.cardActive : '',
                      step.status === 'locked'
                        ? journeyTokens.cardLocked
                        : journeyTokens.cardInteractive,
                    ].filter(Boolean).join(' ')}
                  >
                    <div className={journeyTokens.cardInner}>
                      <div className="min-w-0 flex-1">
                        <p className={journeyTokens.stepIndex}>КРОК 0{index + 1}</p>
                        <p className={journeyTokens.stepTitle}>{step.title}</p>
                        <p className={journeyTokens.stepSubtitle}>{meta.subtitle}</p>

                        <div className={journeyTokens.progressRow}>
                          <div className={journeyTokens.progressTrack}>
                            <div className={cn(journeyTokens.progressBar, STEP_PROGRESS_CLASS[step.status])} />
                          </div>
                          <span className={cn(journeyTokens.rewardBase, STEP_REWARD_CLASS[step.status])}>
                            {meta.reward}
                          </span>
                          {step.status !== 'locked' ? (
                            <span className={cn(journeyTokens.chevron, isExpanded ? 'rotate-180' : 'rotate-0')}>
                              ▾
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={[
                      journeyTokens.panelBase,
                      panelBorderClass,
                      isExpanded ? journeyTokens.panelOpen : journeyTokens.panelClosed,
                    ].join(' ')}
                  >
                    <div className={journeyTokens.panelInner}>{renderPanelContent(step)}</div>
                  </div>
                </div>

                {isOdd ? <NodeCircle step={step} index={index} isOdd={isOdd} /> : null}
              </div>

              {index < steps.length - 1 ? <div className={journeyTokens.spacer} /> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
