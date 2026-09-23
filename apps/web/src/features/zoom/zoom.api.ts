// apps/web/src/features/zoom/zoom.api.ts
// New RTK Query endpoints for the calendar/battle/leaderboard feature

import { api } from '@/services/api';
import type {
  ZoomCalendarMode,
  ZoomCalendarSession,
  CreateSessionPayload,
  ZoomCompletionPayload,
  ZoomCompletionDraft,
  LeaderboardEntry,
  AvailabilitySlot,
  AvailabilityWeekChange,
  AvailabilityWeekDay,
  IndividualAvailabilityCandidate,
  IndividualAvailabilitySummaryDay,
  ZoomSwapRequest,
} from './zoom.types';

export const zoomCalendarApi = api.injectEndpoints({
  endpoints: build => ({

    getCalendarSessions: build.query<
      ZoomCalendarSession[],
      { from: string; to: string; role: ZoomCalendarMode; userId: string; expertId?: string }
    >({
      query: ({ from, to, role, userId, expertId }) =>
        `/zoom/sessions/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&role=${role}&userId=${userId}${expertId ? `&expertId=${encodeURIComponent(expertId)}` : ''}`,
      providesTags: ['ZoomSession'],
    }),

    createZoomSession: build.mutation<ZoomCalendarSession, CreateSessionPayload>({
      query: body => ({ url: '/zoom/sessions', method: 'POST', body }),
      invalidatesTags: ['ZoomSession'],
    }),

    createUserIndividualRequest: build.mutation<
      { request: { id: string; status: string }; session: { id: string }; duplicate: boolean },
      { scheduledAt: string; questionText: string }
    >({
      query: body => ({ url: '/zoom/individual-requests', method: 'POST', body }),
      invalidatesTags: ['ZoomSession'],
    }),

    getIndividualAvailability: build.query<IndividualAvailabilityCandidate[], string>({
      query: date => `/zoom/individual-availability?date=${encodeURIComponent(date)}`,
      providesTags: ['ZoomSession'],
    }),

    getIndividualAvailabilitySummary: build.query<
      IndividualAvailabilitySummaryDay[],
      { from: string; to: string }
    >({
      query: ({ from, to }) => `/zoom/individual-availability/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      providesTags: ['ZoomSession'],
    }),

    updateZoomSession: build.mutation<
      ZoomCalendarSession,
      { id: string; patch: Partial<CreateSessionPayload> }
    >({
      query: ({ id, patch }) => ({ url: `/zoom/sessions/${id}`, method: 'PUT', body: patch }),
      invalidatesTags: ['ZoomSession'],
    }),


    getZoomCompletionDraft: build.query<ZoomCompletionDraft, string>({
      query: sessionId => `/zoom/sessions/${encodeURIComponent(sessionId)}/completion-draft`,
    }),

    completeZoomSession: build.mutation<
      ZoomCalendarSession,
      { id: string; payload: ZoomCompletionPayload }
    >({
      query: ({ id, payload }) => ({ url: `/zoom/sessions/${id}/complete`, method: 'PATCH', body: payload }),
      invalidatesTags: ['ZoomSession'],
    }),

    cancelZoomSession: build.mutation<ZoomCalendarSession, string>({
      query: id => ({ url: `/zoom/sessions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ZoomSession'],
    }),

    approveZoomCommerceRequest: build.mutation<
      { request: { id: string; status: string }; checkoutUrl: string | null },
      string
    >({
      query: requestId => ({
        url: `/zoom/commerce/requests/${requestId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['ZoomSession'],
    }),

    rejectZoomCommerceRequest: build.mutation<
      { request: { id: string; status: string } },
      string
    >({
      query: requestId => ({
        url: `/zoom/commerce/requests/${requestId}/reject`,
        method: 'POST',
      }),
      invalidatesTags: ['ZoomSession'],
    }),

    getLeaderboard: build.query<LeaderboardEntry[], void>({
      query: () => '/zoom/battle/leaderboard',
      providesTags: ['ZoomSession'],
    }),

    initiateBattle: build.mutation<
      | { type: 'subscriber'; costUAH: 0; battle: { id: string } }
      | { type: 'non_subscriber'; costUAH: 99; request: { id: string; status: string }; checkoutUrl?: string | null; message: string },
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

    acceptBattle: build.mutation<{ id: string }, string>({
      query: sessionId => ({ url: `/zoom/battle/${sessionId}/accept`, method: 'POST' }),
      invalidatesTags: ['ZoomSession'],
    }),

    declineBattle: build.mutation<{ id: string }, string>({
      query: sessionId => ({ url: `/zoom/battle/${sessionId}/decline`, method: 'POST' }),
      invalidatesTags: ['ZoomSession'],
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
    getCoachParticipants: build.query<{ summary: { activeFocusCount: number; newThisWeekCount: number }; participants: Array<{ id: string; displayName: string; focusActive: boolean; zoomStatus: string; nextSessionAt: string | null; lastPoint: string | null }> }, void>({
      query: () => '/zoom/coach/participants',
    }),

    getAvailabilityWeek: build.query<AvailabilityWeekDay[], string>({
      query: from => `/zoom/availability/week?from=${encodeURIComponent(from)}`,
      providesTags: ['ZoomSession'],
    }),

    saveAvailabilityWeek: build.mutation<{ ok: boolean }, { from: string; days: AvailabilityWeekChange[] }>({
      query: body => ({ url: '/zoom/availability/week', method: 'PUT', body }),
      invalidatesTags: ['ZoomSession'],
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

    getTelegramAvailableSlots: build.query<
      Array<{ id: string; date: string; hour: number; bookedCount: number; isBooked: boolean }>,
      void
    >({
      query: () => ({
        url: '/zoom/slots/available',
        headers: { 'x-skip-access-token': '1' },
      }),
      providesTags: ['ZoomSession'],
    }),

    bookPrivateSlot: build.mutation<{
      success: boolean;
      request: { id: string; status: string };
    }, string | { sessionId: string; questionText: string }>({
      query: input => ({
        url: `/zoom/sessions/${typeof input === 'string' ? input : input.sessionId}/book`,
        method: 'POST', body: typeof input === 'string' ? undefined : { questionText: input.questionText },
      }),
      invalidatesTags: ['ZoomSession'],
    }),

    bookTelegramSlot: build.mutation<{ success: boolean }, string>({
      query: sessionId => ({
        url: `/zoom/sessions/${sessionId}/book`,
        method: 'POST',
        headers: { 'x-skip-access-token': '1' },
      }),
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
  useCreateUserIndividualRequestMutation,
  useGetIndividualAvailabilityQuery,
  useGetIndividualAvailabilitySummaryQuery,
  useUpdateZoomSessionMutation,
  useCompleteZoomSessionMutation,
  useLazyGetZoomCompletionDraftQuery,
  useCancelZoomSessionMutation,
  useApproveZoomCommerceRequestMutation,
  useRejectZoomCommerceRequestMutation,
  useGetLeaderboardQuery,
  useInitiateBattleMutation,
  useAcceptBattleMutation,
  useDeclineBattleMutation,
  useLogBattleProgressMutation,
  useGetEligibleOpponentsQuery,
  useFinalizeBattleMutation,
  useGetAvailabilityQuery,
  useGetCoachParticipantsQuery,
  useGetAvailabilityWeekQuery,
  useSaveAvailabilityWeekMutation,
  useSaveAvailabilityMutation,
  useGenerateSessionsMutation,
  useBookSlotMutation,
  useUnbookSlotMutation,
  useGetAvailablePrivateSlotsQuery,
  useGetTelegramAvailableSlotsQuery,
  useBookPrivateSlotMutation,
  useBookTelegramSlotMutation,
  useCancelPrivateBookingMutation,
  useGetPendingSwapsQuery,
  useCreateSwapRequestMutation,
  useAcceptSwapMutation,
  useDeclineSwapMutation,
} = zoomCalendarApi;
