// frontend/src/services/index.ts
// Центральний експорт всіх API services

// Base API
export { api } from './api';

// Progress API
export {
  progressApi,
  useGetAdminProgressOverviewQuery,
  useGetProgressOverviewQuery,
} from '../features/progress/services/progress.api';

// Wheel API
export {
  // useAnalyzeWheelMutation,
  useGetWheelCooldownQuery,
  // useGetWheelDetailQuery,
  useGetWheelHistoryQuery,
  useGetWheelQuery,
  useSaveWheelMutation,
  wheelApi,
  // type SaveWheelPayload,
  type WheelData,
} from '../features/wheel/wheel.api';

// Mentor API
export {
  mentorApi,
  useCompleteSessionMutation,
  useCompleteTaskMutation,
  useConvertToSmartMutation,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useGetChatHistoryQuery,
  useGetMentorStatsQuery,
  useGetTodaySessionsQuery,
  useGetTodayTasksQuery,
  useGetYearlyGoalsQuery,
  useSaveSessionAnswerMutation,
  useSendChatMessageMutation,
  useStartSessionMutation,
  useUpdateYearlyGoalsMutation,
} from './mentor.api';
