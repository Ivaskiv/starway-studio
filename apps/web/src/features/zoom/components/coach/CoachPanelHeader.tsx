import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatWeekRange } from './coachPanelPresentation'

export interface CoachPanelHeaderProps {
  coachHeaderName: string
  canManageZoom: boolean
  activeCoachScreen: 'calendar' | 'participants' | 'battle' | 'analytics' | 'more'
  calendarMode: 'calendar' | 'availability'
  weekFrom: string
  onCreateSession: (date: Date) => void
  onChangeCalendarMode: (mode: 'calendar' | 'availability') => void
  onPreviousWeek: () => void
  onCurrentWeek: () => void
  onNextWeek: () => void
}

export function CoachPanelHeader({ coachHeaderName, canManageZoom, activeCoachScreen, calendarMode, weekFrom, onCreateSession, onChangeCalendarMode, onPreviousWeek, onCurrentWeek, onNextWeek }: CoachPanelHeaderProps) {
  const weekRange = { from: weekFrom }
  return (
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
              <h1 className="text-xl font-semibold leading-tight text-white">Панель коуча</h1>
              <p className="mt-0.5 text-xs text-white/56">{coachHeaderName} · Starway Studio</p>
          </div>
          {canManageZoom && activeCoachScreen === 'calendar' && (
            <button
              type="button"
              onClick={() => onCreateSession(new Date())}
              className="rounded-lg border border-sky-400 bg-gradient-to-b from-sky-700/50 to-sky-950/50 px-3 py-2 text-[11px] font-semibold text-white"
            >
              + НОВА СЕСІЯ
            </button>
          )}
        </div>

        {activeCoachScreen === 'calendar' && <div className="mt-3 grid grid-cols-2 rounded-lg border border-slate-700/60">
          <button type="button" aria-pressed={calendarMode === 'calendar'} onClick={() => onChangeCalendarMode('calendar')} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${calendarMode === 'calendar' ? 'border-sky-400 bg-gradient-to-b from-sky-700/50 to-sky-950/50 text-white' : 'border-transparent text-sky-100/80'}`}>КАЛЕНДАР</button>
          <button type="button" aria-pressed={calendarMode === 'availability'} onClick={() => onChangeCalendarMode('availability')} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${calendarMode === 'availability' ? 'border-sky-400 bg-gradient-to-b from-sky-700/50 to-sky-950/50 text-white' : 'border-transparent text-sky-100/80'}`}>МОЯ ДОСТУПНІСТЬ</button>
        </div>}

        {activeCoachScreen === 'calendar' && calendarMode === 'calendar' && <>
        <div className="mt-4 flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={onPreviousWeek}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Попередній тиждень"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-semibold text-white">{formatWeekRange(weekRange.from)} {new Date(weekRange.from).getUTCFullYear()}</p>
          </div>
          <button
            type="button"
            onClick={onCurrentWeek}
            className="rounded-xl border border-sky-300/20 bg-sky-500/10 px-3 py-2 text-[12px] font-semibold text-sky-100 transition hover:bg-sky-500/16"
          >
            Сьогодні
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Наступний тиждень"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        </>}
      </div>

  )
}
