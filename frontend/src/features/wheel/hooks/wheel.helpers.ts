// frontend/src/features/wheel/services/wheel.types.ts
import { withNormalizer } from '@/shared/utils/apiNormalizer'

export type WheelArea =
  | 'health'
  | 'career'
  | 'finance'
  | 'relationships'
  | 'personal_growth'
  | 'fun'
  | 'environment'
  | 'inner_support'
  | 'spirituality'

export interface WheelCategory {
  id: string
  name: string
  nameUk: string
  emoji: string
  color: string
  label?: string
  description?: string
}

export const WHEEL_CATEGORIES: WheelCategory[] = [
  { id: 'health', name: 'Health', nameUk: "Здоров'я", emoji: '💪', color: '#10B981', description: 'Енергія, сон, харчування' },
  { id: 'career', name: 'Career', nameUk: "Кар'єра", emoji: '💼', color: '#3B82F6', description: 'Навчання, навички' },
  { id: 'finance', name: 'Finance', nameUk: 'Фінанси', emoji: '💰', color: '#F59E0B', description: 'Дохід, стабільність' },
  { id: 'relationships', name: 'Relationships', nameUk: 'Стосунки', emoji: '❤️', color: '#EF4444', description: 'Робота, призвання' },
  { id: 'personal_growth', name: 'Personal Growth', nameUk: 'Особистий ріст', emoji: '🌱', color: '#8B5CF6', description: 'Розвиток, навички' },
  { id: 'fun', name: 'Fun & Recreation', nameUk: 'Відпочинок', emoji: '🎉', color: '#EC4899', description: 'Хобі, радість' },
  { id: 'environment', name: 'Environment', nameUk: 'Оточення', emoji: '🏠', color: '#06B6D4', description: 'Сенс, цінності' },
  { id: 'spirituality', name: 'Spirituality', nameUk: 'Духовність', emoji: '✨', color: '#A855F7', description: 'Дім, порядок' },
]

export const normalizeWheelCategory = withNormalizer<any, WheelCategory>(api => ({
  id: String(api.id),
  name: api.name,
  nameUk: api.nameUk,
  emoji: api.emoji,
  color: api.color,
  label: api.label,
  description: api.description,
}))

export interface WheelScore {
  category_id: string
  score: number
  notes?: string
}

export const normalizeWheelScore = withNormalizer<any, WheelScore>(api => ({
  category_id: String(api.categoryId),
  score: Number(api.score),
  notes: api.notes ?? undefined,
}))

export interface WheelAssessment {
  id: string
  userId: string
  scores: WheelScore[]
  totalScore: number
  averageScore: number
  strengths?: string[]
  gaps?: string[]
  createdAt: string
  completedAt: string
  notes?: string
}

export const normalizeWheelAssessment = withNormalizer<any, WheelAssessment>(api => ({
  id: String(api.id),
  userId: String(api.userId),
  scores: normalizeWheelScore(api.scores ?? []) as WheelScore[],
  totalScore: Number(api.totalScore),
  averageScore: Number(api.averageScore),
  strengths: api.strengths ?? [],
  gaps: api.gaps ?? [],
  createdAt: api.createdAt,
  completedAt: api.completedAt ?? undefined,
  notes: api.notes ?? undefined,
}))

export interface WheelAnalysis {
  strengths: WheelCategory[]
  gaps: WheelCategory[]
  recommendations: string[]
  focusArea: WheelCategory
  balanceScore: number
}

export const normalizeWheelAnalysis = withNormalizer<any, WheelAnalysis>(api => ({
  strengths: normalizeWheelCategory(api.strengths ?? []) as WheelCategory[],
  gaps: normalizeWheelCategory(api.gaps ?? []) as WheelCategory[],
  recommendations: api.recommendations ?? [],
  focusArea: normalizeWheelCategory(api.focusArea) as WheelCategory,
  balanceScore: Number(api.balanceScore),
}))

export interface WheelDelta {
  area: WheelArea
  delta: number
  source: 'microTask'
  relatedTaskId: string
  createdAt: string
}
