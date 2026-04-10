import { CheckCircle2, ChevronDown, Lock, MessageCircle, Sparkles, Target, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { ROUTES } from '@/config/routes'
import { useSendAssistantMessageMutation } from '@/features/assistant/services/assistant.api'
import { useAccess } from '@/features/auth/hooks/useAccess'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGetVisionQuery } from '@/features/vision/services/vision.api'
import {
  type MonthPlan,
  type WebMap,
  type WebMapGoal,
  useGenerateWebMapMutation,
  useGetWebMapQuery,
  useRunMonthlyAnalysisMutation,
  useUpdateGoalProgressMutation,
} from '@/features/web-map/services/web-map.api'
import { useGetLatestWheelAssessmentQuery } from '@/features/wheel/services/wheel.api'
import { WHEEL_CATEGORY_MAP, type WheelAssessment } from '@/features/wheel/types/wheel.types'
import { Button, GlassCard, Progress, Slider, Textarea } from '@/ui'
import { useNavigate } from 'react-router-dom'

type ActiveTab = 'goals' | 'months' | 'analysis' | 'coach'
type SetupStep = 'wheel' | 'generating' | 'confirm'
type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

const MONTH_NAMES = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
]

const QUICK_PROMPTS = [
  'Що я маю зробити сьогодні?',
  'Аналіз мого прогресу',
  'Переглянути план наступного місяця',
  'Де я зараз буксую?',
]

function formatMonthLabel(month: number) {
  return MONTH_NAMES[month - 1] ?? `Місяць ${month}`
}

function wait(ms: number) {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms)
  })
}

function getWheelScoresHash(scores: Record<string, number>) {
  return Object.entries(scores)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join('|')
}

function extractAssistantText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'Я підготував коротку відповідь по твоїй карті. Спробуй ще раз, якщо хочеш глибший розбір.'
  }

  const candidate = payload as Record<string, unknown>
  return typeof candidate.message === 'string'
    ? candidate.message
    : 'Я підготував коротку відповідь по твоїй карті. Спробуй ще раз, якщо хочеш глибший розбір.'
}

function getGoalStatusTone(status: WebMapGoal['status']) {
  switch (status) {
    case 'on_track':
      return {
        badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        bar: 'from-emerald-500 to-emerald-400',
        label: 'На треку',
      }
    case 'behind':
      return {
        badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
        bar: 'from-rose-500 to-rose-400',
        label: 'Відстає',
      }
    case 'completed':
      return {
        badge: 'border-white/15 bg-white/5 text-white/65',
        bar: 'from-white/40 to-white/25',
        label: 'Завершено',
      }
    default:
      return {
        badge: 'border-[color:rgba(var(--accent-rgb),0.28)] bg-[color:rgba(var(--accent-rgb),0.12)] text-[var(--accent)]',
        bar: 'from-[var(--accent-soft)] to-[var(--accent)]',
        label: 'В процесі',
      }
  }
}

function getMonthStatusTone(status: MonthPlan['status'], isCurrent: boolean) {
  if (isCurrent) {
    return 'border-[color:rgba(var(--accent-rgb),0.45)] bg-[rgba(11,19,43,0.92)]'
  }

  if (status === 'done') {
    return 'border-emerald-500/30 bg-emerald-500/5'
  }

  if (status === 'skipped') {
    return 'border-rose-500/30 bg-rose-500/5'
  }

  return 'border-white/10 bg-[rgba(10,16,31,0.82)]'
}

function buildWheelScoreMap(wheel: WheelAssessment | null): Record<string, number> {
  if (!wheel) {
    return {}
  }

  return wheel.scores.reduce<Record<string, number>>((acc, score) => {
    acc[score.categoryId] = score.score
    return acc
  }, {})
}

function getCurrentMonthPlan(map: WebMap | null): MonthPlan | null {
  if (!map) return null
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  return map.months.find(item => item.month === month && item.year === year) ?? null
}

function getAnalysisStreak(months: MonthPlan[]) {
  const sorted = [...months].sort((left, right) => (right.year - left.year) || (right.month - left.month))
  let streak = 0
  for (const month of sorted) {
    if (!month.aiAnalysis) break
    streak += 1
  }
  return streak
}

