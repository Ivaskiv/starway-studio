import { useState } from 'react'

import {
  useBookPrivateSlotMutation,
  useCancelZoomSessionMutation,
  useCreateZoomSessionMutation,
  useGetAvailablePrivateSlotsQuery,
  useGetCalendarSessionsQuery,
  useUpdateZoomSessionMutation,
} from '../zoom.api'
import { useGetAttendeesQuery } from '../services/zoom.api'
import {
  useRegisterAttendeeMutation,
  useSubmitBookingPreparationMutation,
  useSubmitBookingQuestionMutation,
} from '../services/zoom.api'
import { useGetUsersQuery } from '@/features/admin/services/ownership.api'
import type {
  CalendarView,
  CreateSessionPayload,
  ZoomCalendarMode,
  ZoomCalendarSession,
} from '../zoom.types'
import {
  getMonthGrid,
  getWeekDays,
  isIndividualSession,
  isPrivateSession,
  isSameDay,
} from '../zoom.utils'
import {
  endOf,
  filterSessionsInRange,
  startOf,
} from '../utils/calendar-range'
import { buildCalendarEvent } from '../utils/calendar-event'

const UK_MONTH_NAMES = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
]

export interface CalendarProps {
  mode: ZoomCalendarMode;
  userId: string;
  expertId?: string;
  sessionSource?: { from: string; to: string; sessions: ZoomCalendarSession[] };
}

