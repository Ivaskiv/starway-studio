import { useEffect, useMemo, useState } from 'react'
import { useGetJournalEventsQuery } from '../journal.api'
import type { JournalEvent, JournalFilter } from '../types'

function toDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function filterEvents(events: JournalEvent[], filter: JournalFilter) {
  return events.filter((event) => {
    if (filter === 'zoom') return event.type === 'ZOOM'
    if (filter === 'practices') return event.type === 'TASK'
    return true
  })
}

export function useJournal(month: number, year: number) {
  const { data = [], isFetching, isLoading } = useGetJournalEventsQuery({ month, year })
  const [selectedDay, setSelectedDay] = useState<string>(() => toDateKey(new Date(year, month - 1, 1)))
  const [filter, setFilter] = useState<JournalFilter>('all')

  const filteredEvents = useMemo(() => filterEvents(data, filter), [data, filter])

  const groupedEventsByDay = useMemo(() => {
    return filteredEvents.reduce<Record<string, JournalEvent[]>>((acc, event) => {
      const key = toDateKey(event.date)
      if (!acc[key]) acc[key] = []
      acc[key].push(event)
      return acc
    }, {})
  }, [filteredEvents])

  useEffect(() => {
    const keys = Object.keys(groupedEventsByDay).sort()
    const nextSelectedDay = keys[0] ?? toDateKey(new Date(year, month - 1, 1))
    setSelectedDay((current) => (groupedEventsByDay[current] || current.startsWith(`${year}-${`${month}`.padStart(2, '0')}`)) ? current : nextSelectedDay)
  }, [groupedEventsByDay, month, year])

  const selectedEvents = groupedEventsByDay[selectedDay] ?? []

  return {
    events: filteredEvents,
    filter,
    filteredEvents,
    groupedEventsByDay,
    isLoading,
    isFetching,
    selectedDay,
    selectedEvents,
    setFilter,
    setSelectedDay,
  }
}
