// backend/src/modules/mini-courses/types.ts

import { CourseType } from '@prisma/client'; 
export interface Course {
  id: string;
  code: CourseType; 
  name: string;
  description: string;
  price: number;
  durationDays: number;
  triggers: string[];
  createdAt: Date;
}

export interface CourseRecommendation {
  courseId: string;
  userId: string;
  reason: string;
  patternDays: number;
  severity: 'low' | 'medium' | 'high'; // ✅ Union type
  createdAt: Date;
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  purchasedAt: Date;
  completedAt?: Date;
}

// ## 📊 **ПРАВИЛЬНА АРХІТЕКТУРА**
// ```
// ┌─────────────────────────────────────────────────┐
// │           SINGLE SOURCE OF TRUTH                │
// │                                                 │
// │  prisma/schema.prisma                           │
// │  ├─ enum OnboardingStage { ... }                │
// │  ├─ enum ConsultationStatus { ... }             │
// │  ├─ enum DailyState { ... }                     │
// │  └─ enum CourseType { ... }                     │
// └─────────────────────────────────────────────────┘
//                     ↓
//          ┌──────────┴──────────┐
//          ↓                     ↓
// ┌─────────────────┐   ┌─────────────────┐
// │    BACKEND      │   │    FRONTEND     │
// │                 │   │                 │
// │ Import from     │   │ Union types     │
// │ @prisma/client  │   │ (copy values)   │
// │                 │   │                 │
// │ import {        │   │ type Status =   │
// │   Status        │   │   | 'PENDING'   │
// │ } from          │   │   | 'ACTIVE'    │
// │ '@prisma/client'│   │                 │
// └─────────────────┘   └─────────────────┘