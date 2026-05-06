import { useEffect, useRef } from 'react'

import type { DailyHistoryProgress } from '../utils/dashboard.types'
import {
  formatCompactDateKey,
  getTimelineCardClass,
  getTimelineDayPresentation,
  getTimelineDigitClass,
  getTimelineLabelClass,
  toDateKey,
} from '../utils/dashboard.utils'

type Props = {
  totalDays: number
  currentDay: number
  timelineStartDate: Date
  todayDateKey: string
  yesterdayDateKey: string
  recoveryDateKey: string | null
  recoveryTargetDateKey: string | null
  recoveryTargetSession: 'morning' | 'evening' | null
  showEveningSession: boolean
  historyByDate: Record<string, DailyHistoryProgress>
  isLocked: boolean
  openDayNoticeKey: string | null
  setOpenDayNoticeKey: (value: string | null | ((current: string | null) => string | null)) => void
  onOpenActiveDay: () => void
  onOpenFirstIncompleteRecoveryStep: (dateKey: string, progress?: DailyHistoryProgress | null) => void
  onOpenReportDay: (dateKey: string) => void
}

export default function CycleSummaryTimeline({
  totalDays,
  currentDay,
  timelineStartDate,
  todayDateKey,
  yesterdayDateKey,
  recoveryDateKey,
  recoveryTargetDateKey,
  recoveryTargetSession,
  showEveningSession,
  historyByDate,
  isLocked,
  openDayNoticeKey,
  setOpenDayNoticeKey,
  onOpenActiveDay,
  onOpenFirstIncompleteRecoveryStep,
  onOpenReportDay,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const activeCardRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    const activeCard = activeCardRef.current
    if (!scroller || !activeCard) return

    const scrollerRect = scroller.getBoundingClientRect()
    const cardRect = activeCard.getBoundingClientRect()
    const targetLeft = activeCard.offsetLeft - ((scrollerRect.width - cardRect.width) / 2)
    const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
    const nextScrollLeft = Math.min(Math.max(0, targetLeft), maxScrollLeft)

    scroller.scrollTo({
      left: nextScrollLeft,
      behavior: 'smooth',
    })
  }, [currentDay, todayDateKey])

  return (
    <div ref={scrollerRef} className="mb-3 overflow-x-auto overflow-y-visible pt-1.5 pb-4">
      <div className="flex w-max gap-2 px-1.5">
        {Array.from({ length: totalDays }).map((_, index) => {
          const day = index + 1
          const dayDate = new Date(timelineStartDate)
          dayDate.setDate(timelineStartDate.getDate() + index)
          const dayDateKey = toDateKey(dayDate)
          const dayProgress =
            historyByDate[dayDateKey]
            ?? (
              dayDateKey === yesterdayDateKey && recoveryTargetDateKey === yesterdayDateKey
                ? {
                    morningDone: false,
                    tasksDone: false,
                    eveningDone: false,
                    analysisDone: false,
                    finalizedAt: null,
                    skipped: false,
                    hasProgress: false,
                    completed: false,
                    completedLate: false,
                    unfinishedStepCount: 4,
                    incompleteMicroTaskCount: 0,
                  }
                : undefined
            )
          const active = day === currentDay
          const {
            isRecoveryTargetDay,
            unfinishedStepCount,
            incompleteMicroTaskCount,
            doneCount,
            dayTone,
            dayLabel,
            dayDots,
          } = getTimelineDayPresentation({
            dayDateKey,
            todayDateKey,
            yesterdayDateKey,
            active,
            showEveningSession,
            recoveryDateKey,
            recoveryTargetDateKey,
            recoveryTargetSession,
            dayProgress,
          })
          const hasBellNotice = Boolean(isRecoveryTargetDay || (dayTone === 'partial' && unfinishedStepCount > 0))
          const isBellOpen = openDayNoticeKey === dayDateKey
          const isLockedHistoryDay = dayDateKey < yesterdayDateKey

          return (
            <button
              key={day}
              ref={active ? activeCardRef : null}
              type="button"
              disabled={dayDateKey > todayDateKey}
              className={[
                'relative flex h-[156px] w-[72px] flex-shrink-0 flex-col overflow-visible rounded-[18px] px-[10px] py-2.5 text-center transition-all disabled:cursor-default',
                isBellOpen ? 'z-30' : 'z-0',
                getTimelineCardClass(dayTone),
                dayDateKey <= todayDateKey ? 'cursor-pointer hover:border-amber-300/50' : '',
              ].join(' ')}
              onClick={() => {
                if (dayDateKey > todayDateKey) return
                if (isLockedHistoryDay) {
                  setOpenDayNoticeKey((current) => current === dayDateKey ? null : dayDateKey)
                  return
                }
                if (active || dayDateKey === todayDateKey) {
                  onOpenActiveDay()
                  return
                }
                if (
                  dayDateKey < todayDateKey
                  && dayProgress
                  && [dayProgress.morningDone, dayProgress.tasksDone, dayProgress.eveningDone].filter(Boolean).length < 3
                ) {
                  onOpenFirstIncompleteRecoveryStep(dayDateKey, dayProgress)
                  return
                }
                onOpenReportDay(dayDateKey)
              }}
            >
              {hasBellNotice ? (
                <span className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-end px-2">
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label="Незавершений день"
                    title="Незавершений день"
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenDayNoticeKey((current) => current === dayDateKey ? null : dayDateKey)
                    }}
                    className={[
                      'pointer-events-auto relative inline-flex h-5 w-5 items-center justify-center rounded-full border transition-all',
                      isBellOpen
                        ? 'border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.14)] text-[rgb(var(--accent-soft-rgb))]'
                        : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                    ].join(' ')}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[10px]">🔔</span>
                    <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-[14px] min-w-[14px] items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold leading-none text-slate-950">
                      {incompleteMicroTaskCount > 0 ? incompleteMicroTaskCount : unfinishedStepCount}
                    </span>
                  </span>
                </span>
              ) : null}
              {isBellOpen ? (
                isLockedHistoryDay ? (
                  <div className="absolute right-0 top-[calc(100%+0.45rem)] z-50 w-56 rounded-xl border border-[rgba(239,68,68,0.34)] bg-[rgba(32,10,14,0.98)] px-3 py-2 text-left text-[11px] leading-4 text-[#FFD3D3] shadow-[0_18px_36px_rgba(0,0,0,0.28)]">
                    Цей день уже недоступний. Додаповнити можна тільки день за вчора.
                  </div>
                ) : (
                  <div className="absolute right-0 top-[calc(100%+0.45rem)] z-50 w-56 rounded-xl border border-[rgba(var(--accent-rgb),0.2)] bg-[rgba(10,14,24,0.98)] px-3 py-2 text-left text-[11px] leading-4 text-[var(--text-primary)] shadow-[0_18px_36px_rgba(0,0,0,0.28)]">
                    Залишилось {unfinishedStepCount} незавершені кроки{incompleteMicroTaskCount > 0 ? ` і ${incompleteMicroTaskCount} мікрозавдання` : ''}. Повернись сюди, щоб дозавершити вчорашній день.
                  </div>
                )
              ) : null}
              <div className="flex h-full min-h-0 flex-1 flex-col justify-between">
                <div className="flex min-h-[56px] flex-col items-center justify-start">
                  <div className={['inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold leading-none', getTimelineDigitClass(dayTone)].join(' ')}>
                    {day}
                  </div>
                  <div className="mt-1.5 flex h-[22px] items-start justify-center overflow-hidden">
                    <div className={['max-w-full text-[9px] font-semibold uppercase tracking-[0.12em] leading-[1.15]', getTimelineLabelClass(dayTone)].join(' ')}>
                      {dayLabel}
                    </div>
                  </div>
                </div>

                <div className="flex min-h-[18px] items-center justify-center">
                  <div className="flex h-[14px] items-center justify-center gap-1.5">
                    {Array.from({ length: doneCount }).map((_, markerIndex) => (
                      <span
                        key={`${dayDateKey}-done-${markerIndex}`}
                        className="text-[11px] font-bold leading-none text-emerald-300"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex min-h-[38px] flex-col justify-end">
                  <div className="group relative flex min-h-[18px] items-center justify-center gap-2">
                    {dayDots.map((dot, dotIndex) => (
                      <span key={`${dayDateKey}-dot-${dotIndex}`} className="group/dot relative inline-flex">
                        <span className={['inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full transition-transform duration-200 group-hover:scale-125', dot.toneClass].join(' ')} aria-label={`${dot.label}: ${dot.tooltip}`}>
                          {dot.content}
                        </span>
                        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-36 -translate-x-1/2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(11,16,30,0.96)] px-2 py-1.5 text-[10px] text-[var(--text-secondary)] shadow-[0_12px_24px_rgba(0,0,0,0.22)] group-hover/dot:block">
                          <strong className="block text-[var(--text-primary)]">{dot.label}</strong>
                          {dot.tooltip}
                        </span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 h-[14px] text-center text-[10px] font-medium leading-none text-[var(--text-secondary)]">
                    {formatCompactDateKey(dayDateKey)}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
