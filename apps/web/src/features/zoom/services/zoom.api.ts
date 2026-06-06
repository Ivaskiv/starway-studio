// frontend/src/features/zoom/services/zoom.api.ts
// ВИПРАВЛЕНО: createApi → api.injectEndpoints
// Причина: власний createApi без prepareHeaders → токен не передавався → 401
import { api } from '@/services/api'
import type {
  RegisterAttendeeDto,
  ZoomAttendeeDTO,
  ZoomSessionDTO,
  ZoomSessionWithAttendance,
  ZoomWeekOverview,
} from '../types/zoom.types'

// ── Mock data (залишено без змін) ─────────────────────────────────────────────
export const MOCK_SESSIONS: ZoomSessionWithAttendance[] = [
  {
    id: 'mock-1', expertId: 'expert-1',
    scheduledAt:       new Date(Date.now() + 2 * 86400000).toISOString(),
    topic:             'Фокус-сфера: Реалізація та цілі',
    status:            'SCHEDULED',
    requests:          [],
    postSessionReport: null,
    createdAt:         new Date().toISOString(),
    updatedAt:         new Date().toISOString(),
    isRegistered:      false,
  },
  {
    id: 'mock-2', expertId: 'expert-1',
    scheduledAt:       new Date(Date.now() - 7 * 86400000).toISOString(),
    topic:             'Колесо балансу: розбір результатів',
    status:            'COMPLETED',
    requests:          [],
    postSessionReport: {
      summary:     'Розібрали слабкі сфери та сформували план дій на місяць.',
      actionItems: ['Щоденна медитація 10 хв', 'Облік витрат', 'Дзвінок близькій людині'],
      nextFocus:   'inner_support',
      mentorNotes: 'Гарний прогрес у сфері реалізації.',
    },
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
    isRegistered: true,
    attendeeId:   'att-1',
  },
  {
    id: 'mock-3', expertId: 'expert-1',
    scheduledAt:       new Date(Date.now() - 21 * 86400000).toISOString(),
    topic:             'Вступна сесія: знайомство та цілі',
    status:            'COMPLETED',
    requests:          [],
    postSessionReport: {
      summary:     'Визначили пріоритетні сфери та перші кроки.',
      actionItems: ['Заповнити колесо балансу', '3 цілі на місяць'],
      nextFocus:   'realization',
    },
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
    isRegistered: true,
    attendeeId:   'att-2',
  },
]

// ── API ───────────────────────────────────────────────────────────────────────
// api.injectEndpoints → токен передається через baseQueryWithReauth автоматично
export const zoomApi = api.injectEndpoints({
  endpoints: build => ({

    getUpcomingSession: build.query<ZoomSessionDTO | null, void>({
      query:        () => '/zoom/upcoming',
      providesTags: ['ZoomSession'],
    }),

    getMySessions: build.query<ZoomSessionWithAttendance[], void>({
      query:        () => '/zoom/my',
      providesTags: ['ZoomSession'],
    }),

    getWeekOverview: build.query<ZoomWeekOverview, void>({
        query:        () => '/zoom/week',
      providesTags: ['ZoomSession'],
    }),

    getPublicWeekOverview: build.query<ZoomWeekOverview, void>({
      query: () => '/zoom/public/week',
      providesTags: ['ZoomSession'],
    }),

    registerAttendee: build.mutation<ZoomAttendeeDTO, RegisterAttendeeDto>({
      query:           body => ({ url: '/zoom/register', method: 'POST', body }),
      invalidatesTags: ['ZoomSession', 'ZoomAttendee'],
    }),

    markAttended: build.mutation<ZoomAttendeeDTO, { attendeeId: string }>({
      query:           body => ({ url: '/zoom/attendee/attended', method: 'PATCH', body }),
      invalidatesTags: ['ZoomSession'],
    }),

    getAttendees: build.query<ZoomAttendeeDTO[], string>({
      query:        sessionId => `/zoom/session/${sessionId}/attendees`,
      providesTags: ['ZoomAttendee'],
    }),

  }),
  overrideExisting: false,
})

export const {
  useGetUpcomingSessionQuery,
  useGetMySessionsQuery,
  useGetWeekOverviewQuery,
  useGetPublicWeekOverviewQuery,
  useRegisterAttendeeMutation,
  useMarkAttendedMutation,
  useGetAttendeesQuery,
} = zoomApi
