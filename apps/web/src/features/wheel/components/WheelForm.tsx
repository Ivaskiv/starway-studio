import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'

import { useAppSelector } from '@/app/hooks'
import { useAppFlowStore } from '@/features/app/useAppFlowStore'
import { WHEEL_SPHERE_QUESTIONS } from '@/features/wheel/constants/wheelContent'
import { useCreateWheelAssessmentMutation } from '@/features/wheel/services/wheel.api'
import {
  WHEEL_CATEGORIES,
  isWheelSphereId,
  type WheelScore,
} from '@/features/wheel/types/wheel.types'
import {
  Button,
  GenerationCurtain,
  useGenerationCurtain,
  withMinimumDelay,
} from '@/ui'

import WheelChart from '@/features/wheel/components/WheelChart'
import { useWheelFlowState } from '../hooks/useWheelFlowState'
import { SphereSlider } from './SphereSlider'

interface WheelFormProps {
  userId?: string
  onComplete?: (assessmentId: string) => void
  onCancel?: () => void
  freshStart?: boolean
}

const progressWidthClassMap = {
  1: 'w-[12.5%]',
  2: 'w-[25%]',
  3: 'w-[37.5%]',
  4: 'w-[50%]',
  5: 'w-[62.5%]',
  6: 'w-[75%]',
  7: 'w-[87.5%]',
  8: 'w-full',
} as const

function getProgressWidthClass(step: number) {
  switch (step) {
    case 1:
      return progressWidthClassMap[1]
    case 2:
      return progressWidthClassMap[2]
    case 3:
      return progressWidthClassMap[3]
    case 4:
      return progressWidthClassMap[4]
    case 5:
      return progressWidthClassMap[5]
    case 6:
      return progressWidthClassMap[6]
    case 7:
      return progressWidthClassMap[7]
    default:
      return progressWidthClassMap[8]
  }
}

