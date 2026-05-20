import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useGetMyWeeklyReportsQuery, type WeeklyReportItem } from '@/features/ai-mentor/services/mentor.api'
import { useGetDailyHistoryQuery } from '@/features/daily-cycle/services/daily.api'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import type { MicroTask } from '@/features/microTask/types/types'
import { GlassCard } from '@/ui'
import { WheelChart } from '@/features/wheel/components/WheelChart'
import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'
import { useGetLatestWheelAssessmentQuery, useGetWheelHistoryQuery } from '@/features/wheel/services/wheel.api'
import { WHEEL_CATEGORIES, isWheelSphereId, type WheelAssessment } from '@/features/wheel/types/wheel.types'
import type { DailyCycleEntry } from '@/features/daily-cycle/types/daily.types'
import { useMemo } from 'react'

type MonthlyWheelCard = {
  id: string
  slotKey: string
  slotDate: Date
  sourceMonthStart: Date
  sourceMonthEnd: Date
  wheel: WheelAssessment
  report: WeeklyReportItem | null
  morningCount: number
  eveningCount: number
  completedTasks: number
  totalTasks: number
  progressPercent: number
  analysisText: string
}

const WHEEL_LABEL_MAP = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.nameUk]))

function getMonthStart(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getNextMonthStart(value: string | Date) {
  const date = getMonthStart(value)
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function isWithinMonth(value: string | undefined | null, start: Date, end: Date) {
  if (!value) return false
  const date = new Date(value)
  return date >= start && date < end
}

function getEntryContent(entry: DailyCycleEntry) {
  return entry.content && typeof entry.content === 'object' && !Array.isArray(entry.content)
    ? entry.content
    : null
}

function hasSession(entry: DailyCycleEntry, session: 'morning' | 'evening') {
  const content = getEntryContent(entry)
  const raw = content?.[session]
  return Boolean(raw && typeof raw === 'object' && !Array.isArray(raw))
}

function getWheelAnalysisText(wheel: WheelAssessment) {
  if (wheel.notes?.trim()) return wheel.notes.trim()
  const weakestId = wheel.gaps?.[0]
  const strongestId = wheel.strengths?.[0]
  const weakestLabel = weakestId && isWheelSphereId(weakestId) ? (WHEEL_LABEL_MAP.get(weakestId) ?? weakestId) : weakestId ?? '—'
  const strongestLabel = strongestId && isWheelSphereId(strongestId) ? (WHEEL_LABEL_MAP.get(strongestId) ?? strongestId) : strongestId ?? '—'
  return `Найбільше просідає сфера "${weakestLabel}". Найсильніша опора зараз — "${strongestLabel}".`
}

function buildMonthlyCards(
  wheels: WheelAssessment[],
  entries: DailyCycleEntry[],
  tasks: MicroTask[],
  reports: WeeklyReportItem[],
): MonthlyWheelCard[] {
  const sortedWheels = [...wheels].sort(
    (left, right) =>
      new Date(right.completedAt ?? right.createdAt).getTime() - new Date(left.completedAt ?? left.createdAt).getTime(),
  )
  const grouped = new Map<string, MonthlyWheelCard>()

  for (const wheel of sortedWheels) {
    const sourceDate = new Date(wheel.completedAt ?? wheel.createdAt)
    const slotDate = getMonthStart(sourceDate)

    const slotKey = `${wheel.userId}:${getMonthKey(slotDate)}`
    if (grouped.has(slotKey)) continue

    const sourceMonthStart = slotDate
    const sourceMonthEnd = getNextMonthStart(slotDate)
    const monthEntries = entries.filter(entry => isWithinMonth(entry.date, sourceMonthStart, sourceMonthEnd))
    const monthTasks = tasks.filter(task => isWithinMonth(task.createdAt ?? null, sourceMonthStart, sourceMonthEnd))
    const report = [...reports]
      .filter(item => isWithinMonth(item.weekEnd ?? item.weekStart, sourceMonthStart, sourceMonthEnd))
      .sort((left, right) => new Date(right.weekEnd).getTime() - new Date(left.weekEnd).getTime())[0] ?? null

    const completedTasks = monthTasks.filter(task => (task.status ?? 'PENDING') === 'COMPLETED').length
    const totalTasks = monthTasks.length
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    grouped.set(slotKey, {
      id: wheel.id,
      slotKey,
      slotDate,
      sourceMonthStart,
      sourceMonthEnd,
      wheel,
      report,
      morningCount: monthEntries.filter(entry => hasSession(entry, 'morning')).length,
      eveningCount: monthEntries.filter(entry => hasSession(entry, 'evening')).length,
      completedTasks,
      totalTasks,
      progressPercent,
      analysisText: getWheelAnalysisText(wheel),
    })
  }

  return [...grouped.values()].sort((left, right) => left.slotDate.getTime() - right.slotDate.getTime())
}

export function WheelMonthlyBoard({ onOpenInline, onOpenReports }: { onOpenInline: () => void; onOpenReports: () => void }) {
  const { user } = useAuth()
  const { appState: sessionStatus } = useSessionOrchestrator()
  const shouldSkipProtectedQueries = sessionStatus !== 'authenticated'
  const userId = user?.id ?? null

  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId ?? '', {
    skip: shouldSkipProtectedQueries || !userId,
  })
  const { data: wheelHistory = [], isFetching: isHistoryFetching } = useGetWheelHistoryQuery(
    { userId: userId ?? '', limit: 24 },
    { skip: shouldSkipProtectedQueries || !userId },
  )
  const { data: dailyHistory = [] } = useGetDailyHistoryQuery(undefined, {
    skip: shouldSkipProtectedQueries || !userId,
  })
  const { data: weeklyReports = [] } = useGetMyWeeklyReportsQuery(undefined, {
    skip: shouldSkipProtectedQueries || !userId,
  })
  const { tasks: microTasks } = useMicroTasks({ skip: shouldSkipProtectedQueries || !userId })

  const monthlyCards = useMemo(() => {
    const combined = [latestWheel, ...wheelHistory].filter((item): item is WheelAssessment => Boolean(item))
    const deduped = combined.filter((item, index, array) => array.findIndex(current => current.id === item.id) === index)
    return buildMonthlyCards(deduped, dailyHistory, microTasks, weeklyReports)
  }, [dailyHistory, latestWheel, microTasks, weeklyReports, wheelHistory])

  if (!userId) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">
            Колесо по місяцях
          </p>
          <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
            Один місяць — один зріз колеса, один аналіз, один продуктовий контекст.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-liquid-dashboard btn-liquid-dashboard--primary"
            onClick={onOpenInline}
          >
            Відкрити колесо
          </button>
          <button
            type="button"
            className="btn-liquid-dashboard btn-liquid-dashboard--ice"
            onClick={onOpenReports}
          >
            Перейти до звітів
          </button>
        </div>
      </div>

      {isHistoryFetching ? (
        <GlassCard className="p-5 text-sm text-[var(--text-secondary)]">
          Оновлюємо місячну історію колеса…
        </GlassCard>
      ) : null}

      {!isHistoryFetching && monthlyCards.length === 0 ? (
        <GlassCard className="p-5">
          <p className="text-base font-semibold text-[var(--text-primary)]">Ще немає збереженого колеса</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Заповни колесо зараз, і воно зʼявиться тут як єдиний запис свого місяця з аналізом, звітом і прогресом.
          </p>
        </GlassCard>
      ) : null}

      {monthlyCards.map(card => (
        <GlassCard key={card.slotKey} className="p-5">
          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
                {card.slotDate.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">Колесо місяця</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Проходження за {card.sourceMonthStart.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })}.
              </p>
              <div className="mt-4 flex justify-center">
                <WheelChart scores={card.wheel.scores} size={220} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">{WHEEL_TEXTS.monthlyBoard.analysis}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-primary)]">{card.analysisText}</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">Звіт</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                    {card.report?.nextWeekFocus ?? WHEEL_TEXTS.monthlyBoard.noWeeklyReport}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                    {card.report
                      ? `${card.report.weekStart.slice(0, 10)} — ${card.report.weekEnd.slice(0, 10)} · ${WHEEL_TEXTS.monthlyBoard.completionRate(card.report.completionRate ?? 0)}`
                      : WHEEL_TEXTS.monthlyBoard.waitingReport}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">Прогрес місяця</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-2xl font-semibold text-[var(--text-primary)]">{card.progressPercent}%</p>
                      <p className="text-xs text-[var(--text-muted)]">виконання</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-[var(--text-primary)]">{card.completedTasks}/{card.totalTasks}</p>
                      <p className="text-xs text-[var(--text-muted)]">мікрозавдань</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{card.morningCount}</p>
                      <p className="text-xs text-[var(--text-muted)]">ранків</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{card.eveningCount}</p>
                      <p className="text-xs text-[var(--text-muted)]">вечорів</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}

export default WheelMonthlyBoard
