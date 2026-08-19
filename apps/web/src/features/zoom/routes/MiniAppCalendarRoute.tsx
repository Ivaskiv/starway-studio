import { CalendarView } from '../components/mini-app/CalendarView'
import { useMiniAppCalendar } from '../hooks/useMiniAppCalendar'

export default function MiniAppCalendarRoute() {
  const controller = useMiniAppCalendar()

  return <CalendarView controller={controller} />
}