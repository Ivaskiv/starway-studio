// apps/web/src/features/journal/hooks/useJournal.ts
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGetJournalEventsQuery } from '../journal.api';
import { useGetUpcomingSessionQuery } from '@/features/zoom/services/zoom.api';
import type { JournalDayState, JournalEvent, JournalFilter } from '../types';
import { filterDayState, filterEvents, parseDateKey, toDateKey } from '../utils';
import { useJournalCalendar } from './useJournalCalendar';

function createFallbackDayState(dateKey: string): JournalDayState {
  return {
    date: `${dateKey}T12:00:00.000Z`,
    dateKey,
    hasEntry: false,
    events: [],
    reflection: {
      morning: { status: 'pending', event: null },
      evening: { status: 'pending', event: null },
    },
    microTasks: {
      status: 'awaiting',
      items: [],
      activeCount: 0,
      completedCount: 0,
      missedCount: 0,
    },
    zoomSessions: {
      status: 'empty',
      items: [],
    },
    systemSignals: [],
    summary: {
      xp: 0,
      completed: 0,
      pending: 0,
      missed: 0,
    },
    finalizedAt: null,
  };
}

export function useJournal() {
  const location = useLocation();
  const dateFromUrl = useMemo(() => {
    const value = new URLSearchParams(location.search).get('date');
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }, [location.search]);
  const initialCalendarDate = useMemo(
    () => (dateFromUrl ? parseDateKey(dateFromUrl) : new Date()),
    [dateFromUrl],
  );

  // Календарна частина
  const calendar = useJournalCalendar(initialCalendarDate.getMonth() + 1, initialCalendarDate.getFullYear());

  // API запити
  const { data, isFetching, isLoading, error } = useGetJournalEventsQuery(
    { month: calendar.month, year: calendar.year },
    {
      pollingInterval: 15_000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

  const { data: upcomingZoom } = useGetUpcomingSessionQuery();

  // Локальний стан
  const [filter, setFilter] = useState<JournalFilter>('all');
  const [selectedDay, setSelectedDay] = useState<string>('');

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const yesterdayKey = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return toDateKey(date);
  }, []);

  const currentMonthPrefix = useMemo(
    () => `${calendar.year}-${String(calendar.month).padStart(2, '0')}`,
    [calendar.year, calendar.month]
  );

  const isCurrentMonth = todayKey.startsWith(currentMonthPrefix);

  const days = data?.days ?? [];

  // Додаємо synthetic upcoming Zoom сесію
  const daysWithUpcomingZoom = useMemo(() => {
    if (!upcomingZoom?.scheduledAt || upcomingZoom.status !== 'SCHEDULED') {
      return days;
    }

    const upcomingDateKey = toDateKey(upcomingZoom.scheduledAt);
    if (!upcomingDateKey.startsWith(currentMonthPrefix)) return days;

    return days.map((day) => {
      if (day.dateKey !== upcomingDateKey) return day;

      const alreadyPresent = day.zoomSessions.items.some(
        (event) => event.meta?.sessionId === upcomingZoom.id
      );

      if (alreadyPresent) return day;

      const syntheticEvent: JournalEvent = {
        id: `zoom:upcoming:${upcomingZoom.id}`,
        type: 'ZOOM',
        date: upcomingZoom.scheduledAt,
        title: upcomingZoom.topic || 'Zoom-сесія',
        meta: {
          sessionId: upcomingZoom.id,
          status: upcomingZoom.status,
          attended: null,
          source: 'upcoming',
        },
      };

      return {
        ...day,
        events: [...day.events, syntheticEvent].sort((a, b) => a.date.localeCompare(b.date)),
        zoomSessions: {
          ...day.zoomSessions,
          status: 'scheduled' as const,
          items: [...day.zoomSessions.items, syntheticEvent].sort((a, b) => a.date.localeCompare(b.date)),
        },
        summary: {
          ...day.summary,
          pending: day.summary.pending + 1,
        },
      };
    });
  }, [days, upcomingZoom, currentMonthPrefix]);

  // Дні з застосуванням фільтра
  const daysByDate = useMemo(() => {
    return daysWithUpcomingZoom.reduce<Record<string, JournalDayState>>((acc, day) => {
      acc[day.dateKey] = filterDayState(day, filter);
      return acc;
    }, {});
  }, [daysWithUpcomingZoom, filter]);

  // Найближчий незавершений день (вчора)
  const latestIncompleteDay = useMemo(() => {
    return [...daysWithUpcomingZoom]
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
      .find((day) => day.dateKey === yesterdayKey && day.hasEntry && !day.finalizedAt)
      ?.dateKey ?? null;
  }, [daysWithUpcomingZoom, yesterdayKey]);

  // Фільтровані події
  const filteredEvents = useMemo(() => {
    return filterEvents(
      daysWithUpcomingZoom.flatMap((day) => day.events)
        .sort((a, b) => b.date.localeCompare(a.date)),
      filter
    );
  }, [daysWithUpcomingZoom, filter]);

  const groupedEventsByDay = useMemo(() => {
    return filteredEvents.reduce<Record<string, JournalEvent[]>>((acc, event) => {
      const key = toDateKey(event.date);
      acc[key] ??= [];
      acc[key].push(event);
      return acc;
    }, {});
  }, [filteredEvents]);

  // Ініціалізація selectedDay при зміні місяця
  useEffect(() => {
    const initialDay = isCurrentMonth 
      ? todayKey 
      : toDateKey(new Date(calendar.year, calendar.month - 1, 1));

    setSelectedDay(initialDay);
  }, [calendar.month, calendar.year, isCurrentMonth, todayKey]);

  useEffect(() => {
    if (!dateFromUrl) return;

    const parsed = parseDateKey(dateFromUrl);
    if (calendar.month !== parsed.getMonth() + 1 || calendar.year !== parsed.getFullYear()) {
      calendar.setCalendar({ month: parsed.getMonth() + 1, year: parsed.getFullYear() });
      return;
    }

    setSelectedDay(dateFromUrl);
  }, [calendar, dateFromUrl]);

  // Корекція selectedDay після отримання даних
  useEffect(() => {
    if (Object.keys(daysByDate).length === 0) return;

    setSelectedDay((current) => {
      if (daysByDate[current]) return current;
      if (isCurrentMonth && daysByDate[todayKey]) return todayKey;

      const sortedKeys = Object.keys(daysByDate).sort();
      return sortedKeys[0] ?? toDateKey(new Date(calendar.year, calendar.month - 1, 1));
    });
  }, [daysByDate, isCurrentMonth, todayKey, calendar.year, calendar.month]);

  const selectedDayState = daysByDate[selectedDay] ?? createFallbackDayState(selectedDay);

  const selectedEvents = selectedDayState.events.length > 0
    ? selectedDayState.events
    : (groupedEventsByDay[selectedDay] ?? []);

  return {
    // Календар
    month: calendar.month,
    year: calendar.year,
    monthLabel: calendar.monthLabel,
    prevMonth: calendar.prevMonth,
    nextMonth: calendar.nextMonth,

    // Журнал
    events: filteredEvents,
    filter,
    daysByDate,
    latestIncompleteDay,
    isLoading,
    isFetching,
    isError: Boolean(error),

    // Вибраний день
    selectedDay,
    selectedDayState,
    selectedEvents,

    // Actions
    setFilter,
    setSelectedDay,
  };
}





