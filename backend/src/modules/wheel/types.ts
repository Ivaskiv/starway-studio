export type WheelSphereId =
  | 'finance'
  | 'career'
  | 'relationships'
  | 'energy'
  | 'freedom'
  | 'mind'
  | 'health'
  | 'selfDevelopment'

export const WHEEL_SPHERES: WheelSphereId[] = [
  'finance',
  'career',
  'relationships',
  'energy',
  'freedom',
  'mind',
  'health',
  'selfDevelopment',
]

export function isWheelSphereId(value: unknown): value is WheelSphereId {
  return typeof value === 'string' && WHEEL_SPHERES.some((id) => id === value)
}

export const FIXED_SPHERES = [...WHEEL_SPHERES]

export const SPHERE_LABELS: Record<WheelSphereId, string> = {
  finance: 'Гроші',
  career: 'Реалізація',
  relationships: 'Відносини',
  energy: 'Енергія/Тіло',
  freedom: 'Свобода/Час',
  mind: 'Духовність',
  health: "Здоров'я",
  selfDevelopment: 'Розвиток',
}

export interface WheelConfigItem {
  id: WheelSphereId
  label: string
  emoji: string
  description: string
}

export const WHEEL_CONFIG: WheelConfigItem[] = [
  { id: 'finance', label: 'Гроші', emoji: '💰', description: 'Фінансова стабільність' },
  { id: 'career', label: 'Реалізація', emoji: '🎯', description: "Кар'єра та досягнення" },
  { id: 'relationships', label: 'Відносини', emoji: '❤️', description: "Сім'я та друзі" },
  { id: 'energy', label: 'Енергія', emoji: '⚡', description: 'Фізична форма' },
  { id: 'freedom', label: 'Свобода', emoji: '🕊️', description: 'Час для себе' },
  { id: 'mind', label: 'Духовність', emoji: '🧘', description: 'Спокій та впевненість' },
  { id: 'health', label: "Здоров'я", emoji: '🏥', description: "Фізичне здоров'я" },
  { id: 'selfDevelopment', label: 'Розвиток', emoji: '📚', description: 'Навчання та зростання' },
]

export interface WheelScore {
  categoryId: WheelSphereId
  score: number
  comment?: string | null
}

export type WheelScoreMap = Record<WheelSphereId, number>

export interface WheelUserContext {
  name: string
  email?: string | null
  phone?: string | null
  age?: number | null
}

export interface PersonalityProfile {
  decisionStyle: string
  motivationType: string
  stressPattern: string
  growthDriver: string
}

export interface TrajectoryPrediction {
  riskAreas: string[]
  growthPotential: string[]
  predictionSummary: string
}

export interface ActionPlanItem {
  day: number
  action: string
}

export interface AdaptiveMission {
  mission: string
  rationale: string
}

export interface WheelInsights {
  analysis: string
  diagnosis: string
  personalityProfile: PersonalityProfile
  trajectoryPrediction: TrajectoryPrediction
  actionPlan: ActionPlanItem[]
  adaptiveMissions: AdaptiveMission[]
}

export interface WheelGamificationSnapshot {
  bitMind: number
  mindXP: number
  neuroGems: number
  level: number
  levelTitle: string
  xpToNextLevel: number
  currentStreakDays: number | undefined
  streak: Record<string, number>
}

export interface WheelPDFData {
  userName: string
  createdAt: string
  scores: WheelScore[]
  weakestSphere: WheelSphereId
  focusSphere: WheelSphereId
  insights: WheelInsights
  gamification?: WheelGamificationSnapshot
}

export interface WheelAnalytics {
  totalAssessments: number
  averageScores: Record<WheelSphereId, number>
  balanceIndex: number
  trend: 'improving' | 'stable' | 'declining'
  weakestHistory: WheelSphereId[]
  mostCommonWeakest?: WheelSphereId
  mostCommonFocus?: WheelSphereId
}

export interface WheelNotificationPayload {
  insights: WheelInsights
  weakestSphere: WheelSphereId
  focusSphere: WheelSphereId
  scores: WheelScore[]
  pdfUrl: string
  gamification?: WheelGamificationSnapshot
}

export interface WheelCooldownStatus {
  canFill: boolean
  regenCount: number
  regenLeft: number
  nextWheelAt: string | null
  lastWheelAt: string | null
}

export interface WheelResponsePayload {
  success: true
  wheel: { id: string }
  insights: WheelInsights
  analytics: WheelAnalytics
  pdfUrl: string
  gamification?: WheelGamificationSnapshot
}
