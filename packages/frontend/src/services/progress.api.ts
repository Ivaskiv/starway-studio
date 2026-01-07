// packages/frontend/src/services/progress.api.ts
import { api } from './api';

export interface UserProgress {
  funnelId: string;
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  lastActiveAt: string;
  estimatedCompletionDate?: string;
}

export interface StepProgress {
  stepId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
}

export interface LessonProgress {
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  timeSpent: number; // seconds
  lastPosition?: number;
  completedAt?: string;
}

export interface ModuleProgress {
  moduleId: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  unlocked: boolean;
}

export interface Completion {
  id: string;
  type: 'lesson' | 'module' | 'product' | 'funnel';
  entityId: string;
  completedAt: string;
  certificate?: {
    url: string;
    generatedAt: string;
  };
}

export interface Bookmark {
  id: string;
  lessonId: string;
  position: number;
  note?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  lessonId: string;
  content: string;
  timestamp?: number;
  createdAt: string;
  updatedAt?: string;
}

export const progressApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Funnel Progress
    getFunnelProgress: builder.query<UserProgress, string>({
      query: (funnelId) => `/progress/funnels/${funnelId}`,
      providesTags: (result, error, funnelId) => [{ type: 'UserProgress', id: funnelId }],
    }),

    // Step Progress
    getStepProgress: builder.query<StepProgress[], string>({
      query: (funnelId) => `/progress/funnels/${funnelId}/steps`,
      providesTags: ['StepProgress'],
    }),

    updateStepProgress: builder.mutation<StepProgress, { stepId: string; completed: boolean }>({
      query: ({ stepId, completed }) => ({
        url: `/progress/steps/${stepId}`,
        method: 'PUT',
        body: { completed },
      }),
      invalidatesTags: ['StepProgress', 'UserProgress', 'Points', 'Achievement'],
    }),

    // Module Progress
    getModuleProgress: builder.query<ModuleProgress[], string>({
      query: (productId) => `/progress/products/${productId}/modules`,
      providesTags: ['UserProgress'],
    }),

    // Lesson Progress
    getLessonProgress: builder.query<LessonProgress, string>({
      query: (lessonId) => `/progress/lessons/${lessonId}`,
      providesTags: (result, error, lessonId) => [{ type: 'LessonProgress', id: lessonId }],
    }),

    updateLessonProgress: builder.mutation<LessonProgress, { lessonId: string; progress: number; position?: number }>({
      query: ({ lessonId, progress, position }) => ({
        url: `/progress/lessons/${lessonId}`,
        method: 'PUT',
        body: { progress, position },
      }),
      invalidatesTags: (result, error, { lessonId }) => [{ type: 'LessonProgress', id: lessonId }],
    }),

    markLessonComplete: builder.mutation<LessonProgress, { lessonId: string; timeSpent: number }>({
      query: ({ lessonId, timeSpent }) => ({
        url: `/progress/lessons/${lessonId}/complete`,
        method: 'POST',
        body: { timeSpent },
      }),
      invalidatesTags: ['LessonProgress', 'Completion', 'Points', 'Achievement', 'Streak'],
    }),

    // Completions
    getCompletions: builder.query<Completion[], { type?: string }>({
      query: ({ type }) => ({
        url: '/progress/completions',
        params: { type },
      }),
      providesTags: ['Completion'],
    }),

    generateCertificate: builder.mutation<{ url: string }, string>({
      query: (completionId) => ({
        url: `/progress/completions/${completionId}/certificate`,
        method: 'POST',
      }),
      invalidatesTags: ['Completion'],
    }),

    // Bookmarks
    getBookmarks: builder.query<Bookmark[], string>({
      query: (lessonId) => `/progress/lessons/${lessonId}/bookmarks`,
      providesTags: ['Bookmark'],
    }),

    createBookmark: builder.mutation<Bookmark, { lessonId: string; position: number; note?: string }>({
      query: ({ lessonId, position, note }) => ({
        url: `/progress/lessons/${lessonId}/bookmarks`,
        method: 'POST',
        body: { position, note },
      }),
      invalidatesTags: ['Bookmark'],
    }),

    deleteBookmark: builder.mutation<void, string>({
      query: (id) => ({
        url: `/progress/bookmarks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Bookmark'],
    }),

    // Notes
    getNotes: builder.query<Note[], string>({
      query: (lessonId) => `/progress/lessons/${lessonId}/notes`,
      providesTags: ['Note'],
    }),

    createNote: builder.mutation<Note, { lessonId: string; content: string; timestamp?: number }>({
      query: ({ lessonId, content, timestamp }) => ({
        url: `/progress/lessons/${lessonId}/notes`,
        method: 'POST',
        body: { content, timestamp },
      }),
      invalidatesTags: ['Note'],
    }),

    updateNote: builder.mutation<Note, { id: string; content: string }>({
      query: ({ id, content }) => ({
        url: `/progress/notes/${id}`,
        method: 'PUT',
        body: { content },
      }),
      invalidatesTags: ['Note'],
    }),

    deleteNote: builder.mutation<void, string>({
      query: (id) => ({
        url: `/progress/notes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Note'],
    }),
  }),
});

export const {
  useGetFunnelProgressQuery,
  useGetStepProgressQuery,
  useUpdateStepProgressMutation,
  useGetModuleProgressQuery,
  useGetLessonProgressQuery,
  useUpdateLessonProgressMutation,
  useMarkLessonCompleteMutation,
  useGetCompletionsQuery,
  useGenerateCertificateMutation,
  useGetBookmarksQuery,
  useCreateBookmarkMutation,
  useDeleteBookmarkMutation,
  useGetNotesQuery,
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
} = progressApi;