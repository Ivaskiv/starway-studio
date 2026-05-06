import {
  isWheelSphereId,
  WHEEL_CATEGORY_MAP,
  type WheelAction,
  type WheelScore,
  type WheelSphere,
  type WheelSphereId,
} from '@/features/wheel/types/wheel.types'
import { generateInsights, type GeneratedInsights } from '@/features/wheel/logic/ai.engine'

type ChartDatumInput = {
  id: WheelSphereId
  score: number
  label: string
}

const FALLBACK_META: Record<WheelSphereId, { name: string; color: string }> = {
  finance: { name: 'Гроші', color: '#F59E0B' },
  career: { name: 'Реалізація', color: '#3B82F6' },
  relationships: { name: 'Відносини', color: '#EF4444' },
  energy: { name: 'Енергія', color: '#8B5CF6' },
  freedom: { name: 'Свобода', color: '#EC4899' },
  mind: { name: 'Духовність', color: '#A855F7' },
  health: { name: "Здоров'я", color: '#06B6D4' },
  selfDevelopment: { name: 'Розвиток', color: '#10B981' },
}

// --- ACTION MAP ---
export const ACTION_MAP: Record<WheelSphereId, string[]> = {
  finance: ['Переглянь витрати за 7 днів', 'Автоматизуй 1 джерело доходу'],
  career: ['Закрий 1 задачу, яка рухає вперед', 'Прибери 1 зайвий пріоритет'],
  relationships: ['Ініціюй чесну розмову', 'Виділи 30 хв без телефону'],
  energy: ['Зроби 1 вечір без перевантаження', 'Поверни собі 20 хв тиші'],
  freedom: ['Заблокуй 1 годину тільки для себе', 'Прибери 1 витік часу'],
  mind: ['Запиши 3 свої опори', 'Прибери 1 внутрішній тригер'],
  health: ['Додай 2 тренування', 'Пріоритезуй сон'],
  selfDevelopment: ['20 хв розвитку', 'Закрий 1 крок навчання'],
}

// --- DEFAULT ---
export const DEFAULT_SPHERES: WheelSphere[] = [
  { id: 'finance', name: 'Гроші', score: 7, color: '#F59E0B', note: '' },
  { id: 'career', name: 'Реалізація', score: 6, color: '#3B82F6', note: '' },
  { id: 'relationships', name: 'Відносини', score: 3, color: '#EF4444', note: '' },
  { id: 'energy', name: 'Енергія', score: 7, color: '#8B5CF6', note: '' },
  { id: 'freedom', name: 'Свобода', score: 8, color: '#EC4899', note: '' },
  { id: 'mind', name: 'Духовність', score: 4, color: '#A855F7', note: '' },
  { id: 'health', name: "Здоров'я", score: 5, color: '#06B6D4', note: '' },
  { id: 'selfDevelopment', name: 'Розвиток', score: 6, color: '#10B981', note: '' },
]

// --- META ---
export function getMeta(id: WheelSphereId) {
  const category = WHEEL_CATEGORY_MAP.get(id)
  if (category) {
    return {
      name: category.nameUk || category.name,
      color: category.color,
    }
  }
  return FALLBACK_META[id]
}

// --- ANALYZE ---
export function analyzeWheel(spheres: WheelSphere[]) {
  const sorted = [...spheres].sort((a, b) => b.score - a.score)

  const strongest = sorted[0]
  const weakestScore = sorted[sorted.length - 1]?.score ?? 0

  const weakest = spheres.filter(s => s.score === weakestScore)

  const avg =
    spheres.reduce((sum, s) => sum + s.score, 0) /
    (spheres.length || 1)

  return {
    strongest,
    weakest,
    gap: strongest ? strongest.score - weakestScore : 0,
    balanceIndex: Math.round(avg * 10),
  }
}

// --- RECOMMENDATION ---
export function getRecommendation(
  sphere: WheelSphere,
  strongest?: WheelSphere,
  weakest: WheelSphere[] = []
) {
  if (weakest.some(w => w.id === sphere.id)) {
    return ACTION_MAP[sphere.id]?.[0] ?? 'Зроби 1 дію'
  }

  if (strongest?.id === sphere.id) {
    return 'Підтримуй темп'
  }

  return (
    ACTION_MAP[sphere.id]?.[1] ??
    ACTION_MAP[sphere.id]?.[0] ??
    'Мінімальна дія'
  )
}

