import type { WheelSphere, WheelSphereId } from '@/features/wheel/types/wheel.types'

export type GeneratedInsights = {
  main: {
    insight: string
    cause: string
    effect: string
    risk: string
  }
  secondary?: {
    insight: string
  }
  action: {
    text: string
    reason: string
  }
  recoveryMode: Array<{
    id: WheelSphereId
    name: string
    note?: string
  }>
  priority: 'high' | 'normal'
}

type GenerateInsightsInput = {
  spheres: WheelSphere[]
  strongest?: WheelSphere
  weakest: WheelSphere[]
  gap: number
  focusSphereId?: WheelSphereId | null
}

const ACTION_TEMPLATES: Record<WheelSphereId, string[]> = {
  finance: ['Переглянь витрати за 7 днів', 'Автоматизуй 1 джерело доходу'],
  career: ['Закрий 1 задачу, яка рухає вперед', 'Прибери 1 зайвий пріоритет'],
  relationships: ['Ініціюй чесну розмову', 'Виділи 30 хв без телефону'],
  energy: ['Зроби 1 вечір без перевантаження', 'Поверни собі 20 хв тиші'],
  freedom: ['Заблокуй 1 годину тільки для себе', 'Прибери 1 витік часу'],
  mind: ['Запиши 3 свої опори', 'Прибери 1 внутрішній тригер'],
  health: ['Додай 2 тренування', 'Пріоритезуй сон'],
  selfDevelopment: ['20 хв розвитку', 'Закрий 1 крок навчання'],
}

function getSupportSphere(spheres: WheelSphere[], strongest?: WheelSphere) {
  if (!strongest) return undefined
  const sorted = [...spheres].sort((a, b) => b.score - a.score)
  return sorted.find((sphere) => sphere.id !== strongest.id) ?? strongest
}

function getActionText(
  sphere: WheelSphere,
  strongest: WheelSphere | undefined,
  weakest: WheelSphere[]
) {
  const existingAction = sphere.actions?.find((action) => action.text.trim())
  if (existingAction) return existingAction.text

  const templates = ACTION_TEMPLATES[sphere.id]
  if (weakest.some((item) => item.id === sphere.id)) {
    return templates[0] ?? 'Зроби 1 дію'
  }

  if (strongest?.id === sphere.id) {
    return 'Підтримуй темп'
  }

  return templates[1] ?? templates[0] ?? 'Мінімальна дія'
}

function getActionReason(
  sphere: WheelSphere,
  strongest: WheelSphere | undefined,
  weakest: WheelSphere[]
) {
  if (weakest.some((item) => item.id === sphere.id)) {
    return `${sphere.name} зараз потребує першої уваги`
  }

  if (strongest?.id === sphere.id) {
    return `${sphere.name} вже є ресурсом системи`
  }

  return `Мала дія в «${sphere.name}» вирівнює загальний баланс`
}

export function generateInsights({
  spheres,
  strongest,
  weakest,
  gap,
  focusSphereId,
}: GenerateInsightsInput): GeneratedInsights {
  const weakestSphere = weakest[0] ?? spheres[0]
  const supportSphere = getSupportSphere(spheres, strongest)
  const focusSphere =
    spheres.find((sphere) => sphere.id === focusSphereId) ?? weakestSphere
  const recoveryMode = spheres
    .filter((sphere) => sphere.score === 0)
    .map((sphere) => ({
      id: sphere.id,
      name: sphere.name,
      note: sphere.note,
    }))

  if (recoveryMode.length > 0) {
    const recoverySphere = recoveryMode[0]
    const noteText = recoverySphere.note?.trim()
    const microAction = ACTION_TEMPLATES[recoverySphere.id]?.[0] ?? 'Зроби 1 маленьку дію <5 хв'
    const cause = noteText
      ? `Ймовірно причина: ${noteText}`
      : 'Ймовірно причина: сфера довго була без уваги або ресурсу'

    return {
      main: {
        insight: `Ти оцінив ${recoverySphere.name} на 0.`,
        cause,
        effect: `Це означає: ${recoverySphere.name} зараз фактично не тримає систему.`,
        risk: 'Якщо почати з малого 3 дні поспіль, її можна підняти з 0 до 2–3.',
      },
      secondary: {
        insight: `Почни з цього: ${microAction}. Хочеш план відновлення?`,
      },
      action: {
        text: microAction,
        reason: `${recoverySphere.name} у recovery-режимі, тому потрібна одна дуже проста дія без перевантаження`,
      },
      recoveryMode,
      priority: 'high',
    }
  }

  const mainInsight =
    strongest && supportSphere
      ? `Фокус змістився в «${strongest.name}», а «${supportSphere.name}» може підтримати відновлення.`
      : 'Система показує зону, яка потребує першої уваги.'

  const riskText =
    gap > 3
      ? `Різниця > ${gap.toFixed(1)} → система нестабільна`
      : 'Якщо її не вирівняти — вона тягне інші сфери вниз.'

  return {
    main: {
      insight: mainInsight,
      cause: `${weakestSphere.name} ${weakestSphere.score}/10 → блокує ресурс системи`,
      effect: `Слабка зона «${weakestSphere.name}» створює системний дисбаланс.`,
      risk: riskText,
    },
    secondary:
      supportSphere && strongest && supportSphere.id !== strongest.id
        ? {
            insight: `Опора зараз у «${supportSphere.name}» — її варто використати як ресурс.`,
          }
        : undefined,
    action: {
      text: getActionText(focusSphere, strongest, weakest),
      reason: getActionReason(focusSphere, strongest, weakest),
    },
    recoveryMode,
    priority: 'normal',
  }
}
