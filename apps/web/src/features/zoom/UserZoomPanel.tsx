import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { useSystemState } from '@/features/auth/hooks/useSystemState';
import { useGetLeaderboardQuery, useAcceptBattleMutation, useDeclineBattleMutation, useLogBattleProgressMutation, useGetPendingSwapsQuery, useAcceptSwapMutation, useDeclineSwapMutation, useGetCalendarSessionsQuery, useCreateUserIndividualRequestMutation, useGetIndividualAvailabilityQuery, useGetIndividualAvailabilitySummaryQuery } from './zoom.api';
import { useGetMySessionsQuery } from './services/zoom.api';
import { isUserOperationalCalendarSession } from './zoom.utils';
import type { LeaderboardEntry, ZoomCalendarSession } from './zoom.types';
import { normalizeZoomHubSession } from './utils/zoomCalendar.utils';
import { useAccessActions } from './hooks/useAccessActions';
import { validateIndividualRequestContext, toLocalDateKey, parseLocalDate, getMySessionsFilterPresentation, filterUserCalendarSessions, mergeUserSessionHistoryEntries, routeUserBookingCta } from './utils/userPanelPresentation';
import type { MySessionsFilter, UserCalendarFilter, UserSessionsTab } from './utils/userPanelPresentation';
import { UserZoomPanelView } from './components/user/UserZoomPanelView';

type UserCalendarQueryWindow = {
  dayKey: string;
  monthStart: string;
  calendarMonthEnd: Date;
  nextMondayWindowEnd: Date;
  monthEnd: string;
};

export function retainUserCalendarQueryWindow(
  previous: UserCalendarQueryWindow | null,
  now: Date,
): UserCalendarQueryWindow {
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (previous?.dayKey === dayKey) return previous;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const calendarMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const nextMondayWindowEnd = new Date(now);
  nextMondayWindowEnd.setDate(nextMondayWindowEnd.getDate() + 8);
  const monthEnd = new Date(Math.max(
    calendarMonthEnd.getTime(),
    nextMondayWindowEnd.getTime(),
  )).toISOString();

  return { dayKey, monthStart, calendarMonthEnd, nextMondayWindowEnd, monthEnd };
}

export interface UserZoomPanelProps {
  userId: string;
}

type UserPanelTab = 'sessions' | 'progress' | 'materials' | 'rewards' | 'ai' | 'more';

type UserProgressTab = 'overview' | 'goals' | 'statistics';

type UserRewardsTab = 'all' | 'achievements' | 'bonuses' | 'levels';

type UserCreateAction = 'menu' | 'group' | 'individual' | 'battle' | null;

