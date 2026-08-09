import type { AuthRestoreStatus } from '@/features/auth/context/SessionOrchestratorContext'
import {
  useGetMySessionsQuery,
  useGetPublicUpcomingSessionQuery,  useGetUpcomingSessionQuery,
} from '@/features/zoom/services/zoom.api'
import { useGetCalendarSessionsQuery } from '@/features/zoom/zoom.api'
import { getKyivWeekRange } from '../utils/zoomDateTime.utils'

type UseZoomCalendarDataInput = {
  hasUser: boolean
  userId: string
  isCoach: boolean
  isBookingEntry: boolean
  authRestoreStatus: AuthRestoreStatus
  canRunProtectedQueries: boolean
}

export function useZoomCalendarData({
  hasUser,
  userId,
  isCoach,
  isBookingEntry,
  authRestoreStatus,
  canRunProtectedQueries,
}: UseZoomCalendarDataInput) {
  const protectedQueriesReady =
    hasUser &&
    authRestoreStatus === 'ready' &&
    canRunProtectedQueries

  // Booking screen must always render the canonical real Zoom schedule.
  // Authenticated state is still used for user-specific booking data/mutations.
  const usePublicBookingSchedule = isBookingEntry

  const weekRange = getKyivWeekRange()

  const {
    data: rawCurrentWeekSessions = [],
    isLoading: isCurrentWeekLoading,
    isError: isCurrentWeekError,
    refetch: refetchCurrentWeek,
  } = useGetCalendarSessionsQuery(
    {
      from: weekRange.from,
      to: weekRange.to,
      role: isCoach ? 'coach' : 'user',
      userId,
    },
    {
      skip: !protectedQueriesReady,
      refetchOnMountOrArgChange: true,
    }
  )

  const publicWeekOverview = undefined
  const isPublicWeekLoading = false
  const isPublicWeekError = false

  const {
    data: publicUpcomingSession,
    isLoading: isPublicUpcomingLoading,
    isError: isPublicUpcomingError,
  } = useGetPublicUpcomingSessionQuery(undefined, {
    skip: !usePublicBookingSchedule,
    refetchOnMountOrArgChange: true,
  })

  const {
    data: upcomingSession,
    isLoading: isUpcomingLoading,
    isError: isUpcomingError,
    refetch: refetchUpcoming,
  } = useGetUpcomingSessionQuery(undefined, {
    skip: !protectedQueriesReady,
    refetchOnMountOrArgChange: true,
  })

  const {
    data: mySessionsResponse,
    isLoading: isMySessionsLoading,
    isError: isMySessionsError,
    refetch: refetchMySessions,
  } = useGetMySessionsQuery(undefined, {
    skip: !protectedQueriesReady,
    refetchOnMountOrArgChange: true,
  })

  return {
    usePublicBookingSchedule,
    weekRange,

    rawCurrentWeekSessions,
    isCurrentWeekLoading,
    isCurrentWeekError,
    refetchCurrentWeek,

    publicWeekOverview,
    isPublicWeekLoading,
    isPublicWeekError,

    publicUpcomingSession,
    isPublicUpcomingLoading,
    isPublicUpcomingError,

    upcomingSession,
    isUpcomingLoading,
    isUpcomingError,
    refetchUpcoming,

    mySessions: mySessionsResponse?.sessions ?? [],
    previousSessionRecap:
      mySessionsResponse?.previousSessionRecap ?? null,
    isMySessionsLoading,
    isMySessionsError,
    refetchMySessions,
  }
}