export const WheelForm = ({
  userId,
  onComplete,
  onCancel,
  freshStart = false,
}: WheelFormProps) => {
  const authUserId = useAppSelector((state) => state.auth.user?.id)
  const completeWheel = useAppFlowStore((state) => state.completeWheel)
  const resolvedUserId = userId || authUserId || ''
  const [confirmZeroScore, setConfirmZeroScore] = useState<number | null>(null)
  const [infoModal, setInfoModal] = useState<{
    title: string
    text: string
    confirmText: string
  } | null>(null)

  const {
    step,
    spheres,
    activeSphere,
    activeSphereIndex,
    isFirstStep,
    isLastStep,
    canProceed,
    nextStep,
    prevStep,
    setScore,
    setNote,
    goToStep,
    restart,
    clearDraft,
  } = useWheelFlowState(freshStart)

  const [saveWheel, { isLoading }] = useCreateWheelAssessmentMutation()
  const curtainVisible = useGenerationCurtain(isLoading, {
    enterDelay: 120,
    minVisibleMs: 900,
  })

  const category = WHEEL_CATEGORIES[activeSphereIndex]
  const allScoresFilled = spheres.every((sphere) => (sphere.score ?? 0) > 0)
  const hasZeroWithoutComment = useMemo(
    () => spheres.some((sphere) => sphere.score === 0 && (!sphere.note || sphere.note.trim() === '')),
    [spheres]
  )

  const handleNext = useCallback(async () => {
    if (activeSphere?.score == null || !canProceed) {
      toast.error('Спочатку обери оцінку')
      return
    }

    if (!isLastStep) {
      nextStep()
      return
    }

    if (!resolvedUserId) {
      toast.error('Користувач не визначений')
      return
    }

    if (hasZeroWithoutComment) {
      setInfoModal({
        title: 'Додай пояснення',
        text: '0 означає критичний стан — це допоможе створити точний план',
        confirmText: 'Зрозуміло',
      })
      return
    }

    try {
      const scores: WheelScore[] = spheres.map((sphere) => ({
        categoryId: sphere.categoryId,
        score: sphere.score ?? 0,
        note: sphere.note,
        comment: sphere.note,
      }))

      const result = await withMinimumDelay(
        saveWheel({
          userId: resolvedUserId,
          scores,
        }).unwrap(),
        900,
      )

      localStorage.setItem('wheel_last_completed', Date.now().toString())
      clearDraft()
      completeWheel()
      toast.success('Колесо збережено')
      onComplete?.(result.id)
    } catch (error: unknown) {
      const errorData =
        typeof error === 'object' && error !== null ? Reflect.get(error, 'data') : undefined
      const message =
        typeof errorData === 'object' &&
        errorData !== null &&
        typeof Reflect.get(errorData, 'error') === 'string'
          ? String(Reflect.get(errorData, 'error'))
          : typeof error === 'object' &&
              error !== null &&
              typeof Reflect.get(error, 'error') === 'string'
            ? String(Reflect.get(error, 'error'))
            : 'Не вдалося зберегти колесо'
      if (message === 'WHEEL_QUOTA_EXCEEDED') {
        console.warn('quota soft-limit')
        localStorage.setItem('wheel_last_completed', Date.now().toString())
        clearDraft()
        completeWheel()
        onComplete?.('quota-soft-limit')
        return
      }
      toast.error(
        message,
      )
    }
  }, [
    activeSphere?.score,
    canProceed,
    clearDraft,
    completeWheel,
    hasZeroWithoutComment,
    isLastStep,
    nextStep,
    onComplete,
    resolvedUserId,
    saveWheel,
    spheres,
  ])

  const handleBack = useCallback(() => {
    if (isFirstStep) {
      restart()
      onCancel?.()
      return
    }
    prevStep()
  }, [isFirstStep, onCancel, prevStep, restart])

  return (
    <section className="mx-auto max-w-7xl space-y-5">
      {confirmZeroScore != null ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(4,8,20,0.72)] p-4">
          <div className="card-surface w-full max-w-md rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Підтвердження
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              Це критично
            </h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Ти впевнений, що ця сфера повністю відсутня?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmZeroScore(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors duration-150 hover:text-white"
              >
                Змінити
              </button>
              <button
                type="button"
                onClick={() => {
                  setScore(confirmZeroScore, 0)
                  setConfirmZeroScore(null)
                }}
                className="hero-cta-primary rounded-xl px-4 py-2 text-sm font-medium"
              >
                Так, 0
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {infoModal ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(4,8,20,0.72)] p-4">
          <div className="card-surface w-full max-w-md rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Повідомлення
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              {infoModal.title}
            </h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {infoModal.text}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="hero-cta-primary rounded-xl px-4 py-2 text-sm font-medium"
              >
                {infoModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <GenerationCurtain
        open={curtainVisible}
        title="Формуємо колесо"
        subtitle="Зберігаємо 8 сфер і готуємо візуалізацію твого стану."
      />

      <div className="space-y-2 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
          Сфера {step} з {WHEEL_CATEGORIES.length}
        </p>

        <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
          Оціни кожну сферу чесно
        </h1>

        <p className="text-base text-[var(--text-secondary)]">
          Де ти зараз — не де хочеш бути
        </p>
      </div>

      <div className="h-1.5 rounded-full bg-white/10">
        <div
          className={[
            'h-full rounded-full bg-[rgb(var(--accent-rgb))]',
            getProgressWidthClass(step),
          ].join(' ')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
        <WheelChart
          scores={spheres.map((sphere) => ({
            categoryId: sphere.categoryId,
            score: sphere.score ?? 0,
            note: sphere.note,
            comment: sphere.note,
          }))}
          activeCategoryId={category?.id ?? null}
          size={360}
          showInsights={allScoresFilled}
        />

        <SphereSlider
          sphereName={category?.nameUk ?? 'Сфера'}
          sphereDescription={category?.description}
          question={
            category?.id && isWheelSphereId(category.id)
              ? WHEEL_SPHERE_QUESTIONS[category.id]
              : 'Оціни цю сферу чесно.'
          }
          score={activeSphere?.score}
          note={activeSphere?.note ?? ''}
          onScoreChange={(value) => {
            if (value === 0) {
              setConfirmZeroScore(activeSphereIndex)
              return
            }
            setScore(activeSphereIndex, value)
          }}
          onNoteChange={(value) => setNote(activeSphereIndex, value)}
          sphereId={category?.id ?? WHEEL_CATEGORIES[0].id}
          step={step}
        />

        {/* ОЦІНКА + НЕОБОВ'ЯЗКОВЕ ПОЯСНЕННЯ */}
        {/* <div className="space-y-2 mt-4">
          <textarea
            value={activeSphere?.note ?? ''}
            onChange={(e) => setNote(activeSphereIndex, e.target.value)}
            placeholder="Напиши чому саме така оцінка (необов'язково)"
            className="w-full min-h-[70px] resize-none rounded-lg bg-white/5 p-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-white/20"
          />
        </div> */}
      </div>

      {/* <WheelInputList
        spheres={spheres}
        activeIndex={activeSphereIndex}
        onSelect={(index) => goToStep(index + 1)}
        onScoreChange={setScore}
        onNoteChange={setNote}
      /> */}

      <div className="flex items-center justify-between gap-3">
        <Button
          onClick={handleBack}
          variant="ghost"
          className="glass-button min-w-[160px]"
        >
          <span className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Назад
          </span>
        </Button>

        <div className="flex items-center gap-2">
          {WHEEL_CATEGORIES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              title={`Перейти до ${item.nameUk}`}
              onClick={() => goToStep(index + 1)}
              className={[
                'h-3 w-3 rounded-full transition-all duration-200',
                index === activeSphereIndex
                  ? 'bg-[rgb(var(--accent-rgb))]'
                  : index < activeSphereIndex
                  ? 'bg-[rgb(29,158,117)]'
                  : 'bg-white/15',
              ].join(' ')}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          variant="solid"
          className="hero-cta-primary min-w-[220px]"
        >
          <span className="flex items-center gap-2">
            {isLastStep ? 'Завершити діагностику' : 'Далі'}
            <ChevronRight className="h-4 w-4" />
          </span>
        </Button>
      </div>
    </section>
  )
}
