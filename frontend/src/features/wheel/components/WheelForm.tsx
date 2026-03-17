// frontend/src/features/wheel/components/WheelForm.tsx
// ─────────────────────────────────────────────────────────
// Переписано: використання централізованих стилів системи
// liquid-glass, glass-button, card-surface, hero-h1
// Tailwind utility хаос прибраний — тепер UI консистентний
// ─────────────────────────────────────────────────────────

import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { toast } from 'react-hot-toast'

import { useAppSelector } from '@/app/hooks'
import { useCreateWheelAssessmentMutation } from '@/features/wheel/services/wheel.api'
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types'
import { Button } from '@/ui/Button'

import { useWheelFlowState } from '../hooks/useWheelFlowState'
import { ResultView } from './ResultView'
import { SphereSlider } from './SphereSlider'
import { StepCard } from './StepCard'
import { WheelChart } from './WheelChart'

// ─────────────────────────────────────────────────────────
// Toast helpers
// ─────────────────────────────────────────────────────────
const wt = {
  error: (key: string, msg?: string) => {
    const messages: Record<string, string> = {
      scoreRequired: 'Спочатку поставте оцінку',
      missingUser: 'Користувач не визначений',
      limitReached: 'Досягнуто ліміт генерацій (3)',
      saveError: msg ?? 'Помилка збереження',
    }
    toast.error(messages[key] ?? key)
  },
  success: (key: string) => {
    const messages: Record<string, string> = {
      saved: 'Колесо збережено ✓',
    }
    toast.success(messages[key] ?? key)
  },
}

// ─────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────
interface WheelFormProps {
  userId?: string
  onComplete?: (assessmentId: string) => void
  onCancel?: () => void
  nextWheelAvailable?: Date
}