// --- AI SUMMARY (ФІКС EXPORT) ---
export function getAISummary(spheres: WheelSphere[]) {
  if (!spheres.length) return ''

  const insights = getWheelInsights(spheres)
  if (!insights) return ''

  return [
    insights.main.cause,
    insights.main.risk,
    insights.secondary?.insight ?? '',
  ]
    .filter(Boolean)
    .join('\n')
}

export type WheelInsights = GeneratedInsights & {
  strongest?: WheelSphere
  weakest: WheelSphere[]
  weakestSphere?: WheelSphere
  gap: number
  balanceIndex: number
  averageScore: number
}

export function getWheelInsights(
  spheres: WheelSphere[],
  focusSphereId?: WheelSphereId | null
): WheelInsights | null {
  if (!spheres.length) return null

  const { strongest, weakest, gap, balanceIndex } = analyzeWheel(spheres)
  const generated = generateInsights({
    spheres,
    strongest,
    weakest,
    gap,
    focusSphereId,
  })

  return {
    ...generated,
    strongest,
    weakest,
    weakestSphere: weakest[0],
    gap,
    balanceIndex,
    averageScore:
      spheres.reduce((sum, sphere) => sum + sphere.score, 0) / spheres.length,
  }
}

// --- ACTIONS ---
export function generateInitialActions(
  sphere: WheelSphere,
  strongest?: WheelSphere,
  weakest: WheelSphere[] = []
): WheelAction[] {
  const primary = getRecommendation(sphere, strongest, weakest)
  const secondary = ACTION_MAP[sphere.id]?.find(a => a !== primary)

  return [primary, secondary]
    .filter((text): text is string => Boolean(text))
    .slice(0, 2)
    .map((text): WheelAction => ({
      text,
      source: 'ai',
    }))
}

export function addAction(sphere: WheelSphere, text: string): WheelSphere {
  const next = [...(sphere.actions ?? [])]
  if (next.length >= 3) return sphere

  const trimmed = text.trim()

  return {
    ...sphere,
    actions: [
      ...next,
      { text: trimmed, source: 'user' },
    ],
  }
}

export function updateAction(
  sphere: WheelSphere,
  index: number,
  text: string
): WheelSphere {
  const next = [...(sphere.actions ?? [])]
  if (!next[index]) {
    if (!text.trim() || next.length >= 3) return sphere

    const nextAction: WheelAction = {
      text: text.trim(),
      source: 'user',
    }
    next[index] = nextAction

    return { ...sphere, actions: next.slice(0, 3) }
  }

  next[index] = {
    ...next[index],
    text: text.trim(),
  }

  return { ...sphere, actions: next }
}

// ✅ ФІКС ВІДСУТНЬОЇ ФУНКЦІЇ
export function removeAction(
  sphere: WheelSphere,
  index: number
): WheelSphere {
  const next = [...(sphere.actions ?? [])]
  next.splice(index, 1)

  return {
    ...sphere,
    actions: next,
  }
}

// --- ENSURE ---
export function ensureSphereActions(spheres: WheelSphere[]) {
  const { strongest, weakest } = analyzeWheel(spheres)

  return spheres.map(s => ({
    ...s,
    actions:
      s.actions?.length
        ? s.actions.slice(0, 3)
        : generateInitialActions(s, strongest, weakest),
  }))
}

// --- RESOLVE ---
export function resolveWheelSpheres({
  data,
  spheres,
  scores,
}: {
  data?: ChartDatumInput[]
  spheres?: WheelSphere[]
  scores?: WheelScore[]
}) {
  if (spheres?.length) return ensureSphereActions(spheres)

  if (data?.length) {
    return ensureSphereActions(
      data.map(item => {
        const meta = getMeta(item.id)
        return {
          id: item.id,
          name: item.label || meta.name,
          score: item.score,
          color: meta.color,
          note: '',
        }
      })
    )
  }

  return ensureSphereActions(
    (scores ?? []).filter((item) => isWheelSphereId(item.categoryId)).map(item => {
      const meta = getMeta(item.categoryId)
      return {
        id: item.categoryId,
        name: meta.name,
        score: item.score,
        color: meta.color,
        note: item.note ?? item.comment ?? '',
      }
    })
  )
}