// import { useEffect, useMemo, useState } from 'react'
// import { useGetJournalEventsQuery } from '../journal.api'
// import type { JournalDayState, JournalEvent, JournalFilter } from '../types'
// import { filterDayState, filterEvents, toDateKey } from '../utils'
// import { useGetUpcomingSessionQuery } from '@/features/zoom/services/booking.api'

// function createFallbackDayState(dateKey: string): JournalDayState {
//   return {
//     date: `${dateKey}T12:00:00.000Z`,
//     dateKey,
//     hasEntry: false,
//     events: [],
//     reflection: {
//       morning: { status: 'pending', event: null },
//       evening: { status: 'pending', event: null },
//     },
//     microTasks: {
//       status: 'awaiting',
//       items: [],
//       activeCount: 0,
//       completedCount: 0,
//       missedCount: 0,
//     },
//     zoomSessions: {
//       status: 'empty',
//       items: [],
//     },
//     systemSignals: [],
//     summary: {
//       xp: 0,
//       completed: 0,
//       pending: 0,
//       missed: 0,
//     },
//   }
// }

// export function useJournal(month: number, year: number) {
//   const todayKey = toDateKey(new Date())
//   const yesterdayKey = useMemo(() => {
//     const date = new Date()
//     date.setDate(date.getDate() - 1)
//     return toDateKey(date)
//   }, [])
//   const currentMonthPrefix = `${year}-${`${month}`.padStart(2, '0')}`
//   const isCurrentMonth = todayKey.startsWith(currentMonthPrefix)
//   const { data, isFetching, isLoading, error } = useGetJournalEventsQuery(
//     { month, year },
//     {
//       pollingInterval: 15_000,
//       refetchOnFocus: true,
//       refetchOnReconnect: true,
//     },
//   )
//   const { data: upcomingZoom } = useGetUpcomingSessionQuery()

//   const [selectedDay, setSelectedDay] = useState<string>(() =>
//     isCurrentMonth ? todayKey : toDateKey(new Date(year, month - 1, 1)),
//   )
//   const [filter, setFilter] = useState<JournalFilter>('all')