function getGoalMonthFocus(goalId: string, month: MonthPlan | null) {
  if (!month) return 'Фокус з’явиться після формування поточного місяця.'
  if (month.goalIds.includes(goalId)) {
    return month.focus ?? 'Ціль уже в роботі цього місяця.'
  }
  return month.focus ?? 'Фокус ще не призначено.'
}

export default function VisionPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { can } = useAccess()
  const locked = !can('mentor.vision')
  const coachRef = useRef<HTMLDivElement | null>(null)

  const { data: vision } = useGetVisionQuery(undefined, { skip: locked })
  const { data: webMap, isLoading: isWebMapLoading, refetch } = useGetWebMapQuery(undefined, { skip: locked })
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(user?.id ?? '', { skip: !user?.id || locked })

  const [generateWebMap, { isLoading: isGeneratingMap }] = useGenerateWebMapMutation()
  const [updateGoalProgress, { isLoading: isUpdatingGoal }] = useUpdateGoalProgressMutation()
  const [runMonthlyAnalysis, { isLoading: isRunningAnalysis }] = useRunMonthlyAnalysisMutation()
  const [sendAssistantMessage, { isLoading: isCoachLoading }] = useSendAssistantMessageMutation()

  const [activeTab, setActiveTab] = useState<ActiveTab>('goals')
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  const [setupStep, setSetupStep] = useState<SetupStep>('wheel')
  const [generatedPreview, setGeneratedPreview] = useState<WebMap | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [goalDrafts, setGoalDrafts] = useState<Record<string, number>>({})

  const currentMonthPlan = useMemo(() => getCurrentMonthPlan(webMap ?? null), [webMap])
  const wheelScores = useMemo(() => buildWheelScoreMap(latestWheel ?? null), [latestWheel])
  const wheelScoresHash = useMemo(() => getWheelScoresHash(wheelScores), [wheelScores])
  const wheelScoreEntries = useMemo(
    () =>
      Object.entries(wheelScores)
        .sort((left, right) => left[1] - right[1])
        .slice(0, 8),
    [wheelScores],
  )
  const weakSphereKeys = useMemo(
    () => new Set(wheelScoreEntries.slice(0, 3).map(([sphere]) => sphere)),
    [wheelScoreEntries],
  )

  const mainGoal = useMemo(
    () => webMap?.goals.find(goal => goal.id === webMap.mainGoalId) ?? webMap?.goals.find(goal => goal.isMain) ?? null,
    [webMap],
  )

  const completedGoals = useMemo(
    () => webMap?.goals.filter(goal => goal.status === 'completed').length ?? 0,
    [webMap],
  )

  const monthCompletion = useMemo(() => {
    if (!currentMonthPlan || currentMonthPlan.actions.length === 0) {
      return 0
    }

    return Math.round((currentMonthPlan.doneActions.length / currentMonthPlan.actions.length) * 100)
  }, [currentMonthPlan])

  const analysisStreak = useMemo(() => getAnalysisStreak(webMap?.months ?? []), [webMap])
  const archivedAnalyses = useMemo(
    () => (webMap?.months ?? []).filter(month => Boolean(month.aiAnalysis)).sort((left, right) => (right.year - left.year) || (right.month - left.month)),
    [webMap],
  )

  useEffect(() => {
    if (!webMap?.identityStatement) return
    setChatMessages(current =>
      current.length > 0
        ? current
        : [
            {
              id: 'intro',
              role: 'assistant',
              content: `Ти в кінці ${webMap.year}: ${webMap.identityStatement}`,
            },
          ],
    )
  }, [webMap])

  useEffect(() => {
    if (!webMap) return
    setGoalDrafts(
      webMap.goals.reduce<Record<string, number>>((acc, goal) => {
        acc[goal.id] = goal.progress
        return acc
      }, {}),
    )
  }, [webMap])

  async function handleGenerateMap() {
    if (Object.keys(wheelScores).length === 0) return
    if (!user?.id) return

    const generationKey = `web-map:generation:${user.id}`
    const lastGeneratedHash = window.sessionStorage.getItem(generationKey)
    if (lastGeneratedHash === wheelScoresHash && !generatedPreview) {
      return
    }

    setGenerationError(null)
    setSetupStep('generating')
    try {
      const map = await generateWebMap({ wheelScores }).unwrap()
      window.sessionStorage.setItem(generationKey, wheelScoresHash)
      setGeneratedPreview(map)
      setSetupStep('confirm')
    } catch (error) {
      const message = error && typeof error === 'object' && 'data' in error
        ? (() => {
            const data = (error as { data?: unknown }).data
            if (!data || typeof data !== 'object' || !('error' in data)) return null
            return typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : null
          })()
        : null
      setGenerationError(message ?? 'Карту не вдалося створити. Спробуй ще раз за мить.')
      setSetupStep('wheel')
    }
  }

  async function handleConfirmGeneratedMap() {
    await refetch()
    setGeneratedPreview(null)
    setSetupStep('wheel')
  }

  async function handleGoalProgressSave(goalId: string, nextProgress: number, currentStatus: WebMapGoal['status']) {
    const nextStatus: WebMapGoal['status'] =
      nextProgress >= 100 ? 'completed' : currentStatus === 'behind' ? 'behind' : currentStatus === 'on_track' ? 'on_track' : 'active'

    await updateGoalProgress({
      id: goalId,
      progress: nextProgress,
      status: nextStatus,
    }).unwrap()
  }

  async function handleCoachPrompt(message: string) {
    const trimmed = message.trim()
    if (!trimmed) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }

    setChatMessages(current => [...current, userMessage])
    setChatInput('')

    await wait(600)

    try {
      const response = await sendAssistantMessage({ message: trimmed }).unwrap()
      setChatMessages(current => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: extractAssistantText(response),
        },
      ])
    } catch {
      setChatMessages(current => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: 'Зараз відповідь AI-коуча недоступна. Спробуй ще раз за мить.',
        },
      ])
    }
  }

  if (locked) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Точка Б</h1>
          <p className="mt-2 text-white/60">Тут живе твоя річна карта: цілі, фокус по місяцях і AI-аналіз руху.</p>
        </div>

        <GlassCard className="border-white/10 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/50">
                <Lock className="h-3.5 w-3.5" />
                Premium модуль
              </div>
              <h2 className="text-2xl font-semibold text-white">WEB-Карта 2026</h2>
              <p className="max-w-2xl text-sm leading-6 text-white/65">
                Після колеса балансу ти бачиш головну ціль року, план по місяцях, архів AI-аналізів і живий AI-коуч у одному місці.
              </p>
            </div>
            <Target className="h-5 w-5 text-white/45" />
          </div>

          <div className="mt-6">
            <Button onClick={() => navigate(`${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(ROUTES.VISION)}`)}>
              Відкрити доступ
            </Button>
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]/80">Точка Б</div>
        <h1 className="text-3xl font-bold text-white md:text-[2.4rem]">WEB-Карта 2026</h1>
        <p className="max-w-3xl text-sm leading-6 text-white/60">
          Тут живе річна стратегія: головна ціль, 5 опорних цілей, місячний фокус і чесний AI-аналіз того, де ти реально рухаєшся, а де пробуксовуєш.
        </p>
      </div>

      {isWebMapLoading ? (
        <GlassCard className="border-white/10 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-44 rounded-full bg-white/10" />
            <div className="grid gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 rounded-2xl border border-white/10 bg-white/5" />
              ))}
            </div>
          </div>
        </GlassCard>
      ) : !webMap || webMap.status === 'draft' ? (
        <GlassCard className="border-[color:rgba(var(--accent-rgb),0.22)] bg-[rgba(10,16,31,0.92)] p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="space-y-3 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(var(--accent-rgb),0.22)] bg-[color:rgba(var(--accent-rgb),0.08)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
                <Sparkles className="h-3.5 w-3.5" />
                Стратегічний шар
              </div>
              <h2 className="text-3xl font-semibold text-white">WEB-Карта 2026 у Точка Б</h2>
              <p className="mx-auto max-w-2xl text-sm leading-6 text-white/60">
                Після колеса балансу AI збирає головну ціль року, 5 вимірювальних цілей і фокус перших місяців. Усе це потім підтягується в щоденний цикл і AI-аналіз.
              </p>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-white/10 bg-[rgba(7,12,24,0.82)] p-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[color:rgba(var(--accent-rgb),0.24)] bg-[color:rgba(var(--accent-rgb),0.08)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]/80">Крок 1</div>
                <div className="mt-2 text-base font-semibold text-white">Колесо балансу</div>
                <p className="mt-1 text-sm leading-5 text-white/55">Перший вхід і далі 1-го числа кожного місяця.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Крок 2</div>
                <div className="mt-2 text-base font-semibold text-white">Точка Б · WEB-Карта</div>
                <p className="mt-1 text-sm leading-5 text-white/55">Обовʼязково після першого колеса: identity, 5 цілей і фокус місяців.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Крок 3</div>
                <div className="mt-2 text-base font-semibold text-white">Щоденний цикл</div>
                <p className="mt-1 text-sm leading-5 text-white/55">Ранок → мікрозавдання → вечір → аналіз, уже в контексті карти року.</p>
              </div>
            </div>

            {generationError ? (
              <div className="rounded-[24px] border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
                {generationError}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-[28px] border border-white/10 bg-[rgba(7,12,24,0.88)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">Крок 1</div>
                    <h3 className="mt-2 text-xl font-semibold text-white">Результати колеса</h3>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
                    {Object.keys(wheelScores).length > 0 ? 'Колесо знайдено' : 'Очікуємо колесо'}
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {wheelScoreEntries.length > 0 ? (
                    wheelScoreEntries.map(([sphere, score]) => {
                      const isWeak = weakSphereKeys.has(sphere)
                      return (
                      <div
                        key={sphere}
                        className={[
                          'rounded-2xl border p-3',
                          isWeak
                            ? 'border-[color:rgba(var(--accent-rgb),0.24)] bg-[color:rgba(var(--accent-rgb),0.08)]'
                            : 'border-white/10 bg-white/[0.03]',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {WHEEL_CATEGORY_MAP.get(sphere)?.nameUk ?? sphere}
                            </div>
                            <div className="text-xs text-white/45">
                              {isWeak ? 'Найслабша сфера, яку варто підсилити в карті року' : 'Сфера теж враховується в побудові карти року'}
                            </div>
                          </div>
                          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-white">
                            {score}/10
                          </div>
                        </div>
                        <Progress value={score * 10} size="sm" className="mt-3" />
                      </div>
                    )})
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/55">
                      Спочатку заповни колесо балансу. Після цього AI зможе сформувати карту року на базі слабких сфер.
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={handleGenerateMap} loading={isGeneratingMap || setupStep === 'generating'} disabled={Object.keys(wheelScores).length === 0}>
                    Сформувати карту з AI
                  </Button>
                  <Button variant="outline" color="white" onClick={() => navigate(ROUTES.WHEEL)}>
                    Перейти до колеса
                  </Button>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[rgba(7,12,24,0.88)] p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Крок {setupStep === 'confirm' ? '3' : setupStep === 'generating' ? '2' : '2'}
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {setupStep === 'confirm' ? 'Підтвердження карти' : setupStep === 'generating' ? 'AI формує карту' : 'Що зʼявиться після генерації'}
                </h3>

                {setupStep === 'generating' ? (
                  <div className="mt-5 space-y-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[var(--accent)]" />
                    <p className="text-sm leading-6 text-white/60">
                      AI формує identity, 5 вимірювальних цілей і перші місяці фокусу. Це не fullscreen blocking overlay, а вбудований крок прямо в Точка Б.
                    </p>
                  </div>
                ) : setupStep === 'confirm' && generatedPreview ? (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-[color:rgba(var(--accent-rgb),0.22)] bg-[color:rgba(var(--accent-rgb),0.08)] p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]/80">Identity</div>
                      <p className="mt-2 text-sm leading-6 text-white">{generatedPreview.identityStatement}</p>
                    </div>
                    <div className="space-y-3">
                      {generatedPreview.goals.map(goal => (
                        <div key={goal.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="text-sm font-semibold text-white">{goal.title}</div>
                          <div className="mt-1 text-xs leading-5 text-white/55">{goal.description}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={handleConfirmGeneratedMap}>Підтвердити та відкрити карту</Button>
                      <Button variant="outline" color="white" onClick={() => setSetupStep('wheel')}>
                        Переглянути ще раз
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 space-y-4 text-sm leading-6 text-white/60">
                    <p>1. AI сформує identity statement: ким ти є наприкінці року.</p>
                    <p>2. Розкладе 5 цілей: одна головна, решта підтримують її.</p>
                    <p>3. Даcть фокус перших місяців, а потім щомісяця чесно аналізуватиме, де ти рухаєшся, а де філониш.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <GlassCard className="border-white/10 bg-[rgba(10,16,31,0.88)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">Місяць</div>
              <div className="mt-3 text-2xl font-semibold text-white">{formatMonthLabel((currentMonthPlan?.month ?? new Date().getMonth() + 1))}</div>
              <div className="mt-1 text-sm text-white/55">
                {(currentMonthPlan?.month ?? new Date().getMonth() + 1)}/12
              </div>
            </GlassCard>

            <GlassCard className="border-white/10 bg-[rgba(10,16,31,0.88)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">Цілей виконано</div>
              <div className="mt-3 text-2xl font-semibold text-white">{completedGoals}/5</div>
              <div className="mt-1 text-sm text-white/55">З головною ціллю в центрі карти</div>
            </GlassCard>

            <GlassCard className="border-white/10 bg-[rgba(10,16,31,0.88)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">Дій цього місяця</div>
              <div className="mt-3 text-2xl font-semibold text-white">{monthCompletion}%</div>
              <div className="mt-1 text-sm text-white/55">
                {currentMonthPlan?.doneActions.length ?? 0}/{currentMonthPlan?.actions.length ?? 0} виконано
              </div>
            </GlassCard>

            <GlassCard className="border-white/10 bg-[rgba(10,16,31,0.88)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">Streak аналізу</div>
              <div className="mt-3 text-2xl font-semibold text-white">{analysisStreak}</div>
              <div className="mt-1 text-sm text-white/55">Місяців поспіль з AI-коментарем</div>
            </GlassCard>
          </div>

          <GlassCard className="border-[color:rgba(var(--accent-rgb),0.28)] bg-[rgba(8,15,31,0.94)] p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]/80">Головна ціль 2026</div>
                <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-white">
                  {mainGoal?.title ?? 'Головна ціль ще формується'}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-white/60">
                  {vision?.statement ?? webMap.identityStatement ?? 'Це центр карти: саме ця ціль тягне інші рішення, місячний фокус і щоденні дії.'}
                </p>
              </div>

              <Button
                variant="outline"
                className="shrink-0 border-[color:rgba(var(--accent-rgb),0.24)] text-[var(--accent)]"
                onClick={() => {
                  setActiveTab('coach')
                  coachRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                AI веде по карті
              </Button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="space-y-2">
                <Progress value={mainGoal?.progress ?? 0} size="md" />
                <div className="text-sm text-white/50">Прогрес головної цілі оновлюється через картки нижче.</div>
              </div>
              <div className="text-right text-3xl font-semibold text-white">{mainGoal?.progress ?? 0}%</div>
            </div>
          </GlassCard>

          <div className="flex flex-wrap gap-2">
            {([
              ['goals', 'Цілі'],
              ['months', 'Місяці'],
              ['analysis', 'Аналіз'],
              ['coach', 'AI-коуч'],
            ] as Array<[ActiveTab, string]>).map(([tabId, label]) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={[
                  'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === tabId
                    ? 'border-[color:rgba(var(--accent-rgb),0.34)] bg-[color:rgba(var(--accent-rgb),0.12)] text-[var(--accent)]'
                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'goals' ? (
            <div className="space-y-4">
              {webMap.goals.map(goal => {
                const tone = getGoalStatusTone(goal.status)
                const isExpanded = expandedGoalId === goal.id
                const isMainGoal = goal.id === webMap.mainGoalId || goal.isMain
                const draftValue = goalDrafts[goal.id] ?? goal.progress

                return (
                  <GlassCard
                    key={goal.id}
                    className={[
                      'border bg-[rgba(10,16,31,0.88)] p-5 transition-colors',
                      isMainGoal ? 'border-[color:rgba(var(--accent-rgb),0.42)]' : 'border-white/10',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                      className="flex w-full items-start justify-between gap-4 text-left"
                    >
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                          Ціль {goal.order}{isMainGoal ? ' · Головна' : ''}
                        </div>
                        <h3 className="text-xl font-semibold text-white">{goal.title}</h3>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${tone.badge}`}>{tone.label}</div>
                        <div className="text-sm font-semibold text-white">{draftValue}%</div>
                        <ChevronDown className={`h-4 w-4 text-white/45 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    <Progress value={draftValue} size="sm" className="mt-4" />

                    {isExpanded ? (
                      <div className="mt-5 space-y-5">
                        <div className="text-sm leading-6 text-white/65">{goal.description ?? 'Опис цілі з’явиться після наступного оновлення карти.'}</div>

                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-[0.18em] text-white/40">Напрями дій</div>
                          <ul className="space-y-2">
                            {goal.actions.map(action => (
                              <li key={action} className="flex items-start gap-2 text-sm leading-6 text-white/70">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-white/40">Місячний фокус</div>
                          <div className="mt-2 text-sm leading-6 text-white/70">{getGoalMonthFocus(goal.id, currentMonthPlan)}</div>
                        </div>

                        <div className="space-y-3">
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={draftValue}
                            label="Оновити прогрес"
                            onValueChange={value => {
                              setGoalDrafts(current => ({
                                ...current,
                                [goal.id]: value,
                              }))
                            }}
                          />
                          <div className="flex flex-wrap gap-3">
                            <Button
                              loading={isUpdatingGoal}
                              onClick={() => handleGoalProgressSave(goal.id, draftValue, goal.status)}
                            >
                              Зберегти прогрес
                            </Button>
                            <Button
                              variant="outline"
                              color="white"
                              onClick={() =>
                                setGoalDrafts(current => ({
                                  ...current,
                                  [goal.id]: goal.progress,
                                }))
                              }
                            >
                              Скасувати
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </GlassCard>
                )
              })}
            </div>
          ) : null}

          {activeTab === 'months' ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 12 }).map((_, index) => {
                const monthNumber = index + 1
                const monthPlan =
                  webMap.months.find(item => item.month === monthNumber && item.year === webMap.year)
                  ?? null
                const isCurrent = monthNumber === new Date().getMonth() + 1

                return (
                  <GlassCard
                    key={monthNumber}
                    className={[
                      'border p-5',
                      getMonthStatusTone(monthPlan?.status ?? 'planned', isCurrent),
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">Місяць {monthNumber}</div>
                        <h3 className="mt-2 text-lg font-semibold text-white">{formatMonthLabel(monthNumber)}</h3>
                      </div>
                      {isCurrent ? (
                        <div className="rounded-full border border-[color:rgba(var(--accent-rgb),0.22)] bg-[color:rgba(var(--accent-rgb),0.1)] px-3 py-1 text-xs text-[var(--accent)]">
                          Поточний
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 text-sm leading-6 text-white/65">
                      {monthPlan?.focus ?? 'Фокус сформується після AI-аналізу або під час запуску наступного місяця.'}
                    </div>

                    <ul className="mt-4 space-y-2 text-sm text-white/60">
                      {(monthPlan?.actions ?? []).slice(0, 3).map(action => (
                        <li key={action} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>

                    {monthPlan?.aiAnalysis ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">AI-аналіз</div>
                        <div className="mt-2 text-sm leading-6 text-white/65">{monthPlan.aiAnalysis}</div>
                      </div>
                    ) : null}
                  </GlassCard>
                )
              })}
            </div>
          ) : null}

          {activeTab === 'analysis' ? (
            archivedAnalyses.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    color="white"
                    loading={isRunningAnalysis}
                    onClick={async () => {
                      await runMonthlyAnalysis().unwrap()
                    }}
                  >
                    Запустити аналіз зараз
                  </Button>
                </div>
                {archivedAnalyses.map(month => (
                  <GlassCard key={month.id} className="border-white/10 bg-[rgba(10,16,31,0.88)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">AI-звіт</div>
                        <h3 className="mt-2 text-lg font-semibold text-white">
                          {formatMonthLabel(month.month)} {month.year}
                        </h3>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
                        {month.status === 'done' ? 'Закрито' : 'В роботі'}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-white/70">{month.aiAnalysis}</p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">На треку</div>
                        <ul className="mt-3 space-y-2 text-sm text-white/65">
                          {month.doneActions.length > 0 ? month.doneActions.map(item => (
                            <li key={item} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                              <span>{item}</span>
                            </li>
                          )) : <li>Ще немає зафіксованих сильних сигналів.</li>}
                        </ul>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">Потрібна увага</div>
                        <ul className="mt-3 space-y-2 text-sm text-white/65">
                          {month.missedActions.length > 0 ? month.missedActions.map(item => (
                            <li key={item} className="flex items-start gap-2">
                              <TrendingUp className="mt-0.5 h-4 w-4 text-rose-400" />
                              <span>{item}</span>
                            </li>
                          )) : <li>Критичних відставань поки не видно.</li>}
                        </ul>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : (
              <GlassCard className="border-white/10 bg-[rgba(10,16,31,0.88)] p-6 text-center">
                <h3 className="text-xl font-semibold text-white">Аналіз з’явиться після завершення першого місяця</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  Коли перший місяць буде закрито, AI збере прогрес по карті, покаже що реально рухається і де з’являється саботаж.
                </p>
              </GlassCard>
            )
          ) : null}

          {activeTab === 'coach' ? (
            <div ref={coachRef} className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <GlassCard className="border-white/10 bg-[rgba(10,16,31,0.88)] p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">Швидкі дії</div>
                <h3 className="mt-2 text-2xl font-semibold text-white">AI-коуч по карті</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  Став коротке запитання по карті року, поточному місяцю або тому, де саме ти пробуксовуєш.
                </p>

                <div className="mt-5 grid gap-2">
                  {QUICK_PROMPTS.map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/70 transition-colors hover:border-[color:rgba(var(--accent-rgb),0.22)] hover:text-white"
                      onClick={() => {
                        void handleCoachPrompt(prompt)
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-[color:rgba(var(--accent-rgb),0.18)] bg-[color:rgba(var(--accent-rgb),0.08)] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]/80">Точка Б</div>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {webMap.identityStatement ?? vision?.statement ?? 'Identity statement зʼявиться після генерації карти.'}
                  </p>
                </div>
              </GlassCard>

              <GlassCard className="border-white/10 bg-[rgba(10,16,31,0.88)] p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/40">
                  <MessageCircle className="h-4 w-4" />
                  Живий чат
                </div>

                <div className="mt-4 h-[28rem] space-y-3 overflow-y-auto rounded-[24px] border border-white/10 bg-[rgba(7,12,24,0.86)] p-4">
                  {chatMessages.map(message => (
                    <div
                      key={message.id}
                      className={[
                        'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6',
                        message.role === 'assistant'
                          ? 'border border-white/10 bg-white/[0.03] text-white/75'
                          : 'ml-auto border border-[color:rgba(var(--accent-rgb),0.22)] bg-[color:rgba(var(--accent-rgb),0.12)] text-white',
                      ].join(' ')}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  <Textarea
                    value={chatInput}
                    onChange={event => setChatInput(event.target.value)}
                    placeholder="Напиши питання до AI-коуча по своїй карті..."
                    className="min-h-[110px]"
                  />
                  <div className="flex justify-end">
                    <Button loading={isCoachLoading} onClick={() => { void handleCoachPrompt(chatInput) }}>
                      Надіслати
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
