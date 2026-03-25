import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import JournalLayout from './components/JournalLayout'
import { useJournal } from './hooks/useJournal'
import { isTelegramMiniAppContext } from '@/features/social/utils/telegramWebApp'

function shiftMonth(month: number, year: number, diff: number) {
  const date = new Date(year, month - 1 + diff, 1)
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  }
}

export default function JournalPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const today = new Date()
  const [calendar, setCalendar] = useState({
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  })

  const journal = useJournal(calendar.month, calendar.year)

  useEffect(() => {
    if (!isTelegramMiniAppContext(location.pathname)) return
    navigate('/miniapp/journal', { replace: true })
  }, [location.pathname, navigate])

  return (
    <div className="p-6">
      <JournalLayout
        month={calendar.month}
        year={calendar.year}
        events={journal.filteredEvents}
        eventsByDate={journal.groupedEventsByDay}
        filter={journal.filter}
        isLoading={journal.isLoading || journal.isFetching}
        selectedDay={journal.selectedDay}
        selectedEvents={journal.selectedEvents}
        onFilterChange={journal.setFilter}
        onPrevMonth={() => setCalendar(current => shiftMonth(current.month, current.year, -1))}
        onNextMonth={() => setCalendar(current => shiftMonth(current.month, current.year, 1))}
        onSelectDay={journal.setSelectedDay}
      />
    </div>
  )
}
