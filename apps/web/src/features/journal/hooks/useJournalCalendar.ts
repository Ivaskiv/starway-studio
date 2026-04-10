import { useState, useMemo } from 'react';

export function shiftMonth(month: number, year: number, diff: number) {
  const date = new Date(year, month - 1 + diff, 1);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export function getMonthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('uk-UA', {
    month: 'long',
    year: 'numeric',
  });
}

export function useJournalCalendar(initialMonth?: number, initialYear?: number) {
  const today = new Date();
  const [calendar, setCalendar] = useState({
    month: initialMonth ?? today.getMonth() + 1,
    year: initialYear ?? today.getFullYear(),
  });

  const monthLabel = useMemo(
    () => getMonthLabel(calendar.month, calendar.year),
    [calendar.month, calendar.year]
  );

  const prevMonth = () => setCalendar((c) => shiftMonth(c.month, c.year, -1));
  const nextMonth = () => setCalendar((c) => shiftMonth(c.month, c.year, 1));

  return {
    ...calendar,
    monthLabel,
    setCalendar,
    prevMonth,
    nextMonth,
  };
}