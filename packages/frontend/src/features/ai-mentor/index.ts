// packages/frontend/src/features/ai-mentor/index.ts

// ============ TYPES ============
export * from './types/ai-mentor.types';

// ============ API (RTK Query) ============
export * from './services/aiMentorApi';

// ============ SLICE (Redux) ============
export * from './services/aiMentorSlice';
export { default as aiMentorReducer } from './services/aiMentorSlice';

// ============ COMPONENTS ============
export { DailySession } from './components/DailySession';
export { MentorDashboard } from './MentorDashboard';
// export { WheelOfBalance } from './WheelOfBalance';

// ============ TELEGRAM MINI-APP ============
export { MentorChat } from './telegram/MentorChat';

// packages/frontend/src/features/courses/index.ts
export { default as CoursesPage } from '../courses/pages/CoursesPage'

// packages/frontend/src/features/progress/index.ts  
export { default as ProgressPage } from '../progress/pages/ProgressPage'

// packages/frontend/src/features/subscription/index.ts
export { default as SubscriptionPage } from '../../features/subscription/pages/SubscriptionPage'
export { SubscriptionModal } from '../modals/SubscriptionModal'