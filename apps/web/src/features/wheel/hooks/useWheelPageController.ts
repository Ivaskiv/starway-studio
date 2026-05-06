import { useAppSelector } from '@/app/hooks'
import { ROUTES } from '@/config/routes'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useNextStep } from '@/features/app/useAppFlowStore'
import { useGetWheelHistoryQuery } from '@/features/wheel/api'
import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'
import {
  useWheelActions,
  useWheelMeta,
  useWheelSpheres,
} from '@/features/wheel/store/useWheelStore'
import {
  WHEEL_CATEGORIES,
  type WheelCategory,
  type WheelSphereId,
} from '@/features/wheel/types/wheel.types'
import {
  addAction,
  getWheelInsights,
  removeAction,
  updateAction,
} from '@/features/wheel/utils/wheel.utils'
import { usePaywallStore } from '@/features/paywall/store/usePaywallStore'
import { usePaywall } from '@/features/paywall/usePaywall'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'

const WHEEL_LAST_COMPLETED_KEY = 'wheel_last_completed'
const PAYWALL_SESSION_KEY = 'paywall:seenSession'

export type WheelDialogState = {
  kind: 'confirm' | 'modal'
  title: string
  text: string
  confirmText: string
  cancelText?: string
  onConfirm?: () => void
} | null

