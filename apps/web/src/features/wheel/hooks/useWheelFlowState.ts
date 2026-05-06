import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  WHEEL_CATEGORIES,
  isWheelSphereId,
  type WheelSphereId,
} from '@/features/wheel/types/wheel.types'
import { useWheelStore } from '@/features/wheel/store/useWheelStore'
import { ensureSphereActions } from '@/features/wheel/utils/wheel.utils'

export interface SphereState {
  categoryId: WheelSphereId
  score: number | null
  note: string
  touched: boolean
}

interface WheelDraftSession {
  step: number
  spheres: SphereState[]
}

interface WheelFlowState {
  step: number
  spheres: SphereState[]
  activeSphere: SphereState
  activeSphereIndex: number
  isFirstStep: boolean
  isLastStep: boolean
  canProceed: boolean
  nextStep: () => void
  prevStep: () => void
  setScore: (index: number, value: number) => void
  setNote: (index: number, value: string) => void
  goToStep: (step: number) => void
  restart: () => void
  clearDraft: () => void
}

const DRAFT_KEY = 'starway_wheel_draft_v2'
const WHEEL_PAGE_STATE_KEYS = ['wheel_state_v1', 'wheel_state_v2'] as const

const buildFresh = (): SphereState[] =>
  WHEEL_CATEGORIES.map(category => ({
    categoryId: category.id,
    score: 0,
    note: '',
    touched: false,
  }))

const isSphereArray = (value: unknown): value is SphereState[] =>
  Array.isArray(value) &&
  value.length === WHEEL_CATEGORIES.length &&
  value.every((item) => {
    if (typeof item !== 'object' || item === null) return false
    return isWheelSphereId(Reflect.get(item, 'categoryId'))
  })

export const readWheelDraftSession = (): WheelDraftSession | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    const step = Number(
      typeof parsed === 'object' && parsed !== null ? Reflect.get(parsed, 'step') ?? 1 : 1
    )
    const parsedSpheres =
      typeof parsed === 'object' && parsed !== null ? Reflect.get(parsed, 'spheres') : undefined
    if (!isSphereArray(parsedSpheres)) return null
    return {
      step: Math.min(WHEEL_CATEGORIES.length, Math.max(1, step)),
      spheres: parsedSpheres.map((sphere) => ({
        categoryId: sphere.categoryId,
        score: typeof sphere.score === 'number' ? sphere.score : 0,
        note:
          typeof sphere.note === 'string'
            ? sphere.note
            : typeof Reflect.get(sphere, 'comment') === 'string'
              ? String(Reflect.get(sphere, 'comment'))
              : '',
        touched: typeof sphere.touched === 'boolean' ? sphere.touched : false,
      })),
    }
  } catch {
    return null
  }
}

const persistDraft = (draft: WheelDraftSession) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // ignore localStorage limits
  }
}

export const resetWheelPersistedState = () => {
  try {
    localStorage.removeItem(DRAFT_KEY)
    WHEEL_PAGE_STATE_KEYS.forEach((key) => localStorage.removeItem(key))
  } catch {
    // ignore localStorage limits
  }
  useWheelStore.getState().resetWheel()
}

const buildFromWheelStore = (): SphereState[] => {
  const storeSpheres = useWheelStore.getState().spheres

  return WHEEL_CATEGORIES.map((category) => {
    const existing = storeSpheres.find((sphere) => sphere.id === category.id)

    return {
      categoryId: category.id,
      score: existing?.score ?? 0,
      note: existing?.note ?? '',
      touched: existing ? existing.score >= 0 : false,
    }
  })
}

const syncWheelStore = (spheres: SphereState[]) => {
  const setSpheres = useWheelStore.getState().setSpheres

  setSpheres((current) =>
    ensureSphereActions(
      WHEEL_CATEGORIES.map((category) => {
        const existing = current.find((sphere) => sphere.id === category.id)
        const draftSphere = spheres.find((sphere) => sphere.categoryId === category.id)

        return {
          id: category.id,
          name: existing?.name ?? category.nameUk ?? category.name,
          color: existing?.color ?? category.color,
          score: draftSphere?.score ?? 0,
          note: draftSphere?.note ?? '',
          actions: existing?.actions ?? [],
        }
      })
    )
  )
}

export function useWheelFlowState(freshStart = false): WheelFlowState {
  const initialDraft = useMemo(
    () => (freshStart ? null : readWheelDraftSession()),
    [freshStart]
  )
  const [step, setStep] = useState(initialDraft?.step ?? 1)
  const [spheres, setSpheres] = useState<SphereState[]>(
    initialDraft?.spheres ?? (freshStart ? buildFresh() : buildFromWheelStore()),
  )

  useEffect(() => {
    if (freshStart) {
      resetWheelPersistedState()
      return
    }
    persistDraft({ step, spheres })
  }, [freshStart, step, spheres])

  useEffect(() => {
    syncWheelStore(spheres)
  }, [spheres])

  const activeSphereIndex = Math.max(0, step - 1)
  const activeSphere = spheres[activeSphereIndex] ?? spheres[0]
  const isFirstStep = step === 1
  const isLastStep = step === WHEEL_CATEGORIES.length
  const canProceed = Boolean(activeSphere?.touched) && activeSphere?.score != null && activeSphere.score >= 0

  const nextStep = useCallback(() => {
    setStep(current => Math.min(WHEEL_CATEGORIES.length, current + 1))
  }, [])

  const prevStep = useCallback(() => {
    setStep(current => Math.max(1, current - 1))
  }, [])

  const setScore = useCallback((index: number, value: number) => {
    setSpheres(current =>
      current.map((sphere, sphereIndex) =>
        sphereIndex === index ? { ...sphere, score: value, touched: true } : sphere,
      ),
    )
  }, [])

  const setNote = useCallback((index: number, value: string) => {
    setSpheres(current =>
      current.map((sphere, sphereIndex) =>
        sphereIndex === index ? { ...sphere, note: value } : sphere,
      ),
    )
  }, [])

  const goToStep = useCallback((nextStep: number) => {
    setStep(Math.min(WHEEL_CATEGORIES.length, Math.max(1, nextStep)))
  }, [])

  const restart = useCallback(() => {
    setStep(1)
    setSpheres(buildFresh())
    resetWheelPersistedState()
  }, [])

  const clearDraft = useCallback(() => {
    resetWheelPersistedState()
  }, [])

  return {
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
  }
}