export function useCalendar({ mode, userId, expertId, sessionSource }: CalendarProps) {
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<ZoomCalendarSession | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<ZoomCalendarSession[]>([]);
  const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);
  const [bookingQuestionSession, setBookingQuestionSession] = useState<ZoomCalendarSession | null>(null);
  const [bookingQuestionText, setBookingQuestionText] = useState('');
  const [bookingQuestionError, setBookingQuestionError] = useState<string | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<{ sessionId: string; text: string } | null>(null);
  const [bookingPreparationSessionId, setBookingPreparationSessionId] = useState<string | null>(null);
  const [bookingPreparationAnswer, setBookingPreparationAnswer] = useState('');
  const [bookingPreparationError, setBookingPreparationError] = useState<string | null>(null);
  const [bookingPreparationSuccess, setBookingPreparationSuccess] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [registerAttendee, { isLoading: isRegisteringAttendee }] = useRegisterAttendeeMutation();
  const [submitBookingPreparation, { isLoading: isSavingBookingPreparation }] = useSubmitBookingPreparationMutation();
  const [submitBookingQuestion, { isLoading: isSavingBookingQuestion }] = useSubmitBookingQuestionMutation();
  const [bookPrivateSlot, { isLoading: isBookingPrivateSlot }] = useBookPrivateSlotMutation();

  const from = startOf(view, currentDate).toISOString();
  const to   = endOf(view, currentDate).toISOString();

  const usesSessionSource = Boolean(sessionSource
    && Date.parse(sessionSource.from) <= Date.parse(from)
    && Date.parse(sessionSource.to) >= Date.parse(to));
  const { data: fetchedSessions = [] } = useGetCalendarSessionsQuery(
    { from, to, role: mode, userId, expertId },
    { skip: usesSessionSource },
  );
  const sessions = usesSessionSource && sessionSource ? sessionSource.sessions : fetchedSessions;
  const periodSessions = filterSessionsInRange(sessions, from, to)
  const visibleSessions = periodSessions.filter(
    (session) => new Date(session.scheduledAt) >= new Date(),
  );
  useGetAvailablePrivateSlotsQuery(
    { expertId: expertId ?? userId, from, to },
    { skip: !(expertId ?? userId) },
  );
  const [createSession, { isLoading: creating }] = useCreateZoomSessionMutation();
  const [updateSession] = useUpdateZoomSessionMutation();
  const [cancelSession] = useCancelZoomSessionMutation();
  const { data: coachUsers = [] } = useGetUsersQuery(undefined, {
    skip: mode !== 'coach',
  })
  const { data: editingAttendees = [] } = useGetAttendeesQuery(editingSession ?? '', {
    skip: mode !== 'coach' || !editingSession,
    refetchOnMountOrArgChange: true,
  })
  const isSubmittingBookingQuestion = isRegisteringAttendee || isSavingBookingQuestion || isBookingPrivateSlot;
  const isSubmittingBookingPreparation = isSavingBookingPreparation;

  const monthGrid = getMonthGrid(currentDate);
  const weekDays  = getWeekDays(currentDate);

  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const periodLabel =
    view === 'month'
      ? `${UK_MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : (() => {
          const days = getWeekDays(currentDate);
          const s = days[0];
          const e = days[6];
          return `${s.getDate()} – ${e.getDate()} ${UK_MONTH_NAMES[e.getMonth()]}`;
        })();

  const sessionsOnDay = (day: Date | null) => {
    if (!day) return [];
    return periodSessions.filter(s => isSameDay(new Date(s.scheduledAt), day));
  };

  const handleDayClick = (day: Date | null) => {
    if (!day) return;
    const daySessions = sessionsOnDay(day);
    if (mode === 'user') {
      setSelectedDate(day);
      setSelectedSessions(daySessions);
      setIsDaySheetOpen(true);
      setSelectedSession(null);
      setCreateDate(null);
      return;
    }

    if (daySessions.length > 0) {
      setSelectedSession(daySessions[0]);
      setCreateDate(null);
    } else if (mode === 'coach') {
      setCreateDate(day);
      setSelectedSession(null);
    }
  };

  const todaySession = periodSessions.find(s => isSameDay(new Date(s.scheduledAt), new Date()));

  const handleCreate = async (payload: CreateSessionPayload & { participantUserId?: string }) => {
    await createSession(payload).unwrap();
    setCreateDate(null);
  };

  const handleCancel = async (id: string) => {
    await cancelSession(id).unwrap();
    setSelectedSession(null);
  };

  const handleAddToCalendar = (session: ZoomCalendarSession) => {
    const icsContent = buildCalendarEvent(session);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'focus-zoom-practice.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openBookingQuestion = (session: ZoomCalendarSession) => {
    setBookingConfirmation(null);
    setBookingPreparationSuccess(null);
    setBookingQuestionError(null);
    setBookingQuestionText('');
    setBookingQuestionSession(session);
  };

  const closeBookingQuestion = () => {
    if (isSubmittingBookingQuestion) {
      return;
    }

    setBookingQuestionSession(null);
    setBookingQuestionError(null);
    setBookingQuestionText('');
  };

  const handleBookingConfirm = async () => {
    if (!bookingQuestionSession) {
      return;
    }

    const normalizedQuestionText = bookingQuestionText.trim();
    if (!normalizedQuestionText) {
      setBookingQuestionError('Напиши коротко, з чим хочеш прийти на Zoom.');
      return;
    }

    console.info('[ZOOM_USER_BOOK_ATTEMPT]', { sessionId: bookingQuestionSession.id, type: bookingQuestionSession.type });
    try {
      let confirmationText = 'Ти записана на Zoom.\n\n👉 Я передам твоє питання коучу\n👉 і підготую для тебе розбір';
      if (isPrivateSession(bookingQuestionSession) || isIndividualSession(bookingQuestionSession)) {
        await bookPrivateSlot({ sessionId: bookingQuestionSession.id, questionText: normalizedQuestionText }).unwrap();
        confirmationText = 'Запит на індивідуальну сесію надіслано коучу.';
      } else if (bookingQuestionSession.isMyBooking) {
        await submitBookingQuestion({
          sessionId: bookingQuestionSession.id,
          questionText: normalizedQuestionText,
        }).unwrap();
        confirmationText = 'Питання збережено. Повернемось до нього на Zoom.';
      } else {
        await registerAttendee({
          sessionId: bookingQuestionSession.id,
          questionText: normalizedQuestionText,
        } as never).unwrap();
      }

      console.info('[ZOOM_USER_BOOK_RESULT]', { sessionId: bookingQuestionSession.id, success: true });
      setBookingConfirmation({
        sessionId: bookingQuestionSession.id,
        text: confirmationText,
      });
      setBookingQuestionSession(null);
      setBookingQuestionText('');
      setBookingQuestionError(null);
      setSelectedSession(null);
      setIsDaySheetOpen(false);
      setSelectedDate(null);
      setSelectedSessions([]);
    } catch (error) {
      console.error('[ZOOM_USER_BOOK_RESULT]', {
        sessionId: bookingQuestionSession.id,
        success: false,
        status: error && typeof error === 'object' && 'status' in error ? error.status : null,
      });
      const errorCode =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { error?: string } }).data?.error
          : null
      if (errorCode === 'NO_ACTIVE_SUBSCRIPTION') {
        setBookingQuestionError('Доступ до Zoom відкривається з активним ФОКУСОМ.')
        return
      }
      setBookingQuestionError('Не вдалося завершити запис. Спробуй ще раз.');
    }
  };

  const openBookingPreparation = (sessionId: string) => {
    setBookingPreparationSessionId(sessionId);
    setBookingPreparationAnswer('');
    setBookingPreparationError(null);
    setBookingPreparationSuccess(null);
  };

  const closeBookingPreparation = () => {
    if (isSubmittingBookingPreparation) {
      return;
    }

    setBookingPreparationSessionId(null);
    setBookingPreparationAnswer('');
    setBookingPreparationError(null);
  };

  const handleBookingPreparationConfirm = async () => {
    if (!bookingPreparationSessionId) {
      return;
    }

    const normalizedPreparationAnswer = bookingPreparationAnswer.trim();
    if (!normalizedPreparationAnswer) {
      setBookingPreparationError('Напиши коротко, що ти вже пробувала.');
      return;
    }

    try {
      await submitBookingPreparation({
        sessionId: bookingPreparationSessionId,
        preparationAnswer: normalizedPreparationAnswer,
      }).unwrap();
      setBookingPreparationSuccess('Добре. Я врахую це перед Zoom.');
      setBookingPreparationSessionId(null);
      setBookingPreparationAnswer('');
      setBookingPreparationError(null);
    } catch (error) {
      console.error('[ZoomCalendar] booking preparation failed', {
        sessionId: bookingPreparationSessionId,
        error,
      });
      setBookingPreparationError('Не вдалося зберегти відповідь. Спробуй ще раз.');
    }
  };


  return {
    mode,
    userId,

    view,
    setView,
    currentDate,

    sessions: periodSessions,
    visibleSessions,
    monthGrid,
    weekDays,
    periodLabel,
    todaySession,

    selectedSession,
    setSelectedSession,

    selectedDate,
    setSelectedDate,

    selectedSessions,
    setSelectedSessions,

    isDaySheetOpen,
    setIsDaySheetOpen,

    bookingQuestionSession,
    bookingQuestionText,
    setBookingQuestionText,
    bookingQuestionError,
    bookingConfirmation,

    bookingPreparationSessionId,
    bookingPreparationAnswer,
    setBookingPreparationAnswer,
    bookingPreparationError,
    bookingPreparationSuccess,

    createDate,
    setCreateDate,

    editingSession,
    setEditingSession,
    editingParticipantUserId: editingAttendees[0]?.userId ?? null,
    coachUsers,

    creating,

    isSubmittingBookingQuestion,
    isSubmittingBookingPreparation,

    updateSession,

    prevPeriod,
    nextPeriod,
    sessionsOnDay,
    handleDayClick,

    handleCreate,
    handleCancel,
    handleAddToCalendar,

    openBookingQuestion,
    closeBookingQuestion,
    handleBookingConfirm,

    openBookingPreparation,
    closeBookingPreparation,
    handleBookingPreparationConfirm,
  }
}