export function useWheelPageController() {
  const navigate = useNavigate()
  const userId = useAppSelector((state) => state.auth.user?.id ?? '')
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const { trial, trialActive } = useSystemState()
  const currentFlowStep = useNextStep()
  const { isOpen: isPaywallOpen, open: openPaywall, close: closePaywall } = usePaywallStore()
  const spheres = useWheelSpheres()
  const { setSpheres, resetWheel } = useWheelActions()
  const { activeSphereId, setActiveSphere } = useWheelMeta()
  const [pendingFocusKey, setPendingFocusKey] = useState<string | null>(null)
  const [dialogState, setDialogState] = useState<WheelDialogState>(null)
  const [isPending, startTransition] = useTransition()
  const actionInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const trialDaysLeft = Math.max(0, trial?.daysLeft ?? 2)
  const trialProgress = Math.min(100, Math.max(0, ((4 - trialDaysLeft) / 4) * 100))
  const { data: wheelHistory = [] } = useGetWheelHistoryQuery(
    { userId, limit: 4 },
    { skip: !userId }
  )

  const wheelInsights = useMemo(
    () => getWheelInsights(spheres, activeSphereId),
    [activeSphereId, spheres]
  )
  const strongest = wheelInsights?.strongest
  const weakest = wheelInsights?.weakest ?? []
  const weakestSphere = wheelInsights?.weakestSphere ?? null
  const isRecoveryMode = Boolean(wheelInsights?.recoveryMode.length)
  const gap = wheelInsights?.gap ?? 0
  const avgScore = (wheelInsights?.averageScore ?? 0).toFixed(1)
  const aiCtaLabel = isRecoveryMode
    ? WHEEL_TEXTS.analysis.ctaRecovery
    : WHEEL_TEXTS.analysis.ctaPlan
  const categoryMap = useMemo(() => {
    const map = new Map<WheelSphereId, WheelCategory>()
    for (const category of WHEEL_CATEGORIES) {
      map.set(category.id, category)
    }
    return map
  }, [])

  const pdfItems = wheelHistory.slice(0, 3)
  const paywall = usePaywall({
    systemScore: Number(avgScore),
    weakestArea: weakest[0]?.name ?? 'сфера',
    pattern: isRecoveryMode ? 'recovery' : weakest[0] ? `${weakest[0].name} low` : 'system unstable',
    redirectPathAfterPayment: ROUTES.CYCLE,
  })

  const openConfirm = useCallback((config: Omit<NonNullable<WheelDialogState>, 'kind'>) => {
    setDialogState({ kind: 'confirm', ...config })
  }, [])

  const openModal = useCallback((config: Omit<NonNullable<WheelDialogState>, 'kind' | 'cancelText' | 'onConfirm'>) => {
    setDialogState({ kind: 'modal', cancelText: undefined, onConfirm: undefined, ...config })
  }, [])

  const handleOpenSubscription = useCallback(() => {
    navigate(`${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(ROUTES.WHEEL)}`)
  }, [navigate])

  const handleRestartFlow = useCallback(() => {
    resetWheel()
    setPendingFocusKey(null)
    navigate(ROUTES.WHEEL_START)
  }, [navigate, resetWheel])

  const handleScoreChange = useCallback((id: WheelSphereId, value: number) => {
    if (value === 0) {
      openConfirm({
        title: 'Це критично',
        text: 'Ти впевнений, що ця сфера повністю відсутня?',
        confirmText: 'Так, 0',
        cancelText: 'Змінити',
        onConfirm: () => {
          setSpheres((prev) =>
            prev.map((sphere) =>
              sphere.id === id ? { ...sphere, score: 0 } : sphere
            )
          )
          setDialogState(null)
        },
      })
      return
    }

    setSpheres((prev) =>
      prev.map((sphere) =>
        sphere.id === id
          ? { ...sphere, score: Math.max(0, Math.min(10, value)) }
          : sphere
      )
    )
  }, [openConfirm, setSpheres])

  const handleActionChange = useCallback((sphereId: WheelSphereId, index: number, value: string) => {
    setSpheres((prev) =>
      prev.map((sphere) =>
        sphere.id === sphereId ? updateAction(sphere, index, value) : sphere
      )
    )
  }, [setSpheres])

  const handleAddAction = useCallback((sphereId: WheelSphereId) => {
    setSpheres((prev) => {
      const next = prev.map((sphere) =>
        sphere.id === sphereId ? addAction(sphere, '') : sphere
      )
      const target = next.find((sphere) => sphere.id === sphereId)
      const index = (target?.actions?.length ?? 1) - 1

      setPendingFocusKey(`${sphereId}-${index}`)
      return next
    })
  }, [setSpheres])

  const handleRemoveAction = useCallback((sphereId: WheelSphereId, index: number) => {
    setSpheres((prev) =>
      prev.map((sphere) =>
        sphere.id === sphereId ? removeAction(sphere, index) : sphere
      )
    )
  }, [setSpheres])

  const canRestartWheel = useCallback(() => {
    if (typeof window === 'undefined') return true
    const lastCompleted = window.localStorage.getItem(WHEEL_LAST_COMPLETED_KEY)
    if (!lastCompleted) return true
    const diff = Date.now() - Number(lastCompleted)
    return diff > 7 * 24 * 60 * 60 * 1000
  }, [])

  const handleRestartClick = useCallback(() => {
    if (!canRestartWheel()) {
      openModal({ title: 'Ліміт', text: 'Колесо доступне 1 раз на 7 днів', confirmText: 'Ок' })
      return
    }
    openConfirm({
      title: 'Пройти заново?',
      text: 'Всі оцінки буде скинуто',
      confirmText: 'Почати заново',
      cancelText: 'Скасувати',
      onConfirm: () => {
        handleRestartFlow()
        setDialogState(null)
      },
    })
  }, [canRestartWheel, handleRestartFlow, openConfirm, openModal])

  const openRecoveryPaywall = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    const wasSeen =
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem(PAYWALL_SESSION_KEY) === today

    if (wasSeen) {
      navigate(ROUTES.SUBSCRIPTION)
      return
    }

    startTransition(() => {
      openPaywall('recovery')
      if (!usePaywallStore.getState().isOpen) {
        navigate(ROUTES.SUBSCRIPTION)
      }
    })
  }, [navigate, openPaywall])

  const handlePrimaryAction = useCallback(() => {
    if (!wheelInsights?.weakestSphere) return
    if (isRecoveryMode) {
      openRecoveryPaywall()
      return
    }
    navigate(ROUTES.GOALS)
  }, [isRecoveryMode, navigate, openRecoveryPaywall, wheelInsights?.weakestSphere])

  const handleSecondaryAction = useCallback(() => {
    navigate(ROUTES.CYCLE)
  }, [navigate])

  const handleDownloadPdf = useCallback(async (wheelId: string, createdAt: string) => {
    try {
      const headers: Record<string, string> = {}
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`

      const response = await fetch(`/api/wheel/${wheelId}/pdf`, {
        headers,
        credentials: 'include',
      })
      if (!response.ok) throw new Error('pdf_failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `wheel-report-${new Date(createdAt).toISOString().slice(0, 10)}.pdf`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (error) {
      console.error('[Wheel] pdf failed:', error)
    }
  }, [accessToken])

  useEffect(() => {
    if (!pendingFocusKey) return
    const element = actionInputRefs.current[pendingFocusKey]
    if (!element) return
    element.focus()
    setPendingFocusKey(null)
  }, [pendingFocusKey, spheres])

  return {
    actionInputRefs,
    activeSphereId,
    aiCtaLabel,
    avgScore,
    categoryMap,
    closePaywall,
    dialogState,
    gap,
    handleActionChange,
    handleAddAction,
    handleDownloadPdf,
    handleOpenSubscription,
    handlePrimaryAction,
    handleRemoveAction,
    handleRestartClick,
    handleScoreChange,
    isPaywallOpen,
    isPending,
    paywall,
    pdfItems,
    setActiveSphere,
    setDialogState,
    showCycleSection: currentFlowStep === 'cycle',
    spheres,
    strongest,
    handleSecondaryAction,
    trialActive,
    trialDaysLeft,
    trialProgress,
    userId,
    weakest,
    weakestSphere,
    wheelInsights,
  }
}