// ═════════════════════════════════════════════════════════
export const WheelForm = ({ userId, onComplete, onCancel, nextWheelAvailable }: WheelFormProps) => {
  const authUserId = useAppSelector(s => s.auth.user?.id)
  const resolvedUserId = userId || authUserId || ''

  const MAX_GENERATIONS = 3

  const {
    step,
    setStep,
    spheres,
    activeSphere,
    activeSphereIndex,
    generationsUsed,
    setGenerationsUsed,
    isResultStep,
    isIntroStep,
    canProceed,
    setScore,
    setComment,
    restart,
    clearDraft,
  } = useWheelFlowState()

  const [saveWheel, { isLoading }] = useCreateWheelAssessmentMutation()

  // ─────────────────────────────────────────────────────────
  // Step label
  // ─────────────────────────────────────────────────────────
  const stepLabel = useMemo(() => {
    if (isIntroStep) return 'Вступ'
    if (isResultStep) return `Крок ${WHEEL_CATEGORIES.length} із ${WHEEL_CATEGORIES.length}`
    return `Крок ${step} із ${WHEEL_CATEGORIES.length}`
  }, [step, isIntroStep, isResultStep])

  // ─────────────────────────────────────────────────────────
  // Navigation handlers
  // ─────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (!canProceed) {
      wt.error('scoreRequired')
      return
    }

    setStep(prev => Math.min(WHEEL_CATEGORIES.length + 1, prev + 1))
  }, [canProceed, setStep])

  const handlePrev = useCallback(() => {
    if (step === 0) {
      onCancel?.()
      return
    }

    setStep(prev => Math.max(0, prev - 1))
  }, [step, onCancel, setStep])

  // ─────────────────────────────────────────────────────────
  // Save assessment
  // ─────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!resolvedUserId) {
      wt.error('missingUser')
      return
    }

    if (generationsUsed >= MAX_GENERATIONS) {
      wt.error('limitReached')
      return
    }

    try {
      const result = await saveWheel({
        userId: resolvedUserId,
        scores: spheres.map(s => ({
          categoryId: s.categoryId,
          score: s.score ?? 1,
          comment: s.comment || undefined,
        })),
      }).unwrap()

      setGenerationsUsed(prev => prev + 1)

      wt.success('saved')

      clearDraft()

      onComplete?.(result.id)
    } catch (err: any) {
      const msg = err?.data?.error || err?.error
      wt.error('saveError', msg ? String(msg) : undefined)
    }
  }, [
    resolvedUserId,
    generationsUsed,
    saveWheel,
    spheres,
    setGenerationsUsed,
    onComplete,
    clearDraft,
  ])

  // ─────────────────────────────────────────────────────────
  // Progress
  // ─────────────────────────────────────────────────────────
  const progressPct = isIntroStep
    ? 0
    : isResultStep
    ? 100
    : Math.round((step / WHEEL_CATEGORIES.length) * 100)

  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!progressRef.current) return

    progressRef.current.style.width = `${progressPct}%`
    // progressRef.current.style.background =
    //   'linear-gradient(90deg,rgba(var(--accent-soft-rgb),0.7),rgba(var(--accent-rgb),1))'
  }, [progressPct])

  // ─────────────────────────────────────────────────────────
  // Active sphere title
  // ─────────────────────────────────────────────────────────
  const cardTitle = isIntroStep
    ? 'Колесо балансу'
    : isResultStep
    ? 'Результат'
    : WHEEL_CATEGORIES[activeSphereIndex]?.nameUk ?? 'Сфера'

  const cardSubtitle = isIntroStep
    ? `${WHEEL_CATEGORIES.length} сфер · оцінка 1–10`
    : !isResultStep
    ? `${WHEEL_CATEGORIES[activeSphereIndex]?.emoji ?? ''}`
    : undefined

  return (
    <div className="mx-auto max-w-[480px] space-y-1 py-1">

      {/* ───────────────────────────────────────── */}
      {/* Step label + progress */}
      {/* ───────────────────────────────────────── */}

      <div className="space-y-2">

        <div className="flex items-center justify-between text-xs text-white/40">
          <p>{stepLabel}</p>

          {!isIntroStep && (
            <p className="tabular-nums">{progressPct}%</p>
          )}
        </div>

        {!isIntroStep && (
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              ref={progressRef}
              className="h-full transition-[width] duration-500 ease-out"
            />
          </div>
        )}

      </div>

      {/* ───────────────────────────────────────── */}
      {/* Main card */}
      {/* ───────────────────────────────────────── */}

      <div className="card-surface liquid-glass">

        <StepCard
          key={step}
          title={cardTitle}
          subtitle={cardSubtitle}
        >

          {/* Intro */}
          {isIntroStep && (
            <div className="space-y-6">

              <WheelChart
                scores={spheres}
                size={260}
              />

              <div className="mt-10 space-y-2 text-sm text-white/60">

                <p>• Оцініть кожну з {WHEEL_CATEGORIES.length} сфер</p>

                <p>• Шкала від 1 до 10</p>

                <p>• Додайте короткий коментар</p>

              </div>


            </div>
          )}

          {/* Sphere slider */}
          {!isIntroStep && !isResultStep && activeSphere && (
            <SphereSlider
              title={WHEEL_CATEGORIES[activeSphereIndex]?.nameUk ?? 'Сфера'}
              description="1 = потребує уваги · 10 = стабільно"
              score={activeSphere.score}
              comment={activeSphere.comment}
              onScoreChange={v => setScore(activeSphereIndex, v)}
              onCommentChange={v => setComment(activeSphereIndex, v)}
            />
          )}

          {/* Result */}
          {isResultStep && (
            <ResultView
              scores={spheres}
              generationsUsed={generationsUsed}
              maxGenerations={MAX_GENERATIONS}
              isSubmitting={isLoading}
              onGenerate={handleGenerate}
              nextWheelAvailable={nextWheelAvailable}
            />
          )}

        </StepCard>

      </div>

      {/* ───────────────────────────────────────── */}
      {/* Navigation */}
      {/* ───────────────────────────────────────── */}

      <div className="flex items-center justify-between">

        <Button
          onClick={handlePrev}
          variant="ghost"
          className="glass-button"
        >
          <span className="flex items-center gap-2 text-white/75">
            <ChevronLeft size={16} />
            {isIntroStep ? 'Скасувати' : 'Назад'}
          </span>
        </Button>

        {isResultStep ? (

          <Button
            onClick={restart}
            className="hero-cta-secondary"
          >
            <span className="flex items-center gap-2">
              <RotateCcw size={16} />
              Почати заново
            </span>
          </Button>

        ) : (

          <button
            onClick={handleNext}
            className="hero-cta-primary hero-plan-btn flex items-center gap-2"
          >
            {isIntroStep ? 'Почати' : 'Далі'}
            <ChevronRight size={16} />
          </button>

        )}

      </div>

      {/* ───────────────────────────────────────── */}
      {/* Generation note */}
      {/* ───────────────────────────────────────── */}

      {isResultStep && (
        <p className="text-center text-xs text-white/35">
          Використано {generationsUsed} із {MAX_GENERATIONS} генерацій
        </p>
      )}

    </div>
  )
}
