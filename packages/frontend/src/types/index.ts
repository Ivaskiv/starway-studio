// packages/frontend/src/types/index.ts

// ============ BLOCK TYPES ============
export type { Block } from './Block';

// ============ RE-EXPORT FROM SERVICES ============
// Funnel types
export type {
  AIGeneratedData,
  CreateFunnelRequest, Funnel, FunnelSettings,
  FunnelStats, FunnelStep, UpdateFunnelRequest
} from '@/features/funnels/services/funnels.api';

// User types
export type {
  AuthResponse, SignInRequest, SignUpRequest, Tokens, User
} from '@/services/auth.api';

// Product types
export type {
  Lesson, Product,
  Module as ProductModule, Quiz,
  Task
} from '@/services/products.api';

// AI types
export type {
  AIPromptHistory,
  AITemplate, AnalyzedPrompt
} from '@/services/ai.api';

// Progress types
export type {
  Bookmark, Completion, LessonProgress,
  ModuleProgress, Note, StepProgress, UserProgress
} from '@/services/progress.api';

// Gamification types
export type {
  Achievement, LeaderboardEntry, UserLevel
} from '@/services/gamification.api';
