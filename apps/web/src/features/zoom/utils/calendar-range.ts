import { getWeekDays } from '../zoom.utils'
import type {
  CalendarView,
  ZoomCalendarSession,
} from '../zoom.types'

export function startOf(view: CalendarView, date: Date): Date {
  if (view === 'month') {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }
  const days = getWeekDays(date);
  return new Date(days[0].setHours(0, 0, 0, 0));
}

export function endOf(view: CalendarView, date: Date): Date {
  if (view === 'month') {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  const days = getWeekDays(date);
  return new Date(days[6].setHours(23, 59, 59, 999));
}

export function getNearestSession(sessions: ZoomCalendarSession[]): ZoomCalendarSession | null {
  const now = Date.now();

  return sessions
    .filter((session) => new Date(session.scheduledAt).getTime() > now)
    .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime())[0] ?? null;
}