function useUserZoomPanelModel({ userId }: UserZoomPanelProps) {
  const user = useAppSelector((state) => state.auth.user);
  const { getModuleAccess, isLoading: isAccessLoading, state: accessState, zoomAccess } = useSystemState();
  const [searchParams, setSearchParams] = useSearchParams();
  const panel = searchParams.get('panel');
  const activeTab: UserPanelTab = panel === 'progress' || panel === 'materials' || panel === 'rewards' || panel === 'ai' || panel === 'more'
    ? panel
    : 'sessions';
  const [activeProgressTab, setActiveProgressTab] = useState<UserProgressTab>('overview');
  const [activeSessionsTab, setActiveSessionsTab] = useState<UserSessionsTab>('all');
  const [mySessionsFilter, setMySessionsFilter] = useState<MySessionsFilter>('upcoming');
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [activeRewardsTab, setActiveRewardsTab] = useState<UserRewardsTab>('all');
  const [rewardDetailsOpen, setRewardDetailsOpen] = useState(false);
  const now = new Date();
  const calendarQueryWindowRef = useRef<UserCalendarQueryWindow | null>(null);
  const calendarQueryWindow = retainUserCalendarQueryWindow(calendarQueryWindowRef.current, now);
  calendarQueryWindowRef.current = calendarQueryWindow;
  const { monthStart, calendarMonthEnd, nextMondayWindowEnd, monthEnd } = calendarQueryWindow;

  const calendarQueryArgs = { from: monthStart, to: monthEnd, role: 'user' as const, userId };
  const {
    data: calendarSessions,
    refetch: refetchCalendar,
    isError: isCalendarSessionsError,
  } = useGetCalendarSessionsQuery(
    calendarQueryArgs,
    {
      pollingInterval: 30_000,
      refetchOnFocus: true,
      refetchOnMountOrArgChange: true,
    },
  );
  const { data: mySessionsResponse, refetch: refetchMySessions, isError: isMySessionsError } = useGetMySessionsQuery(undefined);
  const sessions = calendarSessions ?? [];
  const { data: leaderboard = [] } = useGetLeaderboardQuery();
  const [logProgress] = useLogBattleProgressMutation();
  const [acceptBattle] = useAcceptBattleMutation();
  const [declineBattle] = useDeclineBattleMutation();
  const { data: pendingSwaps = [] } = useGetPendingSwapsQuery();
  const [acceptSwap] = useAcceptSwapMutation();
  const [declineSwap] = useDeclineSwapMutation();
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [createAction, setCreateAction] = useState<UserCreateAction>(null);
  const [requestedUserSession, setRequestedUserSession] = useState<ZoomCalendarSession | null>(null)
  const [individualDate, setIndividualDate] = useState('');
  const [individualTime, setIndividualTime] = useState('');
  const [individualQuestion, setIndividualQuestion] = useState('');
  const [individualRequestError, setIndividualRequestError] = useState<string | null>(null);
  const [individualCalendarMonth, setIndividualCalendarMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const individualCalendarFirstDate = new Date(
    individualCalendarMonth.getFullYear(), individualCalendarMonth.getMonth(), 1,
  );
  const individualCalendarStart = new Date(individualCalendarFirstDate);
  individualCalendarStart.setDate(individualCalendarStart.getDate() - ((individualCalendarStart.getDay() + 6) % 7));
  const individualCalendarEnd = new Date(individualCalendarStart);
  individualCalendarEnd.setDate(individualCalendarEnd.getDate() + 41);
  const [createIndividualRequest, { isLoading: isCreatingIndividualRequest }] = useCreateUserIndividualRequestMutation();
  const { openPayment } = useAccessActions({
    userId,
    zoomAccess,
    setMessage: setAccessMessage,
    refetchCurrentWeek: refetchCalendar,
    refetchUpcoming: refetchCalendar,
    refetchMySessions,
  });
  const {
    data: individualAvailability = [],
    isFetching: isFetchingIndividualAvailability,
    isError: isIndividualAvailabilityError,
    refetch: refetchIndividualAvailability,
  } = useGetIndividualAvailabilityQuery(individualDate, {
    skip: !individualDate || createAction !== 'individual',
  });
  const { data: individualAvailabilitySummary = [] } = useGetIndividualAvailabilitySummaryQuery({
    from: toLocalDateKey(individualCalendarStart),
    to: toLocalDateKey(individualCalendarEnd),
  }, {
    skip: createAction !== 'individual',
  });
  const selectedIndividualSlot = individualAvailability.find(
    (slot) => slot.scheduledAt === individualTime,
  ) ?? null;
  const hasOnlyBusyIndividualSlots =
    individualAvailability.length > 0
    && individualAvailability.every((slot) => !slot.available);
  const todayKey = toLocalDateKey(now);
  const calendarMonthLabel = new Intl.DateTimeFormat('uk-UA', {
    month: 'long', year: 'numeric',
  }).format(individualCalendarMonth);
  const calendarMonthDays = new Date(
    individualCalendarMonth.getFullYear(),
    individualCalendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarOffset = (new Date(
    individualCalendarMonth.getFullYear(), individualCalendarMonth.getMonth(), 1,
  ).getDay() + 6) % 7;
  const individualFreeSlotCount = individualAvailability.filter((slot) => slot.available).length;
  const selectedIndividualDaySummary = individualAvailabilitySummary.find(
    (day) => day.date === individualDate,
  );
  const individualQuestionValidationError = individualQuestion.trim()
    ? validateIndividualRequestContext(individualQuestion)
    : null;
  const canSubmitIndividualRequest = Boolean(
    individualDate
    && selectedIndividualSlot?.available
    && !validateIndividualRequestContext(individualQuestion)
    && !isFetchingIndividualAvailability
    && !isIndividualAvailabilityError
  );

  const activeBattle = sessions.find(
    s => s.type === 'battle_review' && s.status !== 'COMPLETED' && s.status !== 'CANCELLED',
  ) ?? null;

  const bookedSessionIds = new Set(
    (mySessionsResponse?.sessions ?? []).map((session) => session.id),
  );

  const availableSessions = sessions
    .filter(isUserOperationalCalendarSession)
    .filter(s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED')
    .filter(s => s.type !== 'battle_review' && new Date(s.scheduledAt) > now)
    .filter(s => !s.isMyBooking && !bookedSessionIds.has(s.id))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  const displayMySessions: ZoomCalendarSession[] = (mySessionsResponse?.sessions ?? [])
    .map((session) =>
      ({
        ...normalizeZoomHubSession(session, {
          type: 'GROUP',
          zoomLink: '',
        }),
        canEdit: false,
      }),
    )
    .filter(s => s.type !== 'battle_review' && new Date(s.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  const displayAvailableSessions: ZoomCalendarSession[] = availableSessions;
  const individualCalendarGroupSessions = sessions.filter((session) =>
    session.type === 'group' || session.type === 'group_practice',
  );
  const calendarFilter: UserCalendarFilter = activeSessionsTab === 'mine'
    ? 'all'
    : activeSessionsTab;
  const visibleCalendarSessions = filterUserCalendarSessions(sessions, calendarFilter);
  const mergedSessionHistory = mergeUserSessionHistoryEntries(
    mySessionsResponse?.sessions ?? [],
    sessions,
  );
  const mySessionsPresentation = getMySessionsFilterPresentation(
    mergedSessionHistory,
    mySessionsFilter,
    now,
  );
  const sessionHistoryLoadFailed = Boolean(isCalendarSessionsError && isMySessionsError);
  const myCalendarSessions = mySessionsPresentation.sessions;
  const displayActiveBattle: ZoomCalendarSession | null = activeBattle;
  const displayLeaderboard: LeaderboardEntry[] = leaderboard;
  const myStats = leaderboard.find(e => e.userId === userId);
  const weekStart = new Date(now);
  const dayFromMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - dayFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const completedThisWeek = sessions.filter((session) => {
    const scheduledAt = new Date(session.scheduledAt);
    return (
      session.status === 'COMPLETED' &&
      (session.isMyBooking || bookedSessionIds.has(session.id)) &&
      scheduledAt >= weekStart &&
      scheduledAt < weekEnd
    );
  });
  const weeklyZoomPractices = completedThisWeek.filter(
    (session) => session.type === 'group' || session.type === 'group_practice',
  ).length;
  const weeklyIndividualSessions = completedThisWeek.filter(
    (session) => session.type === 'individual' || session.type === 'private',
  ).length;
  const weeklyCompletedBattles = completedThisWeek.filter(
    (session) => session.type === 'battle_review',
  ).length;
  const materialSessions = sessions
    .filter((session) => session.isMyBooking || bookedSessionIds.has(session.id))
    .filter(
      (session) =>
        (Boolean(session.recordingUrl) && session.canViewRecording === true) ||
        Boolean(session.summary) ||
        Boolean(session.outcomeTopic),
    )
    .sort(
      (left, right) =>
        new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime(),
    );

  const handleLogProgress = (args: { sessionId: string; userId: string; day: number; text: string }) => {
    logProgress(args).catch(console.error);
  };
  const handleAcceptBattle = (sessionId: string) => {
    acceptBattle(sessionId).catch(console.error);
  };
  const handleDeclineBattle = (sessionId: string) => {
    declineBattle(sessionId).catch(console.error);
  };
  const handleBookingCta = () => {
    routeUserBookingCta({
      hasFocusAccess: zoomAccess?.hasFocus,
      openPayment: () => void openPayment(),
      openBookingFlow: () => setCreateAction('menu'),
      showAllSessions: () => setActiveSessionsTab('all'),
    });
  };
  const profileName = user?.firstName?.trim() || user?.email || userId;
  const profileInitials = profileName.slice(0, 2).toUpperCase();
  const hasAiMentorAccess = !getModuleAccess('AI_MENTOR').isLocked;
  const ownedProducts = accessState?.products.owned ?? [];
  const subscribedProducts = accessState?.products.subscribed.filter((product) => product.status !== 'locked') ?? [];
  const setActiveTab = (tab: UserPanelTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'sessions') next.delete('panel');
    else next.set('panel', tab);
    setSearchParams(next, { replace: true });
  };
  const selectIndividualDate = (dateKey: string) => {
    setIndividualDate(dateKey);
    setIndividualTime('');
    setIndividualQuestion('');
    setIndividualRequestError(null);
  };
  const moveIndividualCalendarMonth = (offset: number) => {
    const nextMonth = new Date(
      individualCalendarMonth.getFullYear(), individualCalendarMonth.getMonth() + offset, 1,
    );
    setIndividualCalendarMonth(nextMonth);
    if (
      individualDate
      && (parseLocalDate(individualDate).getFullYear() !== nextMonth.getFullYear()
        || parseLocalDate(individualDate).getMonth() !== nextMonth.getMonth())
    ) {
      setIndividualDate('');
      setIndividualTime('');
      setIndividualQuestion('');
      setIndividualRequestError(null);
    }
  };
  const closeCreateModal = () => {
    if (isCreatingIndividualRequest) return;
    setCreateAction(null);
    setIndividualRequestError(null);
  };
  const handleIndividualRequest = async () => {
    const dateTime = new Date(individualTime);

    if (
      !individualDate
      || !selectedIndividualSlot?.available
      || Number.isNaN(dateTime.getTime())
      || dateTime <= new Date()
    ) {
      setIndividualRequestError('Обери майбутні дату й час.');
      return;
    }
    const contextError = validateIndividualRequestContext(individualQuestion);
    if (contextError) {
      setIndividualRequestError(contextError);
      return;
    }
    try {
      if (import.meta.env.DEV) {
        console.info('[USER_INDIVIDUAL_REQUEST_TRACE]', {
          phase: 'submit',
          scheduledAt: dateTime.toISOString(),
          hasQuestion: true,
          questionLength: individualQuestion.trim().length,
        })
      }
      await createIndividualRequest({
        scheduledAt: dateTime.toISOString(),
        questionText: individualQuestion.trim(),
      }).unwrap();
      setIndividualDate('');
      setIndividualTime('');
      setIndividualQuestion('');
      closeCreateModal();
    } catch (error) {
      if (import.meta.env.DEV) {
        const response =
          error && typeof error === 'object' && 'data' in error
            ? (error as { data?: { error?: unknown; message?: unknown } }).data
            : undefined
        console.info('[USER_INDIVIDUAL_REQUEST_TRACE]', {
          phase: 'rejected',
          status: error && typeof error === 'object' && 'status' in error
            ? (error as { status?: unknown }).status
            : null,
          backendCode: typeof response?.error === 'string' ? response.error : null,
          backendMessage: typeof response?.message === 'string' ? response.message : null,
        })
      }
      const backendCode = error && typeof error === 'object' && 'data' in error
        ? (error as { data?: { error?: unknown } }).data?.error
        : null
      if (backendCode === 'COMMERCE_SLOT_UNAVAILABLE') {
        setIndividualRequestError('Цей час уже зайнятий. Обери інший час.');
        setIndividualTime('');
        void refetchIndividualAvailability();
      } else {
        setIndividualRequestError('Не вдалося створити запит. Спробуй ще раз.');
      }
    }
  };

  return {
    userId, user, getModuleAccess, isAccessLoading, accessState, zoomAccess, searchParams, setSearchParams, panel, activeTab, activeProgressTab, setActiveProgressTab, activeSessionsTab, setActiveSessionsTab, mySessionsFilter, setMySessionsFilter, accessMessage, setAccessMessage, activeRewardsTab, setActiveRewardsTab, rewardDetailsOpen, setRewardDetailsOpen, now, monthStart, calendarMonthEnd, nextMondayWindowEnd, monthEnd, sessions, refetchCalendar, mySessionsResponse, refetchMySessions, sessionHistoryLoadFailed, leaderboard, logProgress, acceptBattle, declineBattle, pendingSwaps, acceptSwap, declineSwap, instructionsOpen, setInstructionsOpen, createAction, setCreateAction, requestedUserSession, setRequestedUserSession, individualDate, setIndividualDate, individualTime, setIndividualTime, individualQuestion, setIndividualQuestion, individualRequestError, setIndividualRequestError, individualCalendarMonth, setIndividualCalendarMonth, individualCalendarFirstDate, individualCalendarStart, individualCalendarEnd, createIndividualRequest, isCreatingIndividualRequest, openPayment, individualAvailability, isFetchingIndividualAvailability, isIndividualAvailabilityError, refetchIndividualAvailability, individualAvailabilitySummary, selectedIndividualSlot, hasOnlyBusyIndividualSlots, todayKey, calendarMonthLabel, calendarMonthDays, calendarOffset, individualFreeSlotCount, selectedIndividualDaySummary, individualQuestionValidationError, canSubmitIndividualRequest, activeBattle, bookedSessionIds, availableSessions, displayMySessions, displayAvailableSessions, individualCalendarGroupSessions, visibleCalendarSessions, mySessionsPresentation, myCalendarSessions, displayActiveBattle, displayLeaderboard, myStats, weekStart, dayFromMonday, weekEnd, completedThisWeek, weeklyZoomPractices, weeklyIndividualSessions, weeklyCompletedBattles, materialSessions, handleLogProgress, handleAcceptBattle, handleDeclineBattle, handleBookingCta, profileName, profileInitials, hasAiMentorAccess, ownedProducts, subscribedProducts, setActiveTab, selectIndividualDate, moveIndividualCalendarMonth, closeCreateModal, handleIndividualRequest
  };
}

export type UserZoomPanelModel = ReturnType<typeof useUserZoomPanelModel>;

export function UserZoomPanel({ userId }: UserZoomPanelProps) {
  return <UserZoomPanelView model={useUserZoomPanelModel({ userId })} />;
}

export { getMySessionsFilterPresentation, filterUserCalendarSessions, routeUserBookingCta } from './utils/userPanelPresentation';
