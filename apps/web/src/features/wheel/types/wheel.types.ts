import type { ElementType } from 'react'

import { ABILITIES, type Ability } from '@/features/auth/permissions/abilities'
import {
  LayoutDashboard,
  Package,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  User,
} from 'lucide-react'

export const WHEEL_SPHERE_IDS = [
  'finance',
  'career',
  'relationships',
  'energy',
  'freedom',
  'mind',
  'health',
  'selfDevelopment',
] as const

export type WheelSphereId = (typeof WHEEL_SPHERE_IDS)[number]
export type WheelArea = WheelSphereId

export function isWheelSphereId(value: unknown): value is WheelSphereId {
  return typeof value === 'string' && WHEEL_SPHERE_IDS.some((id) => id === value)
}

export function toWheelSphereId(value: unknown): WheelSphereId | null {
  return isWheelSphereId(value) ? value : null
}

export interface WheelAction {
  text: string
  source: 'ai' | 'user'
}

export interface WheelSphere {
  id: WheelSphereId
  name: string
  score: number
  color: string
  note?: string
  actions?: WheelAction[]
}

export interface WheelCategory {
  id: WheelSphereId
  name: string
  nameUk: string
  description: string
  order: number
  emoji: string
  color: string
}

export interface WheelScore {
  categoryId: WheelSphereId
  score: number
  note?: string
  comment?: string
  emoji?: string
}

export interface WheelAssessment {
  id: string
  userId: string
  scores: WheelScore[]
  totalScore: number
  averageScore: number
  strengths?: string[]
  gaps?: string[]
  createdAt: string
  completedAt?: string
  notes?: string
}

export interface WheelAnalysis {
  strengths: WheelCategory[]
  gaps: WheelCategory[]
  recommendations: string[]
  focusArea: WheelCategory
  balanceScore: number
}

export interface SaveWheelRequest {
  scores: WheelScore[]
}

export interface SaveWheelResponse {
  id: string
  userId: string
  createdAt: string
}

const normalizeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const normalizeNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
      ? Number(value)
      : fallback

export const WHEEL_CATEGORIES: WheelCategory[] = [
  { id: 'finance', name: 'Гроші', nameUk: 'Гроші', description: 'Фінансова стабільність', order: 1, emoji: '💰', color: '#F59E0B' },
  { id: 'career', name: 'Реалізація', nameUk: 'Реалізація', description: 'Цілі, досягнення, кар’єра', order: 2, emoji: '🎯', color: '#3B82F6' },
  { id: 'relationships', name: 'Відносини', nameUk: 'Відносини', description: 'Сім’я, друзі, підтримка', order: 3, emoji: '❤️', color: '#EF4444' },
  { id: 'energy', name: 'Енергія', nameUk: 'Енергія', description: 'Стан тіла, відновлення, сон', order: 4, emoji: '⚡', color: '#8B5CF6' },
  { id: 'freedom', name: 'Свобода', nameUk: 'Свобода', description: 'Час, простір, незалежність', order: 5, emoji: '🕊️', color: '#EC4899' },
  { id: 'mind', name: 'Духовність', nameUk: 'Духовність', description: 'Стабільність, віра, спокій', order: 6, emoji: '🧘', color: '#A855F7' },
  { id: 'health', name: "Здоров'я", nameUk: "Здоров'я", description: 'Фізичне та емоційне благополуччя', order: 7, emoji: '🏥', color: '#022D4A' },
  { id: 'selfDevelopment', name: 'Розвиток', nameUk: 'Розвиток', description: 'Навчання, самовдосконалення', order: 8, emoji: '📚', color: '#14B8A6' },
]

export const WHEEL_INPUT_CATEGORIES = WHEEL_CATEGORIES
export const WHEEL_CATEGORY_MAP = new Map<WheelSphereId, WheelCategory>(
  WHEEL_CATEGORIES.map((category) => [category.id, category])
)

export function normalizeWheelCategory(value: unknown): WheelCategory {
  const id = toWheelSphereId(
    typeof value === 'object' && value !== null ? Reflect.get(value, 'id') : undefined
  ) ?? 'finance'
  const fallback = WHEEL_CATEGORY_MAP.get(id) ?? WHEEL_CATEGORIES[0]

  return {
    id,
    name: normalizeString(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'name') : undefined,
      fallback.name
    ),
    nameUk: normalizeString(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'nameUk') : undefined,
      fallback.nameUk
    ),
    description: normalizeString(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'description') : undefined,
      fallback.description
    ),
    order: normalizeNumber(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'order') : undefined,
      fallback.order
    ),
    emoji: normalizeString(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'emoji') : undefined,
      fallback.emoji
    ),
    color: normalizeString(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'color') : undefined,
      fallback.color
    ),
  }
}

export function normalizeWheelScore(value: unknown): WheelScore {
  const categoryId = toWheelSphereId(
    typeof value === 'object' && value !== null ? Reflect.get(value, 'categoryId') : undefined
  ) ?? 'finance'

  const noteValue =
    typeof value === 'object' && value !== null
      ? Reflect.get(value, 'note') ?? Reflect.get(value, 'notes')
      : undefined

  return {
    categoryId,
    score: normalizeNumber(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'score') : undefined,
      0
    ),
    note: normalizeOptionalString(noteValue),
    comment: normalizeOptionalString(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'comment') : undefined
    ),
    emoji: normalizeOptionalString(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'emoji') : undefined
    ),
  }
}

