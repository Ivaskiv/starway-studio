// frontend/src/features/modules/module.types.ts

import { Block } from "@/types/modules.types"


export interface Module {
  id: string
  product_id: string
  name: string
  order: number
  isLocked?: boolean
  lessons: Lesson[]
}

export type ModuleCategory =
  | 'ai'
  | 'automation'
  | 'content'
  | 'analytics'
  | 'monetization'
  | 'communication'
  | 'productivity'

export interface Module {
  id: string
  product_id: string
  name: string
  icon?: string             // для UI, emoji або іконка
  category: ModuleCategory
  description?: string
  version?: string
  order: number
  enabled: boolean          // для toggle в адмінці
  isPremium: boolean
  isLocked?: boolean
  dependencies?: string[]   // інші модулі
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  moduleId: string
  name: string
  type: 'video' | 'text' | 'quiz' | 'task' | 'live' | 'telegram_task'
  order: number
  duration?: number
  contentUrl?: string
  blocks: Block[]
}

export interface Quiz {
  id: string
  lessonId: string
  name: string
  questions: QuizQuestion[]
  passingScore: number
  timeLimit?: number
}

export interface QuizQuestion {
  id: string
  question: string
  type: 'single' | 'multiple' | 'text' | 'true_false'
  options?: string[]
  correctAnswer: string | string[]
  points: number
}

export interface Task {
  id: string
  lessonId: string
  name: string
  description?: string
  type: 'text' | 'file' | 'link' | 'code'
  deadline?: string
  points: number
}
