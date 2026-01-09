// features/wheel/types/wheel.types.ts

export interface WheelCategory {
  id: string
  name: string
  nameUk: string
  icon: string
  color: string
}

export const WHEEL_CATEGORIES: WheelCategory[] = [
  { id: 'health', name: 'Health', nameUk: 'Здоров\'я', icon: '💪', color: '#10B981' },
  { id: 'career', name: 'Career', nameUk: 'Кар\'єра', icon: '💼', color: '#3B82F6' },
  { id: 'finance', name: 'Finance', nameUk: 'Фінанси', icon: '💰', color: '#F59E0B' },
  { id: 'relationships', name: 'Relationships', nameUk: 'Стосунки', icon: '❤️', color: '#EF4444' },
  { id: 'personal_growth', name: 'Personal Growth', nameUk: 'Особистий ріст', icon: '🌱', color: '#8B5CF6' },
  { id: 'fun', name: 'Fun & Recreation', nameUk: 'Відпочинок', icon: '🎉', color: '#EC4899' },
  { id: 'environment', name: 'Environment', nameUk: 'Оточення', icon: '🏠', color: '#06B6D4' },
  { id: 'spirituality', name: 'Spirituality', nameUk: 'Духовність', icon: '✨', color: '#A855F7' },
]

export const TOTAL_CATEGORIES = WHEEL_CATEGORIES.length

export interface WheelScore {
  categoryId: string
  score: number
  notes?: string
}

export interface WheelAssessment {
  id: string
  userId: string
  scores: WheelScore[]
  totalScore: number
  averageScore: number
  strengths: string[]
  gaps: string[]
  createdAt: string
}

export interface WheelAnalysis {
  strengths: WheelCategory[]
  gaps: WheelCategory[]
  recommendations: string[]
  focusArea: WheelCategory
  balanceScore: number
}

export interface WheelFormState {
  currentIndex: number
  scores: WheelScore[]
  isComplete: boolean
}