//   const days = data?.days ?? []

//   const daysWithUpcomingZoom = useMemo(() => {
//     if (!upcomingZoom?.scheduledAt || upcomingZoom.status !== 'SCHEDULED') {
//       return days
//     }

//     const upcomingDateKey = toDateKey(upcomingZoom.scheduledAt)
//     if (!upcomingDateKey.startsWith(currentMonthPrefix)) {
//       return days
//     }

//     return days.map((day) => {
//       if (day.dateKey !== upcomingDateKey) return day

//       const alreadyPresent = day.zoomSessions.items.some(
//         (event) => event.meta?.sessionId === upcomingZoom.id,
//       )

//       if (alreadyPresent) return day

//       const syntheticEvent: JournalEvent = {
//         id: `zoom:upcoming:${upcomingZoom.id}`,
//         type: 'ZOOM',
//         date: upcomingZoom.scheduledAt,
//         title: upcomingZoom.topic || 'Zoom-сесія',
//         meta: {
//           sessionId: upcomingZoom.id,
//           status: upcomingZoom.status,
//           attended: null,
//           source: 'upcoming',
//         },
//       }

//       return {
//         ...day,
//         events: [...day.events, syntheticEvent].sort((left, right) => left.date.localeCompare(right.date)),
//         zoomSessions: {
//           ...day.zoomSessions,
//           status: 'scheduled' as const,
//           items: [...day.zoomSessions.items, syntheticEvent].sort((left, right) => left.date.localeCompare(right.date)),
//         },
//         summary: {
//           ...day.summary,
//           pending: day.summary.pending + 1,
//         },
//       }
//     })
//   }, [currentMonthPrefix, days, upcomingZoom])

//   const daysByDate = useMemo(() => {
//     return daysWithUpcomingZoom.reduce<Record<string, JournalDayState>>((acc, day) => {
//       acc[day.dateKey] = filterDayState(day, filter)
//       return acc
//     }, {})
//   }, [daysWithUpcomingZoom, filter])

//   const latestIncompleteDay = useMemo(() => {
//     return [...daysWithUpcomingZoom]
//       .sort((left, right) => right.dateKey.localeCompare(left.dateKey))
//       .find((day) => {
//         if (day.dateKey !== yesterdayKey) return false
//         return day.hasEntry && !day.finalizedAt
//       })?.dateKey ?? null
//   }, [daysWithUpcomingZoom, yesterdayKey])

//   const filteredEvents = useMemo(() => {
//     return filterEvents(
//       daysWithUpcomingZoom
//         .flatMap((day) => day.events)
//         .sort((left, right) => right.date.localeCompare(left.date)),
//       filter,
//     )
//   }, [daysWithUpcomingZoom, filter])

//   const groupedEventsByDay = useMemo(() => {
//     return filteredEvents.reduce<Record<string, typeof filteredEvents>>((acc, event) => {
//       const key = toDateKey(event.date)
//       if (!acc[key]) acc[key] = []
//       acc[key].push(event)
//       return acc
//     }, {})
//   }, [filteredEvents])

//   useEffect(() => {
//     const nextInitialDay = isCurrentMonth
//       ? todayKey
//       : toDateKey(new Date(year, month - 1, 1))

//     setSelectedDay(nextInitialDay)
//   }, [isCurrentMonth, month, todayKey, year])

//   useEffect(() => {
//     const keys = Object.keys(daysByDate).sort()
//     const fallbackDay = isCurrentMonth ? todayKey : toDateKey(new Date(year, month - 1, 1))
//     const nextSelectedDay = daysByDate[todayKey]
//       ? todayKey
//       : keys[0] ?? fallbackDay

//     setSelectedDay((current) => {
//       if (daysByDate[current]) return current
//       if (current === todayKey && isCurrentMonth) return current
//       if (current.startsWith(currentMonthPrefix) && !isCurrentMonth) return current
//       return nextSelectedDay
//     })
//   }, [currentMonthPrefix, daysByDate, isCurrentMonth, month, todayKey, year])

//   const selectedDayState = daysByDate[selectedDay] ?? createFallbackDayState(selectedDay)
//   const selectedEvents = selectedDayState.events.length > 0
//     ? selectedDayState.events
//     : groupedEventsByDay[selectedDay] ?? []

//   return {
//     events: filteredEvents,
//     filter,
//     filteredEvents,
//     groupedEventsByDay,
//     days,
//     daysByDate,
//     isLoading,
//     isFetching,
//     isError: Boolean(error),
//     selectedDay,
//     selectedDayState,
//     selectedEvents,
//     latestIncompleteDay,
//     setFilter,
//     setSelectedDay,
//   }
// }