export function normalizeWheelAssessment(value: unknown): WheelAssessment {
  const scoresValue =
    typeof value === 'object' && value !== null ? Reflect.get(value, 'scores') : undefined
  const rawScores: unknown[] = Array.isArray(scoresValue) ? scoresValue : []
  const strengthsValue =
    typeof value === 'object' && value !== null ? Reflect.get(value, 'strengths') : undefined
  const rawStrengths: unknown[] = Array.isArray(strengthsValue) ? strengthsValue : []
  const gapsValue =
    typeof value === 'object' && value !== null ? Reflect.get(value, 'gaps') : undefined
  const rawGaps: unknown[] = Array.isArray(gapsValue) ? gapsValue : []

  return {
    id: normalizeString(typeof value === 'object' && value !== null ? Reflect.get(value, 'id') : undefined),
    userId: normalizeString(typeof value === 'object' && value !== null ? Reflect.get(value, 'userId') : undefined),
    scores: rawScores.map((score: unknown) => normalizeWheelScore(score)),
    totalScore: normalizeNumber(typeof value === 'object' && value !== null ? Reflect.get(value, 'totalScore') : undefined),
    averageScore: normalizeNumber(typeof value === 'object' && value !== null ? Reflect.get(value, 'averageScore') : undefined),
    strengths: rawStrengths.filter((item: unknown): item is string => typeof item === 'string'),
    gaps: rawGaps.filter((item: unknown): item is string => typeof item === 'string'),
    createdAt: normalizeString(typeof value === 'object' && value !== null ? Reflect.get(value, 'createdAt') : undefined),
    completedAt: normalizeOptionalString(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'completedAt') : undefined
    ),
    notes: normalizeOptionalString(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'notes') : undefined
    ),
  }
}

export function normalizeWheelAnalysis(value: unknown): WheelAnalysis {
  const strengthsValue =
    typeof value === 'object' && value !== null ? Reflect.get(value, 'strengths') : undefined
  const rawStrengths: unknown[] = Array.isArray(strengthsValue) ? strengthsValue : []
  const gapsValue =
    typeof value === 'object' && value !== null ? Reflect.get(value, 'gaps') : undefined
  const rawGaps: unknown[] = Array.isArray(gapsValue) ? gapsValue : []

  return {
    strengths: rawStrengths.map((item: unknown) => normalizeWheelCategory(item)),
    gaps: rawGaps.map((item: unknown) => normalizeWheelCategory(item)),
    recommendations:
      typeof value === 'object' && value !== null && Array.isArray(Reflect.get(value, 'recommendations'))
        ? Reflect.get(value, 'recommendations').filter((item: unknown): item is string => typeof item === 'string')
        : [],
    focusArea: normalizeWheelCategory(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'focusArea') : undefined
    ),
    balanceScore: normalizeNumber(
      typeof value === 'object' && value !== null ? Reflect.get(value, 'balanceScore') : undefined
    ),
  }
}

export interface WheelDelta {
  area: WheelArea
  delta: number
  source: 'microTask'
  relatedTaskId: string
  createdAt: string
}

export const SPHERE_LABELS: Record<WheelSphereId, string> = {
  finance: 'Фінанси',
  career: 'Карʼєра',
  relationships: 'Стосунки',
  energy: 'Енергія',
  freedom: 'Свобода',
  mind: 'Мислення',
  health: 'Здоровʼя',
  selfDevelopment: 'Саморозвиток',
}

export interface WheelPDFData {
  id: string
  userId: string
  userName: string
  isEmail?: boolean
  scores: Array<{
    sphere: string
    score: number
    comment: string
  }>
  weakestSphere: WheelSphereId
  focusSphere: WheelSphereId
  analysis: string
  createdAt: string
}

export interface NavItem {
  to: string
  icon: ElementType
  label: string
  ability?: Ability
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dashboard/wheel', icon: Target, label: 'Колесо балансу', ability: ABILITIES.WHEEL_VIEW },
  { to: '/dashboard/ai-mentor', icon: Sparkles, label: 'ABsystem', ability: ABILITIES.AI_USE },
  { to: '/dashboard/journal', icon: TrendingUp, label: 'Шлях', ability: ABILITIES.PROGRESS_VIEW },
  { to: '/dashboard/products', icon: Package, label: 'Продукти', ability: ABILITIES.PRODUCTS_MANAGE, adminOnly: true },
  { to: '/dashboard/profile', icon: User, label: 'Профіль', ability: ABILITIES.PROFILE_VIEW },
  { to: '/dashboard/settings', icon: Settings, label: 'Налаштування', ability: ABILITIES.SETTINGS_MANAGE },
]

export interface CreateWheelAssessmentInput {
  userId: string
  scores: WheelScore[]
}

export type WheelCooldownKey =
  | 'create'
  | 'download_pdf'
  | 'recalculate'
  | 'view_result'
