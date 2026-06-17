// apps/web/src/features/zoom/zoom.api.ts
// New RTK Query endpoints for the calendar/battle/leaderboard feature

import { api } from '@/services/api';
import type {
  ZoomCalendarMode,
  ZoomCalendarSession,
  CreateSessionPayload,
  LeaderboardEntry,
  AvailabilitySlot,
  ZoomSwapRequest,
} from './zoom.types';

export const zoomCalendarApi = api.injectEndpoints({
  endpoints: build => ({

    getCalendarSessions: build.query<
      ZoomCalendarSession[],
      { from: string; to: string; role: ZoomCalendarMode; userId: string }
    >({
      query: ({ from, to, role, userId }) =>
        `/zoom/sessions/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&role=${role}&userId=${userId}`,
      providesTags: ['ZoomSession'],
    }),

    createZoomSession: build.mutation<ZoomCalendarSession, CreateSessionPayload>({
      query: body => ({ url: '/zoom/sessions', method: 'POST', body }),
      invalidatesTags: ['ZoomSession'],
    }),

    updateZoomSession: build.mutation<
      ZoomCalendarSession,
      { id: string; patch: Partial<CreateSessionPayload> }
    >({
      query: ({ id, patch }) => ({ url: `/zoom/sessions/${id}`, method: 'PUT', body: patch }),
      invalidatesTags: ['ZoomSession'],
    }),

    cancelZoomSession: build.mutation<ZoomCalendarSession, string>({
      query: id => ({ url: `/zoom/sessions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ZoomSession'],
    }),

    getLeaderboard: build.query<LeaderboardEntry[], void>({
      query: () => '/zoom/battle/leaderboard',
      providesTags: ['ZoomSession'],
    }),

    initiateBattle: build.mutation<
      | { type: 'subscriber'; costUAH: 0; battle: { id: string } }
      | { type: 'non_subscriber'; costUAH: 99; orderReference: string; checkoutUrl: string; message: string },
      { challengerId: string; opponentId: string; goalA?: string; goalB?: string }
    >({
      query: body => ({ url: '/zoom/battle/initiate', method: 'POST', body }),
      invalidatesTags: ['ZoomSession'],
    }),

    logBattleProgress: build.mutation<
      { id: string },
      { sessionId: string; userId: string; day: number; text: string }
    >({
      query: ({ sessionId, ...body }) => ({
        url: `/zoom/battle/${sessionId}/progress`,
        method: 'POST',
        body,
      }),
    }),

    getEligibleOpponents: build.query<
      { id: string; name: string | null; email: string }[],
      string
    >({
      query: userId => `/zoom/battle/eligible?userId=${userId}`,
    }),

    finalizeBattle: build.mutation<
      { id: string },
      { sessionId: string; outcome: 'challenger' | 'opponent' | 'both' | 'none' }
    >({
      query: ({ sessionId, outcome }) => ({
        url: `/zoom/battle/${sessionId}/result`,
        method: 'PATCH',
        body: { outcome },
      }),
      invalidatesTags: ['ZoomSession'],
    }),

    getAvailability: build.query<AvailabilitySlot[], void>({
      query: () => '/zoom/availability',
      providesTags: ['ZoomSession'],
    }),

    saveAvailability: build.mutation<{ ok: boolean }, AvailabilitySlot[]>({
      query: slots => ({ url: '/zoom/availability', method: 'PUT', body: slots }),
      invalidatesTags: ['ZoomSession'],
    }),

    generateSessions: build.mutation<{ created: number; skipped: number }, void>({
      query: () => ({ url: '/zoom/availability/generate', method: 'POST' }),
      invalidatesTags: ['ZoomSession'],
    }),

    bookSlot: build.mutation<{ booked: boolean; remainingSlots: number }, string>({
      query: sessionId => ({ url: `/zoom/sessions/${sessionId}/book`, method: 'POST' }),
      invalidatesTags: ['ZoomSession'],
    }),

    unbookSlot: build.mutation<{ ok: boolean }, string>({
      query: sessionId => ({ url: `/zoom/sessions/${sessionId}/unbook`, method: 'POST' }),
      invalidatesTags: ['ZoomSession'],
    }),

    getAvailablePrivateSlots: build.query<
      Array<{ session: ZoomCalendarSession; remaining: number }>,
      { expertId: string; from: string; to: string }
    >({
      query: ({ expertId, from, to }) =>
        `/zoom/sessions/private/available?expertId=${encodeURIComponent(expertId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      providesTags: ['ZoomSession'],
    }),

    bookPrivateSlot: build.mutation<{ success: boolean }, string>({
      query: sessionId => ({ url: `/zoom/sessions/${sessionId}/book`, method: 'POST' }),
      invalidatesTags: ['ZoomSession'],
    }),

    cancelPrivateBooking: build.mutation<{ success: boolean }, string>({
      query: sessionId => ({ url: `/zoom/sessions/${sessionId}/book`, method: 'DELETE' }),
      invalidatesTags: ['ZoomSession'],
    }),

    getPendingSwaps: build.query<ZoomSwapRequest[], void>({
      query: () => '/zoom/swap/pending',
      providesTags: ['ZoomSession'],
    }),

    createSwapRequest: build.mutation<{ swapId: string }, { sessionIdFrom: string; targetUserIds?: string[] }>({
      query: body => ({ url: '/zoom/swap', method: 'POST', body }),
      invalidatesTags: ['ZoomSession'],
    }),

    acceptSwap: build.mutation<{ success: boolean }, { swapId: string; sessionIdTo: string }>({
      query: ({ swapId, sessionIdTo }) => ({
        url: `/zoom/swap/${swapId}/accept`,
        method: 'POST',
        body: { sessionIdTo },
      }),
      invalidatesTags: ['ZoomSession'],
    }),

    declineSwap: build.mutation<{ success: boolean }, { swapId: string }>({
      query: ({ swapId }) => ({
        url: `/zoom/swap/${swapId}/decline`,
        method: 'POST',
      }),
      invalidatesTags: ['ZoomSession'],
    }),

  }),
  overrideExisting: false,
});

export const {
  useGetCalendarSessionsQuery,
  useCreateZoomSessionMutation,
  useUpdateZoomSessionMutation,
  useCancelZoomSessionMutation,
  useGetLeaderboardQuery,
  useInitiateBattleMutation,
  useLogBattleProgressMutation,
  useGetEligibleOpponentsQuery,
  useFinalizeBattleMutation,
  useGetAvailabilityQuery,
  useSaveAvailabilityMutation,
  useGenerateSessionsMutation,
  useBookSlotMutation,
  useUnbookSlotMutation,
  useGetAvailablePrivateSlotsQuery,
  useBookPrivateSlotMutation,
  useCancelPrivateBookingMutation,
  useGetPendingSwapsQuery,
  useCreateSwapRequestMutation,
  useAcceptSwapMutation,
  useDeclineSwapMutation,
} = zoomCalendarApi;
