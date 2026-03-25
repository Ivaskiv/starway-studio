import { useEffect, useMemo, useState } from 'react'
import { useGetJournalRangeQuery } from '@/features/journal/journal.api'
import type { JournalEvent } from '@/features/journal/types'

function toDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function useWeeklyJournal() {
  const today = useMemo(() => new Date(), [])
  const start = useMemo(() => {
    const date = startOfDay(today)
    date.setDate(date.getDate() - 6)
    return date
  }, [today])
  const end = useMemo(() => endOfDay(today), [today])

  const { data = [], isFetching, isLoading } = useGetJournalRangeQuery({
    start: start.toISOString(),
    end: end.toISOString(),
  })

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [start])

  const [selectedDay, setSelectedDay] = useState<string>(() => toDateKey(today))

  const groupedEventsByDay = useMemo(() => {
    return data.reduce<Record<string, JournalEvent[]>>((acc, event) => {
      const key = toDateKey(event.date)
      if (!acc[key]) acc[key] = []
      acc[key].push(event)
      return acc
    }, {})
  }, [data])

  useEffect(() => {
    const todayKey = toDateKey(today)
    const sortedKeys = Object.keys(groupedEventsByDay).sort()
    const fallbackKey = sortedKeys[sortedKeys.length - 1] ?? todayKey
    setSelectedDay((current) => (groupedEventsByDay[current] || current === todayKey ? current : fallbackKey))
  }, [groupedEventsByDay, today])

  return {
    days,
    eventsByDate: groupedEventsByDay,
    isFetching,
    isLoading,
    selectedDay,
    setSelectedDay,
  }
}
