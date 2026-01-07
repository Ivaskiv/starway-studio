// features/products/types/product.types.ts

import { Module } from '@/features/products/types/product.education'
import type {
  // ProductType,
  // ProductFormat,
  // ProductIntegration,
  // Currency,
  // ProductStatus,
  ProductBase,
} from './product.base'

export interface Product extends ProductBase{
  id: string
  name: string
  description?: string

  type: ProductType
  price: number
  currency: Currency
  status: ProductStatus

  includesTrial: boolean
  trialDays: number
  includesMentorship: boolean

  format: ProductFormat
  integration: ProductIntegration

  thumbnailUrl?: string
  modules: Module[]

  funnelId: string

  createdAt: string
  updatedAt?: string
  publishedAt?: string
}



// import { FunnelBlueprint } from '@/features/ai-generator/types/generator.types'
// import type { Block } from '@/types/Block'

// // ═══════════════════════════════════════════════════════════════
// // PRODUCT TYPES
// // ═══════════════════════════════════════════════════════════════

export type ProductType =
  | 'course'
  | 'membership'
  | 'coaching'
  | 'digital_product'
  | 'webinar'
  | 'ebook'
  | 'mini_app'
  | 'telegram_bot'
  | 'service'
  | 'physical_product'
  | 'other'

export type ProductFormat =
  | 'web'
  | 'mini_app'
  | 'telegram_task'
  | 'mixed' // web + telegram

export type ProductIntegration =
  | 'telegram'
  | 'web'
  | 'future' // для майбутніх соцмереж

export type Currency = 'UAH' | 'USD' | 'EUR'
export type ProductStatus = 'draft' | 'published' | 'archived'

// // ═══════════════════════════════════════════════════════════════
// // MODULE & LESSON
// // ═══════════════════════════════════════════════════════════════

// export interface Module {
//   id: string
//   productId: string
//   name: string
//   description?: string
//   order: number
//   isLocked: boolean
//   unlockCondition?: {
//     type: 'payment' | 'previous_module' | 'date' | 'trial_end'
//     value?: string
//   }
//   lessons: Lesson[]
// }

// export interface Lesson {
//   id: string
//   moduleId: string
//   name: string
//   description?: string
//   type: 'video' | 'text' | 'quiz' | 'task' | 'live' | 'telegram_task'
//   order: number
//   duration?: number // minutes
//   contentUrl?: string
//   isLocked: boolean
//   blocks: Block[]
// }

// // ═══════════════════════════════════════════════════════════════
// // MAIN PRODUCT INTERFACE
// // ═══════════════════════════════════════════════════════════════

// export interface Product {
//   id: string
//   name: string
//   description?: string
//   type: ProductType
//   price: number
//   currency: Currency
//   status: ProductStatus
//   thumbnailUrl?: string

//   includesTrial: boolean
//   trialDays: number
//   includesMentorship: boolean

//   format: ProductFormat
//   integration: ProductIntegration

//   modules: Module[]

//   createdAt: string
//   updatedAt?: string
//   publishedAt?: string

//   funnelId: string;

// }


// // ═══════════════════════════════════════════════════════════════
// // FORM INPUTS (для ProductForm)
// // ═══════════════════════════════════════════════════════════════

// export interface ProductFormInputs {
// name: string
//   description?: string
//   type: ProductType
//   price: number
//   currency: Currency
//   includesTrial: boolean
//   trialDays: number
//   includesMentorship: boolean
//   format: ProductFormat
//   integration: ProductIntegration
//   status?: ProductStatus
//   thumbnailUrl?: string
//   modules: string[]
// }

// // ═══════════════════════════════════════════════════════════════
// // Додаткові утиліти
// // ═══════════════════════════════════════════════════════════════

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  course: 'Онлайн-курс',
  membership: 'Підписка',
  coaching: 'Коучинг / Наставництво',
  digital_product: 'Цифровий продукт',
  webinar: 'Вебінар',
  ebook: 'Електронна книга',
  mini_app: 'Telegram Mini App',
  telegram_bot: 'Telegram-бот',
  service: 'Послуга',
  physical_product: 'Фізичний товар',
  other: 'Інше',
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  UAH: '₴',
  USD: '$',
  EUR: '€',
}

// // ═══════════════════════════════════════════════════════════════
// // AI GENERATOR TYPES (для FunnelBlueprint / StepData)
// // ═══════════════════════════════════════════════════════════════

// export interface ProductMini {
//   id: string
//   name: string
//   type: 'subscription' | 'one-time'
//   price: number
//   format: 'mini-app' | 'web' | 'telegram-task'
//   integration: 'telegram' | 'other'
//   includesMentorship: boolean
// }

// export interface GenerationAttempt {
//   id: string
//   content: string
//   createdAt: string
//   isSelected: boolean
// }

// export interface StepData {
//   number: number
//   userInput: string
//   attempts: GenerationAttempt[]
//   remainingAttempts: number
//   selectedAttemptId: string | null
// }


// export interface AIGeneratorState {
//   currentStep: number
//   stepsData: StepData[]
//   totalRemainingAttempts: number
//   isGenerating: boolean
//   generatedBlueprint: FunnelBlueprint | null
//   error: string | null
// }

// // ═══════════════════════════════════════════════════════════════
// // QUIZZES & TASKS
// // ═══════════════════════════════════════════════════════════════

// export interface Quiz {
//   id: string
//   lessonId: string
//   name: string
//   questions: QuizQuestion[]
//   passingScore: number
//   timeLimit?: number // хвилини
// }

// export interface QuizQuestion {
//   id: string
//   question: string
//   type: 'single' | 'multiple' | 'text' | 'true_false'
//   options?: string[]
//   correctAnswer: string | string[]
//   points: number
// }

// export interface Task {
//   id: string
//   lessonId: string
//   name: string
//   description?: string
//   type: 'text' | 'file' | 'link' | 'code'
//   deadline?: string
//   points: number
// }
