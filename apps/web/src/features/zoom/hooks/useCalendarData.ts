import type { AuthRestoreStatus } from '@/features/auth/context/SessionOrchestratorContext'
import {
  useGetMySessionsQuery,
  useGetPublicUpcomingSessionQuery,
  useGetPublicWeekOverviewQuery,
  useGetUpcomingSessionQuery,
  useGetWeekOverviewQuery,
} from '@/features/zoom/services/zoom.api'
import { getKyivWeekRange } from '../utils/zoomDateTime.utils'

type UseZoomCalendarDataInput = {
  hasUser: boolean
  userId: string
  isCoach: boolean
  isBookingEntry: boolean
  authRestoreStatus: AuthRestoreStatus
  canRunProtectedQueries: boolean
}

export function useCalendarData({
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

  // Public upcoming is only a bootstrap fallback while auth is restoring.
  // Once protected queries are ready, booking UI must switch to the
  // authenticated Zoom runtime so counts/questions/bookings stay consistent.
  const usePublicBookingSchedule =
    isBookingEntry && !protectedQueriesReady

  const weekRange = getKyivWeekRange()

  const {
    data: currentWeekOverview,
    isLoading: isCurrentWeekLoading,
    isError: isCurrentWeekError,
    refetch: refetchCurrentWeek,
  } = useGetWeekOverviewQuery(undefined, {
    skip: !protectedQueriesReady,
    refetchOnMountOrArgChange: true,
  })

  const {
    data: publicWeekOverview,
    isLoading: isPublicWeekLoading,
    isError: isPublicWeekError,
  } = useGetPublicWeekOverviewQuery(undefined, {
    skip: !usePublicBookingSchedule,
    refetchOnMountOrArgChange: true,
  })

  const rawCurrentWeekSessions =
    currentWeekOverview?.sessions ??
    (usePublicBookingSchedule ? (publicWeekOverview?.sessions ?? []) : [])

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
