// apps/web/src/features/journal/hooks/useJournalDay.ts
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';

import type { JournalDayState, JournalEvent } from '../types';
import {
  buildCycleUrl,
  hasDraftForDay,
  parseDateKey,
  resolveRecoverySession,
  toDateKey,
} from '../utils';
import { getStatusTone } from '../utils'; // якщо винесено туди

interface UseJournalDayProps {
  selectedDay: string;
  selectedDayState: JournalDayState;
  dayStatesByDate: Record<string, JournalDayState>;
  latestIncompleteDay?: string | null;
}

export function useJournalDay({
  selectedDay,
  selectedDayState,
  dayStatesByDate,
  latestIncompleteDay,
}: UseJournalDayProps) {
  const navigate = useNavigate();
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const yesterdayKey = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return toDateKey(date);
  }, []);

  const selectedDate = useMemo(() => parseDateKey(selectedDay), [selectedDay]);

  // Стрік
  const currentStreak = useMemo(() => {
    const streakEvent = [...selectedDayState.events]
      .reverse()
      .find((event) => event.type === 'STREAK');
    return typeof streakEvent?.meta?.current === 'number' ? streakEvent.meta.current : 0;
  }, [selectedDayState.events]);

  // Recovery логіка (для попереднього незавершеного дня)
  const recoveryDayKey = useMemo(() => {
    return latestIncompleteDay ?? (selectedDay === yesterdayKey ? selectedDay : null);
  }, [latestIncompleteDay, selectedDay, yesterdayKey]);

  const recoveryDayState = useMemo(() => {
    return recoveryDayKey ? dayStatesByDate[recoveryDayKey] ?? null : null;
  }, [recoveryDayKey, dayStatesByDate]);

  const recoveryNeedsAttention = useMemo(() => {
    if (!recoveryDayState || !recoveryDayKey || recoveryDayKey >= todayKey) return false;

    return (
      !recoveryDayState.hasEntry ||
      !recoveryDayState.finalizedAt ||
      !recoveryDayState.reflection.morning.event ||
      recoveryDayState.reflection.morning.status !== 'done' ||
      recoveryDayState.reflection.evening.status !== 'done' ||
      (recoveryDayState.microTasks.activeCount ?? 0) > 0 ||
      (recoveryDayState.microTasks.missedCount ?? 0) > 0 ||
      recoveryDayState.summary.pending > 0 ||
      recoveryDayState.summary.missed > 0
    );
  }, [recoveryDayState, recoveryDayKey, todayKey]);

  const recoveryTargetSession = useMemo<'morning' | 'evening' | null>(() => {
    if (!recoveryDayState) return null;
    return resolveRecoverySession(recoveryDayState);
  }, [recoveryDayState]);

  const recoveryDescription = useMemo(() => {
    if (!recoveryTargetSession) return '';

    if (recoveryTargetSession === 'morning') {
      return recoveryDayState?.hasEntry
        ? 'Ранкова сесія не завершена. Можна повернутися в історію і продовжити саме цей день.'
        : 'Вчорашній день пропущено. Можна відкрити його ще раз і пройти з ранку.';
    }
    return (recoveryDayState?.microTasks.activeCount ?? 0) > 0 ||
      (recoveryDayState?.microTasks.missedCount ?? 0) > 0
      ? 'Є незавершені мікрозавдання. Відкрий день і закрий його з потрібного місця.'
      : 'Вечір ще не закрито. Можна повернутися і завершити день.';
  }, [recoveryTargetSession, recoveryDayState]);

  // Resume логіка для обраного дня (якщо це вчора і незавершено)
  const selectedDayRecovery = useMemo(() => {
    return (
      selectedDay === yesterdayKey &&
      !selectedDayState.finalizedAt &&
      (!selectedDayState.hasEntry ||
        selectedDayState.reflection.morning.status !== 'done' ||
        selectedDayState.reflection.evening.status !== 'done' ||
        selectedDayState.microTasks.activeCount > 0 ||
        selectedDayState.microTasks.missedCount > 0 ||
        selectedDayState.summary.pending > 0 ||
        selectedDayState.summary.missed > 0)
    );
  }, [selectedDay, yesterdayKey, selectedDayState]);

  const selectedDayDraftSession = useMemo<'morning' | 'evening' | null>(() => {
    if (selectedDay !== yesterdayKey) return null;
    if (hasDraftForDay(userId, 'evening', selectedDay)) return 'evening';
    if (hasDraftForDay(userId, 'morning', selectedDay)) return 'morning';
    return null;
  }, [selectedDay, userId, yesterdayKey]);

  const selectedDayResumeSession = useMemo<'morning' | 'evening' | null>(() => {
    return selectedDayDraftSession ?? (selectedDayRecovery ? resolveRecoverySession(selectedDayState) : null);
  }, [selectedDayDraftSession, selectedDayRecovery, selectedDayState]);

  const resumeDescription = useMemo(() => {
    if (!selectedDayResumeSession) return '';

    if (selectedDayResumeSession === 'morning') {
      return 'Ранкова сесія не закрита. Можна повернутись у попередній день і продовжити саме звідси.';
    }
    return selectedDayState.microTasks.activeCount > 0 || selectedDayState.microTasks.missedCount > 0
      ? 'Мікрозавдання або вечір залишилися незавершеними. Відкрий цей день і заверши його.'
      : 'Вечір ще не закрито. Відкрий попередній день і заверши аналіз.';
  }, [selectedDayResumeSession, selectedDayState]);

  // Навігаційні функції
  const openMorning = (dayKey: string = selectedDay) => {
    navigate(buildCycleUrl('morning', dayKey, todayKey));
  };

  const openEvening = (dayKey: string = selectedDay) => {
    navigate(buildCycleUrl('evening', dayKey, todayKey));
  };

  const openMicroTasks = () => navigate('/dashboard/microtasks');
  const openZoom = () => navigate('/dashboard/zoom');
  const openAI = () => navigate('/dashboard/ai-mentor');

  const openRecovery = () => {
    if (recoveryTargetSession && recoveryDayKey) {
      navigate(buildCycleUrl(recoveryTargetSession, recoveryDayKey, todayKey));
    }
  };

  const openResume = () => {
    if (selectedDayResumeSession) {
      navigate(buildCycleUrl(selectedDayResumeSession, selectedDay, todayKey));
    }
  };

  // Допоміжні для Zoom
  const getZoomFooter = (event: JournalEvent) => {
    const attended = event.meta?.attended;
    if (attended === true) return 'Участь підтверджена.';
    if (attended === false) return 'Сесію пропущено.';
    return 'Сесія запланована на цей день.';
  };

  const getZoomStatusBadge = (event: JournalEvent) => {
    const attended = event.meta?.attended;
    const status = attended === true ? 'done' : attended === false ? 'missed' : 'pending';
    const tone = getStatusTone(status);

    return {
      className: `rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.chip}`,
      label: attended === true ? 'Відвідано' : attended === false ? 'Пропущено' : 'Заплановано',
    };
  };

  const completeTask = (taskId: string) => {
    // Тут можна викликати мутацію, якщо потрібно. Поки що просто заглушка.
    console.log('Complete task:', taskId);
    // Приклад: completeTaskMutation(taskId)
  };

  const skipTask = (taskId: string) => {
    console.log('Skip task:', taskId);
    // skipTaskMutation(taskId)
  };

  return {
    todayKey,
    yesterdayKey,
    selectedDate,
    currentStreak,

    // Recovery
    recoveryDayKey,
    recoveryDayState,
    recoveryNeedsAttention,
    recoveryTargetSession,
    recoveryDescription,
    openRecovery,

    // Resume для обраного дня
    selectedDayRecovery,
    selectedDayResumeSession,
    resumeDescription,
    openResume,

    // Відкриття секцій
    openMorning,
    openEvening,
    openMicroTasks,
    openZoom,
    openAI,

    // Допоміжні
    getZoomFooter,
    getZoomStatusBadge,
    completeTask,
    skipTask,
  };
}
