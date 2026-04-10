import { useEffect, useMemo, useState } from 'react'
import { useGetJournalRangeQuery } from '@/features/journal/journal.api'
import type { JournalDayState } from '@/features/journal/types'
import { toDateKey } from '@/features/journal/utils'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

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
      pending: 2,
      missed: 0,
    },
  }
}

export function useWeeklyJournal() {
  const today = useMemo(() => new Date(), [])
  const start = useMemo(() => {
    const date = startOfDay(today)
    date.setDate(date.getDate() - 6)
    return date
  }, [today])
  const end = useMemo(() => endOfDay(today), [today])

  const { data, isFetching, isLoading, error } = useGetJournalRangeQuery(
    {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    {
      pollingInterval: 15_000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  )

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [start])

  const [selectedDay, setSelectedDay] = useState<string>(() => toDateKey(today))

  const dayStatesByDate = useMemo(() => {
    return (data?.days ?? []).reduce<Record<string, JournalDayState>>((acc, day) => {
      acc[day.dateKey] = day
      return acc
    }, {})
  }, [data?.days])

  useEffect(() => {
    const todayKey = toDateKey(today)
    const sortedKeys = Object.keys(dayStatesByDate).sort()
    const fallbackKey = sortedKeys[sortedKeys.length - 1] ?? todayKey
    setSelectedDay((current) => (dayStatesByDate[current] || current === todayKey ? current : fallbackKey))
  }, [dayStatesByDate, today])

  return {
    days,
    dayStatesByDate,
    isFetching,
    isLoading,
    isError: Boolean(error),
    selectedDay,
    selectedDayState: dayStatesByDate[selectedDay] ?? createFallbackDayState(selectedDay),
    setSelectedDay,
  }
}
