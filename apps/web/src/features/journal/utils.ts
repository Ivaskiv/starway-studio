import type { JournalDayState, JournalEvent, JournalFilter } from './types';

// ==================== БАЗОВІ ДАТА-УТИЛІТИ ====================

export function toDateKey(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, date ?? 1);
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function isYesterdayDateKey(dayKey: string, todayKey = toDateKey(new Date())): boolean {
  return dayKey === toDateKey(addDays(parseDateKey(todayKey), -1));
}

export function isRecoverableDateKey(dayKey: string, todayKey = toDateKey(new Date())): boolean {
  return dayKey === todayKey || isYesterdayDateKey(dayKey, todayKey);
}

// ==================== ФІЛЬТРАЦІЯ ====================

export function filterEvents(events: JournalEvent[], filter: JournalFilter): JournalEvent[] {
  return events.filter((event) => {
    if (filter === 'zoom') return event.type === 'ZOOM';
    if (filter === 'practices') return event.type === 'TASK';
    return true;
  });
}

export function filterDayState(day: JournalDayState, filter: JournalFilter): JournalDayState {
  if (filter === 'all') return day;

  const filteredEvents = filterEvents(day.events, filter);
  const filteredTasks = filter === 'practices' ? day.microTasks.items : [];
  const filteredZoom = filter === 'zoom' ? day.zoomSessions.items : [];

  return {
    ...day,
    events: filteredEvents,
    microTasks: {
      ...day.microTasks,
      items: filteredTasks,
      activeCount: filteredTasks.filter(
        (event) =>
          event.meta?.completed !== true &&
          event.meta?.skipped !== true &&
          event.meta?.expired !== true
      ).length,
      completedCount: filteredTasks.filter((event) => event.meta?.completed === true).length,
      missedCount: filteredTasks.filter(
        (event) => event.meta?.skipped === true || event.meta?.expired === true
      ).length,
    },
    zoomSessions: {
      ...day.zoomSessions,
      items: filteredZoom,
    },
  };
}

// ==================== ЦИКЛ ДНЯ (Morning / Evening) ====================

export function buildCycleUrl(
  session: 'morning' | 'evening',
  dayKey: string,
  todayKey: string
): string {
  const datePart = dayKey === todayKey ? '' : `&date=${dayKey}`;
  return `/dashboard/cycle?session=${session}${datePart}`;
}

// ==================== DRAFTS (локальне збереження) ====================

export function getDraftKey(
  userId: string,
  session: 'morning' | 'evening',
  dateKey: string
): string {
  return `starway_daily_cycle_draft:${userId || 'guest'}:${session}:${dateKey}`;
}

export function hasDraftForDay(
  userId: string,
  session: 'morning' | 'evening',
  dateKey: string
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.localStorage.getItem(getDraftKey(userId, session, dateKey)));
  } catch {
    return false;
  }
}

// ==================== RECOVERY & SESSION LOGIC ====================

export function resolveRecoverySession(dayState: JournalDayState | undefined): 'morning' | 'evening' {
  if (!dayState) return 'morning';
  return dayState.reflection.morning.status !== 'done' ? 'morning' : 'evening';
}

// ==================== TASK HELPERS ====================

export function getTaskId(event: JournalEvent): string | null {
  if (event.type !== 'TASK') return null;
  const [, taskId] = event.id.split(':');
  return taskId || null;
}

export function stripTaskPrefix(title: string): string {
  return title
    .replace(/^Виконано:\s*/u, '')
    .replace(/^Перенесено:\s*/u, '')
    .replace(/^Прострочено:\s*/u, '')
    .replace(/^Дедлайн:\s*/u, '')
    .trim();
}

export function getTaskStatus(event: JournalEvent): 'done' | 'pending' | 'missed' {
  if (event.meta?.completed === true) return 'done';
  if (event.meta?.skipped === true || event.meta?.expired === true) return 'missed';
  return 'pending';
}

// ==================== ВІЗУАЛЬНІ СТАТУСИ ====================

export function getStatusTone(status: 'done' | 'pending' | 'missed') {
  if (status === 'done') {
    return {
      chip: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
      text: 'text-emerald-300',
      dot: 'bg-emerald-400',
    };
  }

  if (status === 'missed') {
    return {
      chip: 'border-rose-400/25 bg-rose-500/10 text-rose-300',
      text: 'text-rose-300',
      dot: 'bg-rose-400',
    };
  }

  return {
    chip: 'border-amber-300/25 bg-amber-400/10 text-amber-200',
    text: 'text-amber-200',
    dot: 'bg-amber-300',
  };
}

// ==================== CHECKLIST ДНЯ ====================

export function getDayChecklistState(dayState: JournalDayState, dayKey: string) {
  const finalizedDateKey = dayState.finalizedAt ? toDateKey(dayState.finalizedAt) : null;
  const isLateCompletion = Boolean(finalizedDateKey && finalizedDateKey !== dayKey);

  const morningDone = dayState.reflection.morning.status === 'done';
  const microTasksDone =
    dayState.microTasks.completedCount > 0 &&
    dayState.microTasks.activeCount === 0 &&
    dayState.microTasks.missedCount === 0;

  const microTasksInProgress =
    dayState.microTasks.activeCount > 0 ||
    dayState.microTasks.missedCount > 0 ||
    dayState.microTasks.completedCount > 0;

  const eveningDone = dayState.reflection.evening.status === 'done';
  const analysisDone = Boolean(dayState.finalizedAt);

  const items: Array<{
    label: string;
    done: boolean;
    partial?: boolean;
    helper: string;
  }> = [
    {
      label: 'Ранок',
      done: morningDone,
      helper: morningDone ? 'Стан дня зафіксовано.' : 'Ще не заповнено.',
    },
    {
      label: 'Мікрозавдання',
      done: microTasksDone,
      helper: microTasksDone
        ? 'Усі задачі дня закрито.'
        : microTasksInProgress
          ? 'Є відкриті задачі на сьогодні.'
          : 'Ще не з’явилися або не відкривались.',
    },
    {
      label: 'Вечір',
      done: eveningDone,
      helper: eveningDone ? 'Вечірній підсумок збережено.' : 'Ще не закрито.',
    },
    {
      label: 'Аналіз дня',
      done: analysisDone,
      helper: analysisDone
        ? isLateCompletion
          ? 'Завершено із запізненням.'
          : 'Завершено вчасно.'
        : 'Очікує фінального завершення.',
    },
  ];

  return {
    isLateCompletion,
    items,
  };
}

// ==================== WEEK HELPERS ====================

export function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

export function getWeekDates(selectedDay: string): Date[] {
  const start = startOfWeek(parseDateKey(selectedDay));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}