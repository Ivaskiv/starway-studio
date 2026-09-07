import type { ZoomCalendarSession } from '../../zoom.types'

export function BookingStatus({
  session,
  onAddToCalendar,
  onUnbook,
  unbookDisabled = false,
}: {
  session: ZoomCalendarSession;
  onAddToCalendar: (session: ZoomCalendarSession) => void;
  onUnbook?: (session: ZoomCalendarSession) => void;
  unbookDisabled?: boolean;
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

      {onUnbook ? (
        <button
          className="bg-white/5 hover:bg-white/10 text-white/75 text-sm px-3 py-2 rounded-lg border border-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onUnbook(session)}
          type="button"
          disabled={unbookDisabled}
        >
          Скасувати запис
        </button>
      ) : null}
    </div>
  );
}
