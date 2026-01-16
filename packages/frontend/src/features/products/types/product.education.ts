// // features/products/types/product.education.ts
// import type { Block } from '@/types/Block'

// export interface Lesson {
//   id: string
//   moduleId: string
//   name: string
//   type: 'video' | 'text' | 'quiz' | 'task' | 'live' | 'telegram_task'
//   order: number
//   duration?: number
//   contentUrl?: string
//   blocks: Block[]
// }

// export interface Quiz {
//   id: string
//   lessonId: string
//   name: string
//   questions: QuizQuestion[]
//   passingScore: number
//   timeLimit?: number 
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
