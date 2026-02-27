// backend/src/modules/mini-courses/types.ts

// Єдине джерело правди для CourseType
export type CourseType =
  | 'STATE_KEY'       // Balance mini-course / стартові стани
  | 'FREE'            // Безкоштовні курси
  | 'BALANCE'         // Колесо балансу
  | 'VISION'          // Створення візії
  | 'ACTION'          // Дії / планування
  | 'AI_FUNNEL'       // Курс по AI воронках
  | 'PRODUCTS'        // Курс по продуктам
  | 'PATTERN'         // Курси за патернами користувача
  | 'STAGNATION'      // Курси для виходу зі стагнації
  | 'IMBALANCE'       // Курси для дисбалансу/балансу
  | 'AI_PRODUCER';    // Курс по ролі AI продюсера

export interface Course {
  id: string;
  code: CourseType;
  name: string;
  description: string;
  priceCents: number;
  price: number;
  durationDays: number;
  triggers: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseRecommendation {
  courseId: string;
  userId: string;
  reason: string;
  patternDays: number;
  severity: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Date;
  purchasedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}