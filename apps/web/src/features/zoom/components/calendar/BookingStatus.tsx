import type { ZoomCalendarSession } from '../../zoom.types'

export function BookingStatus({
  session,
  onAddToCalendar,
}: {
  session: ZoomCalendarSession;
  onAddToCalendar: (session: ZoomCalendarSession) => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="text-green-400 text-sm font-semibold">
        Ти записана
      </div>

      <button
        className="bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-lg"
        onClick={() => onAddToCalendar(session)}
        type="button"
      >
        Додати в календар
      </button>
    </div>
  );
}
