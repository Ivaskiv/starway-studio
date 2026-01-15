// packages/frontend/src/features/wheel/types/wheel.types.ts

export interface WheelCategory {
  id: string
  name: string
  nameUk: string
  emoji: string
  color: string
}

export const WHEEL_CATEGORIES: WheelCategory[] = [
  { id: 'health', name: 'Health', nameUk: 'Здоров\'я', emoji: '💪', color: '#10B981' },
  { id: 'career', name: 'Career', nameUk: 'Кар\'єра', emoji: '💼', color: '#3B82F6' },
  { id: 'finance', name: 'Finance', nameUk: 'Фінанси', emoji: '💰', color: '#F59E0B' },
  { id: 'relationships', name: 'Relationships', nameUk: 'Стосунки', emoji: '❤️', color: '#EF4444' },
  { id: 'personal_growth', name: 'Personal Growth', nameUk: 'Особистий ріст', emoji: '🌱', color: '#8B5CF6' },
  { id: 'fun', name: 'Fun & Recreation', nameUk: 'Відпочинок', emoji: '🎉', color: '#EC4899' },
  { id: 'environment', name: 'Environment', nameUk: 'Оточення', emoji: '🏠', color: '#06B6D4' },
  { id: 'spirituality', name: 'Spirituality', nameUk: 'Духовність', emoji: '✨', color: '#A855F7' },
]

export const TOTAL_CATEGORIES = WHEEL_CATEGORIES.length

export interface WheelScore {
  category_id: string
  score: number
  notes?: string
}

export interface WheelAssessment {
  id: string
  user_id: string
  scores: WheelScore[]
  total_score: number
  average_score: number
  strengths: string[]
  gaps: string[]
  created_at: string
}

export interface WheelAnalysis {
  strengths: WheelCategory[]
  gaps: WheelCategory[]
  recommendations: string[]
  focus_area: WheelCategory
  balance_score: number
}

export interface WheelFormState {
  currentIndex: number
  scores: WheelScore[]
  isComplete: boolean
}