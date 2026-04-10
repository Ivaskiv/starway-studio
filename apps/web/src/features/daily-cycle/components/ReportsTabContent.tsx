import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileDown,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Sparkles,
  Target,
} from 'lucide-react'

import {
  useGetMonthlyConversationSummaryQuery,
  useGetMyWeeklyReportsQuery,
  useLazyGetWeeklyReportByIdQuery,
  useGetWeeklyReportByIdQuery,
  type WeeklyReportFull,
} from '@/features/ai-mentor/services/mentor.api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGetDailyHistoryQuery } from '@/features/daily-cycle/services/daily.api'
import type { DailyCycleEntry } from '@/features/daily-cycle/types/daily.types'
import { downloadBlobAsFile } from '@/features/daily-cycle/questions/utils/pdf.utils'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { generateMonthlySummaryPdf } from '@/features/reportsPdf/services/monthlyReportPdf'
import { generateWeeklyReportPdf } from '@/features/reportsPdf/services/weeklyReportPdf'
import { useGetWheelHistoryQuery } from '@/features/wheel/services/wheel.api'
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types'
import { GlassCard, InfoHint, withMinimumDelay } from '@/ui'

const SECTION_EYEBROW_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]'
const WHEEL_LABEL_MAP = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.nameUk]))
const SURFACE_CARD_CLASS = 'rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]'
const SURFACE_BLOCK_CLASS = 'rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)]'
const REPORT_ACTION_CLASS = 'inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.12)] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[rgba(var(--accent-rgb),0.34)] hover:bg-[rgba(var(--accent-rgb),0.18)] disabled:cursor-not-allowed disabled:opacity-60'
const REPORT_ACTION_SECONDARY_CLASS = 'inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.035)] disabled:cursor-not-allowed disabled:opacity-60'

const STATE_SCORE_MAP: Record<string, number> = {
  INNER_SUPPORT: 4,
  STABILITY: 3,
  FEAR: 2,
  TENSION: 1,
  'внутрішня опора': 4,
  'стабільність': 3,
  'страх': 2,
  'напруга': 1,
}

function formatRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return `${startDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} — ${endDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateKey(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10)
}

function getReportChecklistState(options: {
  latestDayEntry: DailyCycleEntry | null
  latestDayDateKey: string | null
  morningCount: number
  eveningCount: number
  completedTasks: number
  missedTasks: number
}) {
  const { latestDayEntry, latestDayDateKey, morningCount, eveningCount, completedTasks, missedTasks } = options
  const isLateCompletion = Boolean(
    latestDayEntry?.updatedAt
    && latestDayDateKey
    && toDateKey(latestDayEntry.updatedAt) !== latestDayDateKey,
  )

  const morningDone = Boolean(latestDayEntry && isSessionCaptured(latestDayEntry, 'morning'))
  const microTasksDone = completedTasks > 0 && missedTasks === 0
  const microTasksPartial = completedTasks > 0 || missedTasks > 0
  const eveningDone = Boolean(latestDayEntry && isSessionCaptured(latestDayEntry, 'evening'))
  const analysisDone = Boolean(latestDayEntry?.updatedAt)

  const items: Array<{
    label: string
    done: boolean
    partial?: boolean
    helper: string
  }> = [
    {
      label: 'Ранок',
      done: morningDone,
      helper: morningDone ? 'Сесію збережено.' : morningCount > 0 ? 'Є часткові ранкові дані.' : 'Ще не заповнено.',
    },
    {
      label: 'Мікрозавдання',
      done: microTasksDone,
      partial: !microTasksDone && microTasksPartial,
      helper: microTasksDone
        ? 'Усі задачі тижня виконано.'
        : microTasksPartial
          ? 'Частина задач ще лишається.'
          : 'Ще без завдань або без прогресу.',
    },
    {
      label: 'Вечір',
      done: eveningDone,
      helper: eveningDone ? 'Вечірній підсумок збережено.' : eveningCount > 0 ? 'Є вечірні нотатки, але день не закрито.' : 'Ще не закрито.',
    },
    {
      label: 'Аналіз дня',
      done: analysisDone,
      helper: analysisDone
        ? isLateCompletion
          ? 'Завершено із запізненням.'
          : 'Завершено вчасно.'
        : 'Очікує фінального підсумку.',
    },
  ]

  return {
    isLateCompletion,
    items,
  }
}

function ReportChecklistCard({
  latestDayEntry,
  latestDayDateKey,
  morningCount,
  eveningCount,
  completedTasks,
  missedTasks,
}: {
  latestDayEntry: DailyCycleEntry | null
  latestDayDateKey: string | null
  morningCount: number
  eveningCount: number
  completedTasks: number
  missedTasks: number
}) {
  const checklist = getReportChecklistState({
    latestDayEntry,
    latestDayDateKey,
    morningCount,
    eveningCount,
    completedTasks,
    missedTasks,
  })

  return (
    <GlassCard className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-white p-5 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={SECTION_EYEBROW_CLASS}>Аналіз дня</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Короткий чекплан: що вже закрито, а що ще тягне ритм вниз.</p>
        </div>
        {checklist.isLateCompletion ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
            <Clock3 className="h-3.5 w-3.5" />
            із запізненням
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {checklist.items.map(item => (
          <div key={item.label} className={`${SURFACE_BLOCK_CLASS} rounded-[18px] p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{item.helper}</p>
              </div>
              <span
                className={[
                  'inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border',
                  item.done
                    ? 'border-emerald-400/25 bg-emerald-500/12 text-emerald-300'
                    : item.partial
                      ? 'border-amber-300/25 bg-amber-400/10 text-amber-200'
                      : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : '•'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {checklist.isLateCompletion ? (
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
          День закрито пізніше. Для статистики це враховується як нижчий ритм, але прогрес не губиться.
        </p>
      ) : null}
    </GlassCard>
  )
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000, timeoutMessage = 'Запит триває занадто довго') {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      const timer = window.setTimeout(() => {
        window.clearTimeout(timer)
        reject(new Error(timeoutMessage))
      }, timeoutMs)
    }),
  ])
}

function startOfWindow(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days + 1)
  return date
}

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => String(item ?? '').trim()).filter(Boolean)
    : []
}

function getMicroTaskProgressStats(tasks: ReturnType<typeof useMicroTasks>['tasks']) {
  const progressValues = tasks
    .map(task => task.progressPercent)
    .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))

  const partialTaskCount = progressValues.filter(value => value > 0 && value < 100).length
  const slowProgressTaskCount = progressValues.filter(value => value > 0 && value < 80).length
  const averageTaskProgress = progressValues.length
    ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
    : null

  return { partialTaskCount, slowProgressTaskCount, averageTaskProgress }
}

function isSessionCaptured(entry: DailyCycleEntry, key: 'morning' | 'evening') {
  const content = entry.content
  return Boolean(content && typeof content === 'object' && !Array.isArray(content) && key in content)
}

function groupEntriesByWeek(entries: DailyCycleEntry[]) {
  const sorted = entries
    .slice()
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())

  const buckets: Array<{ weekStart: string; weekEnd: string; entries: DailyCycleEntry[] }> = []
  for (let index = 0; index < sorted.length; index += 7) {
    const slice = sorted.slice(index, index + 7)
    if (!slice.length) continue
    buckets.push({
      weekStart: slice[0].date,
      weekEnd: slice[slice.length - 1].date,
      entries: slice,
    })
  }

  return buckets.reverse()
}

function buildFallbackWeeklyReport(
  bucket: { weekStart: string; weekEnd: string; entries: DailyCycleEntry[] },
  microTasks: ReturnType<typeof useMicroTasks>['tasks'],
): WeeklyReportFull {
  const start = new Date(bucket.weekStart)
  const end = new Date(bucket.weekEnd)
  const bucketTasks = microTasks.filter((task) => {
    if (!task.createdAt) return false
    const createdAt = new Date(task.createdAt)
    return createdAt >= start && createdAt <= end
  })

  const completedTasks = bucketTasks.filter(task => (task.status ?? 'PENDING') === 'COMPLETED').length
  const progressStats = getMicroTaskProgressStats(bucketTasks)
  const completionRate = bucketTasks.length ? Math.round((completedTasks / bucketTasks.length) * 100) : 0
  const stateValues = bucket.entries
    .map(entry => STATE_SCORE_MAP[String(entry.state)] ?? 0)
    .filter(value => value > 0)
  const overallScore = stateValues.length
    ? Number((stateValues.reduce((sum, value) => sum + value, 0) / stateValues.length).toFixed(1))
    : null
  const morningCount = bucket.entries.filter(entry => isSessionCaptured(entry, 'morning')).length
  const eveningCount = bucket.entries.filter(entry => isSessionCaptured(entry, 'evening')).length

  return {
    id: `fallback-${bucket.weekStart}`,
    weekStart: bucket.weekStart,
    weekEnd: bucket.weekEnd,
    overallScore,
    completionRate,
    streakDays: bucket.entries.length,
    nextWeekFocus: 'Завершити цикл без пауз і зберегти ритм',
    pdfUrl: null,
    topInsights: [
      `Ранковий цикл був збережений ${morningCount} разів.`,
      `Вечірній цикл був збережений ${eveningCount} разів.`,
      progressStats.partialTaskCount > 0
        ? `Є ${progressStats.partialTaskCount} мікрозавдань у процесі${progressStats.slowProgressTaskCount > 0 ? `, ${progressStats.slowProgressTaskCount} нижче 80%` : ''}.`
        : `Виконано ${completedTasks} мікрозавдань із ${bucketTasks.length}.`,
    ],
    growthAreas: morningCount >= eveningCount
      ? ['Краще тримається старт дня']
      : ['Краще тримається завершення дня'],
    struggleAreas: completionRate < 50
      ? ['Ритм мікрозавдань просідає']
      : ['Ритм ще формується, але вже є опора'],
    wheelDelta: [],
    summaryText: [
      `СТАН: за цей 7-денний відрізок збережено ${bucket.entries.length} днів історії.`,
      `ЦІЛЬ: ранкових сесій — ${morningCount}, вечірніх — ${eveningCount}.`,
      progressStats.partialTaskCount > 0
        ? `ВИБІР: ${progressStats.partialTaskCount} мікрозавдань ще в процесі, середній прогрес — ${progressStats.averageTaskProgress ?? 0}%. Результат приходить повільніше, поки їх не доведено до завершення.`
        : `ВИБІР: виконання мікрозавдань — ${completionRate}%.`,
      progressStats.slowProgressTaskCount > 0
        ? 'ДІЯ: спочатку доведи до 80–100% незавершені задачі, а вже потім бери нові.'
        : 'ДІЯ: наступного тижня тримай один пріоритет на день і починай з нього.',
    ].join('\n'),
    motivationText: 'Твій пробний період уже завершився, але історія нікуди не зникла. Подивись звіт, щоб побачити сильні місця й зрозуміти, який формат продовження зараз дасть найбільший ефект.',
    nextWeekTasks: [
      progressStats.slowProgressTaskCount > 0
        ? 'Довести мікрозавдання нижче 80% до завершення'
        : 'Переглянути 7-денний звіт і зафіксувати головний висновок',
      'Обрати підписку, щоб продовжити роботу без втрати ритму',
      'Повернутись у цикл із чітким наступним кроком',
    ],
  }
}

function WeeklyDetailPanel({ report }: { report: WeeklyReportFull }) {
  const topInsights = normalizeStringList(report.topInsights)
  const nextWeekTasks = normalizeStringList(report.nextWeekTasks)

  return (
    <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-transparent p-4">
      {report.summaryText ? (
        <div className="rounded-[18px] border border-[var(--border)] bg-[rgba(var(--accent-rgb),0.07)] p-4">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{report.summaryText}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {topInsights.length > 0 ? (
          <div className={`${SURFACE_BLOCK_CLASS} p-4`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Інсайти</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
              {topInsights.map(item => <li key={item} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-400" /><span>{item}</span></li>)}
            </ul>
          </div>
        ) : null}

        {nextWeekTasks.length > 0 ? (
          <div className={`${SURFACE_BLOCK_CLASS} p-4`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Кроки на наступний тиждень</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
              {nextWeekTasks.map(item => <li key={item} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-400" /><span>{item}</span></li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function ReportsTabContent() {
  const { user } = useAuth()
  const { accessControl, subscription } = useSystemState()
  const userId = user?.id ?? ''
  const { data: trial } = useGetTrialStatusQuery()
  const { data: reports = [], isFetching: reportsFetching, refetch: refetchReports } = useGetMyWeeklyReportsQuery()
  const { data: summary, refetch: refetchSummary } = useGetSummaryQuery()
  const { data: dailyHistory = [], refetch: refetchDailyHistory } = useGetDailyHistoryQuery()
  const { tasks: microTasks, refresh: refetchTasks } = useMicroTasks()
  const { data: wheelHistory = [], refetch: refetchWheelHistory } = useGetWheelHistoryQuery({ userId, limit: 12 }, { skip: !userId })
  const { data: conversationSummary, refetch: refetchConversationSummary } = useGetMonthlyConversationSummaryQuery()

  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [exportingWeeklyId, setExportingWeeklyId] = useState<string | null>(null)
  const [isPreparingPreview, setIsPreparingPreview] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState<string>('PDF звіт')
  const [loadWeeklyReport] = useLazyGetWeeklyReportByIdQuery()
  const pdfUrlRef = useRef<string | null>(null)
  const [isRefreshingBundle, setIsRefreshingBundle] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [monthlyPdfError, setMonthlyPdfError] = useState<string | null>(null)
  const [weeklyPdfErrorId, setWeeklyPdfErrorId] = useState<string | null>(null)

  const { data: expandedReport, isFetching: expandedReportFetching } = useGetWeeklyReportByIdQuery(expandedReportId ?? '', {
    skip: !expandedReportId,
  })

  const monthlyWindowStart = useMemo(() => startOfWindow(30), [])
  const hasEverStarted = (trial?.currentDay ?? 0) > 0 || Boolean(trial?.startedAt)
  const hasPaidAccess = Boolean(trial?.isPaid || subscription?.isActive || accessControl?.hasSubscription)
  const isTrialExpired = !trial?.isActive && hasEverStarted && !hasPaidAccess

  const monthEntries = useMemo(
    () => dailyHistory.filter(entry => new Date(entry.date) >= monthlyWindowStart),
    [dailyHistory, monthlyWindowStart],
  )

  const monthTasks = useMemo(
    () => microTasks.filter(task => task.createdAt && new Date(task.createdAt) >= monthlyWindowStart),
    [microTasks, monthlyWindowStart],
  )

  const monthWheelHistory = useMemo(
    () => wheelHistory.filter(item => new Date(item.createdAt) >= monthlyWindowStart),
    [wheelHistory, monthlyWindowStart],
  )

  const monthSummary = useMemo(() => {
    const morningCount = monthEntries.filter(entry => isSessionCaptured(entry, 'morning')).length
    const eveningCount = monthEntries.filter(entry => isSessionCaptured(entry, 'evening')).length
    const completedTasks = monthTasks.filter(task => (task.status ?? 'PENDING') === 'COMPLETED').length
    const missedTasks = monthTasks.filter(task => ['skipped', 'expired'].includes(task.status ?? '')).length
    const latestWheel = monthWheelHistory[0] ?? null
    const previousWheel = monthWheelHistory[1] ?? null
    const wheelAverageDelta = latestWheel && previousWheel
      ? Number((latestWheel.averageScore - previousWheel.averageScore).toFixed(1))
      : null

    const trendPoints = monthEntries
      .slice()
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .map(entry => ({
        date: entry.date,
        value: STATE_SCORE_MAP[String(entry.state)] ?? 0,
      }))
      .filter(point => point.value > 0)

    return {
      morningCount,
      eveningCount,
      completedTasks,
      missedTasks,
      latestWheel,
      previousWheel,
      wheelAverageDelta,
      trendPoints,
    }
  }, [monthEntries, monthTasks, monthWheelHistory])

  const latestDayEntry = useMemo(
    () => [...monthEntries].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0] ?? null,
    [monthEntries],
  )
  const latestDayDateKey = latestDayEntry ? latestDayEntry.date.slice(0, 10) : null

  const weakestId = monthSummary.latestWheel?.gaps?.[0] ?? null
  const strongestId = monthSummary.latestWheel?.strengths?.[0] ?? null
  const weakestLabel = weakestId ? (WHEEL_LABEL_MAP.get(weakestId) ?? weakestId) : '—'
  const strongestLabel = strongestId ? (WHEEL_LABEL_MAP.get(strongestId) ?? strongestId) : '—'
  const trendFirstValue = monthSummary.trendPoints[0]?.value ?? 0
  const trendLastValue = monthSummary.trendPoints[monthSummary.trendPoints.length - 1]?.value ?? 0
  const latestWheelDate = monthSummary.latestWheel ? new Date(monthSummary.latestWheel.completedAt ?? monthSummary.latestWheel.createdAt) : null
  const nextWheelUpdateDate = latestWheelDate ? new Date(latestWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null
  const monthlyNarrative = useMemo(() => {
    const trendLabel = monthSummary.trendPoints.length < 2
      ? 'Даних ще замало, щоб оцінити траєкторію стану.'
      : trendLastValue >= trendFirstValue
        ? 'Стан рухався рівніше або зростаючо.'
        : 'Стан просідав, тож ритм варто спростити.'

    return [
      trendLabel,
      `Сильна сфера: ${strongestLabel}.`,
      `Сфера фокусу: ${weakestLabel}.`,
    ].join('\n')
  }, [monthSummary.trendPoints.length, trendFirstValue, trendLastValue, strongestLabel, weakestLabel])
  const monthlyStatusNote = useMemo(() => {
    if (monthSummary.trendPoints.length < 2) {
      return 'Даних ще замало, щоб чесно оцінити місячну траєкторію.'
    }

    return trendLastValue >= trendFirstValue
      ? 'Стан тримався рівніше або злегка виріс.'
      : 'Стан просідав, тож наступний місяць варто спростити.'
  }, [monthSummary.trendPoints.length, trendFirstValue, trendLastValue])

  const fallbackReports = useMemo(
    () => groupEntriesByWeek(dailyHistory).map(bucket => buildFallbackWeeklyReport(bucket, microTasks)),
    [dailyHistory, microTasks],
  )

  const displayReports = reports.length > 0 ? reports : fallbackReports

  const latestReportForPdf = useMemo<WeeklyReportFull | null>(() => {
    if (reports.length > 0 && expandedReport) {
      return expandedReport
    }
    return displayReports[0] ?? null
  }, [displayReports, expandedReport, reports.length])
  const isReportsBusy = reportsFetching || expandedReportFetching || isPreparingPreview || isExportingPdf || isRefreshingBundle

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current)
      }
    }
  }, [])

  const openPdfPreview = async (blob: Blob, title: string) => {
    const url = URL.createObjectURL(blob)
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current)
    }
    pdfUrlRef.current = url
    setPdfPreviewUrl(url)
    setPdfPreviewTitle(title)
  }

  return (
    <div className="space-y-5">
      <GlassCard className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-white p-5 shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className={SECTION_EYEBROW_CLASS}>Звіти</p>
            <div className="flex items-center gap-2">
              <p className="text-[1.15rem] font-semibold leading-tight text-[var(--text-primary)]">Тижні, місяць і загальна картина руху</p>
              <InfoHint
                label="Звіти"
                description="Тут зібрані щотижневі підсумки по 7 днях і місячний зріз руху: ранок, вечір, колесо, мікрозавдання та загальна динаміка."
                instruction="Відкривай останній тиждень для фокусу на найближчих кроках, а місячний підсумок використовуй для великої корекції курсу."
              />
            </div>
            <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
              Щотижневі звіти збирають головні сигнали кожних 7 днів. Місячний підсумок показує прогрес, регрес і сфери, які реально зрушилися.
            </p>
            {isTrialExpired ? (
              <div className="rounded-[18px] border border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                Тріал завершився, але вся історія за 7 днів збережена. Тут можна переглянути підсумок, відкрити PDF у вікні та завантажити звіт на A4.
              </div>
            ) : null}
            {isReportsBusy ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.08)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[rgb(var(--accent-soft-rgb))]" />
                Оновлюємо звіти й підсумки
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    setIsRefreshingBundle(true)
                    setRefreshError(null)
                    await withTimeout(withMinimumDelay(Promise.all([
                      refetchReports(),
                      refetchSummary(),
                      refetchDailyHistory(),
                      refetchWheelHistory(),
                      refetchTasks(),
                      refetchConversationSummary(),
                    ]), 950), 8000, 'Оновлення звітів зависло')
                    toast.success('Звіти оновлено')
                  } catch (error) {
                    console.error('[Reports] refresh failed:', error)
                    setRefreshError('Не вдалося оновити звіти. Спробуй ще раз.')
                  } finally {
                    setIsRefreshingBundle(false)
                  }
                })()
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
            >
              {isRefreshingBundle ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {isRefreshingBundle ? 'Оновлюємо…' : refreshError ? 'Спробувати знову' : 'Оновити'}
            </button>

            <button
              type="button"
              onClick={async () => {
                if (!latestReportForPdf) return
                try {
                  setIsPreparingPreview(true)
                  setMonthlyPdfError(null)
                  const blob = await withTimeout(withMinimumDelay(generateWeeklyReportPdf(latestReportForPdf), 900), 8000, 'Генерація PDF зависла')
                  await openPdfPreview(blob, `7-денний звіт · ${formatRange(latestReportForPdf.weekStart, latestReportForPdf.weekEnd)}`)
                  toast.success('PDF звіту підготовлено')
                } catch (error) {
                  console.error('[Reports] weekly pdf preview failed:', error)
                  setMonthlyPdfError('Не вдалося сформувати PDF звіту. Спробуй ще раз.')
                } finally {
                  setIsPreparingPreview(false)
                }
              }}
              disabled={!latestReportForPdf || isPreparingPreview}
              className={REPORT_ACTION_SECONDARY_CLASS}
            >
              {isPreparingPreview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Формуємо…
                </>
              ) : monthlyPdfError ? (
                <>
                  <FileDown className="h-4 w-4" />
                  Спробувати знову
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  PDF звіт
                </>
              )}
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  setIsExportingPdf(true)
                  setMonthlyPdfError(null)
                  const blob = await withTimeout(withMinimumDelay(generateMonthlySummaryPdf({
                    periodLabel: `${new Date(monthlyWindowStart).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })} — ${new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                    morningCount: monthSummary.morningCount,
                    eveningCount: monthSummary.eveningCount,
                    completedTasks: monthSummary.completedTasks,
                    missedTasks: monthSummary.missedTasks,
                    trendPoints: monthSummary.trendPoints,
                    latestWheel: monthSummary.latestWheel,
                    strongestLabel,
                    weakestLabel,
                    wheelNarrative: monthlyNarrative,
                    conversationSummary: conversationSummary ?? null,
                    recentReports: reports.slice(0, 4).map(report => ({
                      period: formatRange(report.weekStart, report.weekEnd),
                      focus: report.nextWeekFocus || 'Тижневий підсумок',
                      overallScore: report.overallScore,
                    })),
                    entries: monthEntries,
                    goals: conversationSummary?.goals ?? [],
                    subscription: conversationSummary?.subscription ?? null,
                    zoomSummary: conversationSummary?.zoomSummary ?? [],
                  }), 950), 8000, 'Генерація місячного PDF зависла')
                  downloadBlobAsFile(blob, `starway-monthly-report-${new Date().toISOString().slice(0, 10)}.pdf`)
                  toast.success('Місячний PDF збережено')
                } catch (error) {
                  console.error('[Reports] monthly pdf failed:', error)
                  setMonthlyPdfError('Не вдалося сформувати місячний PDF. Спробуй ще раз.')
                } finally {
                  setIsExportingPdf(false)
                }
              }}
              className={REPORT_ACTION_CLASS}
            >
              <FileDown className="h-4 w-4" />
              {isExportingPdf ? 'Формуємо…' : monthlyPdfError ? 'Спробувати знову' : 'PDF місяця'}
            </button>
          </div>
          {refreshError ? <p className="mt-3 text-sm text-[rgb(248,113,113)]">{refreshError}</p> : null}
          {monthlyPdfError ? <p className="mt-2 text-sm text-[rgb(248,113,113)]">{monthlyPdfError}</p> : null}
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-4">
          {[
            { label: 'Щотижневих звітів', value: reports.length, icon: CalendarDays },
            { label: 'Поточний streak', value: summary?.streak.current ?? 0, icon: Sparkles },
            { label: 'Рівень', value: summary?.xp.level ?? 1, icon: Target },
            { label: 'XP усього', value: summary?.xp.total ?? 0, icon: BarChart3 },
          ].map(card => (
            <div key={card.label} className={`${SURFACE_CARD_CLASS} p-4`}>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <card.icon className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{card.label}</span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{card.value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {pdfPreviewUrl ? (
        <div className="dashboard-liquid-card--soft overflow-hidden">
          <div className="dashboard-liquid-edge--top flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className={SECTION_EYEBROW_CLASS}>PDF звіт</p>
              <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{pdfPreviewTitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={REPORT_ACTION_CLASS}
                onClick={() => {
                  if (!pdfPreviewUrl) return
                  const anchor = document.createElement('a')
                  anchor.href = pdfPreviewUrl
                  anchor.download = `starway-report-${new Date().toISOString().slice(0, 10)}.pdf`
                  anchor.click()
                }}
              >
                Завантажити PDF
              </button>
              <button
                type="button"
                className={REPORT_ACTION_SECONDARY_CLASS}
                onClick={() => setPdfPreviewUrl(null)}
              >
                Закрити перегляд
              </button>
            </div>
          </div>
          <div className="bg-white p-3">
            <iframe
              src={pdfPreviewUrl}
              title={pdfPreviewTitle}
              className="min-h-[900px] w-full rounded-[18px] border-0 bg-white"
            />
          </div>
        </div>
      ) : null}

      <GlassCard className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-white p-5 shadow-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={SECTION_EYEBROW_CLASS}>Щотижневі звіти</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Один тиждень = одна картка. Відкривай лише той, що потрібен.</p>
          </div>
          {reportsFetching ? <span className="text-sm text-[var(--text-muted)]">Оновлюємо…</span> : null}
        </div>

        <div className="mt-4 space-y-4">
          {displayReports.length > 0 ? displayReports.map(report => {
            const weeklyReport = report as WeeklyReportFull
            const isExpanded = expandedReportId === report.id
            const isWeeklyPdfBusy = exportingWeeklyId === report.id
            const isWeeklyPdfError = weeklyPdfErrorId === report.id
            return (
              <div key={report.id} className="rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-white p-4 shadow-none">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
                      {formatRange(report.weekStart, report.weekEnd)}
                    </p>
                    <p className="mt-2 text-[13px] font-medium text-[var(--text-primary)]">
                      {report.nextWeekFocus ? report.nextWeekFocus : 'Тижневий підсумок'}
                    </p>
                  </div>
                  <span className="rounded-full bg-[rgba(var(--accent-rgb),0.10)] px-3 py-1 text-xs font-semibold text-[rgb(var(--accent-soft-rgb))]">
                    {report.completionRate != null ? `${report.completionRate}% completion` : '—'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { label: 'виконано', value: weeklyReport.metrics?.tasksDone ?? 0 },
                    {
                      label: 'не завершено',
                      value: Math.max((weeklyReport.metrics?.tasksTotal ?? 0) - (weeklyReport.metrics?.tasksDone ?? 0), 0),
                    },
                    { label: 'стрік', value: report.streakDays ?? 0 },
                    { label: 'бал', value: report.overallScore ?? '—' },
                  ].map(item => (
                    <span
                      key={item.label}
                      className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
                    >
                      {item.label} {item.value}
                    </span>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  {normalizeStringList(weeklyReport.topInsights).length > 0 ? (
                    <div className="space-y-2">
                      {normalizeStringList(weeklyReport.topInsights).map(item => (
                        <div key={item} className="flex items-start gap-2 text-[12.5px] leading-6 text-[var(--text-secondary)]">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {normalizeStringList(weeklyReport.nextWeekTasks).length > 0 ? (
                    <div className="space-y-2 border-t border-[rgba(255,255,255,0.06)] pt-3">
                      {normalizeStringList(weeklyReport.nextWeekTasks).map(item => (
                        <div key={item} className="flex items-start gap-2 text-[12.5px] leading-6 text-[var(--text-secondary)]">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.06)] pt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedReportId(current => current === report.id ? null : report.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.035)]"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {isExpanded ? 'Згорнути' : 'Відкрити'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setExportingWeeklyId(report.id)
                        setWeeklyPdfErrorId(null)
                        const detailed = report.id.startsWith('fallback-')
                          ? report
                          : await withTimeout(withMinimumDelay(loadWeeklyReport(report.id, true).unwrap(), 850), 8000, 'Завантаження тижня зависло')
                        if (!detailed) return
                        const blob = await withTimeout(withMinimumDelay(generateWeeklyReportPdf(detailed), 900), 8000, 'Генерація PDF зависла')
                        downloadBlobAsFile(blob, `starway-weekly-report-${report.weekStart.slice(0, 10)}.pdf`)
                        toast.success('PDF тижня збережено')
                      } catch (error) {
                        console.error('[Reports] weekly pdf failed:', error)
                        setWeeklyPdfErrorId(report.id)
                      } finally {
                        setExportingWeeklyId(current => (current === report.id ? null : current))
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.035)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {isWeeklyPdfBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Формуємо…
                      </>
                    ) : isWeeklyPdfError ? (
                      'Спробувати знову'
                    ) : (
                      'Завантажити PDF'
                    )}
                  </button>
                </div>

                {isWeeklyPdfError ? (
                  <p className="mt-2 text-sm text-[rgb(248,113,113)]">
                    Не вдалося сформувати PDF тижня. Спробуй ще раз.
                  </p>
                ) : null}

                {isExpanded ? (
                  expandedReportFetching ? (
                    <div className="mt-4 rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                      Завантажуємо деталі тижня…
                    </div>
                  ) : report.id.startsWith('fallback-') ? (
                    <WeeklyDetailPanel report={weeklyReport} />
                  ) : expandedReport ? (
                    <WeeklyDetailPanel report={expandedReport} />
                  ) : (
                    <div className="mt-4 rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                      Деталі цього тижня поки недоступні.
                    </div>
                  )
                ) : null}
              </div>
            )
          }) : (
            <div className="rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-10 text-center text-sm text-[var(--text-muted)]">
              Ще немає готових тижневих звітів. Після першого повного 7-денного циклу вони з’являться тут автоматично.
            </div>
          )}
        </div>
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-white p-5 shadow-none">
          <div className="flex items-center gap-2">
            <p className={SECTION_EYEBROW_CLASS}>Місячний підсумок</p>
            <InfoHint
              label="Місячний підсумок"
              description="Цей зріз збирається з реальних даних за останні 30 днів: ранок, вечір, мікрозавдання, колесо й динаміка стану."
              instruction="Дивись не лише на кількість дій, а й на траєкторію стану: де є прогрес, а де ритм просідає."
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Ранкових сесій', value: monthSummary.morningCount },
              { label: 'Вечірніх сесій', value: monthSummary.eveningCount },
              { label: 'Виконано задач', value: monthSummary.completedTasks },
              { label: 'Не завершено', value: monthSummary.missedTasks },
            ].map(item => (
              <div key={item.label} className={`${SURFACE_BLOCK_CLASS} rounded-[16px] px-3 py-3`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
            <span className={`mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${monthSummary.trendPoints.length >= 2 && trendLastValue >= trendFirstValue ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">
                {monthSummary.trendPoints.length >= 2 && trendLastValue >= trendFirstValue ? 'В нормі' : 'Потрібна увага'}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                {monthlyStatusNote}
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-white p-5 shadow-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={SECTION_EYEBROW_CLASS}>Колесо балансу</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Останній доступний зріз і короткий аналіз без візуалізації колеса.</p>
            </div>
            {monthSummary.wheelAverageDelta != null ? (
              <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                Δ {monthSummary.wheelAverageDelta > 0 ? '+' : ''}{monthSummary.wheelAverageDelta}
              </span>
            ) : null}
          </div>

          {monthSummary.latestWheel ? (
            <div className="mt-4 space-y-3">
              <div className={`${SURFACE_BLOCK_CLASS} rounded-[18px] p-4`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Сильна сфера</p>
                <p className="mt-2 flex items-start gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  <span>{strongestLabel}</span>
                </p>
              </div>
              <div className={`${SURFACE_BLOCK_CLASS} rounded-[18px] p-4`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Сфера фокусу</p>
                <p className="mt-2 flex items-start gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                  <span>{weakestLabel}</span>
                </p>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Наступне оновлення: {nextWheelUpdateDate ? nextWheelUpdateDate.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              Ще немає колеса балансу за цей період, тому місячний зріз поки неповний.
            </div>
          )}
        </GlassCard>
      </div>

      <ReportChecklistCard
        latestDayEntry={latestDayEntry}
        latestDayDateKey={latestDayDateKey}
        morningCount={monthSummary.morningCount}
        eveningCount={monthSummary.eveningCount}
        completedTasks={monthSummary.completedTasks}
        missedTasks={monthSummary.missedTasks}
      />

      <GlassCard className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-white p-5 shadow-none">
        <div className="flex items-center gap-2">
          <p className={SECTION_EYEBROW_CLASS}>Бесіди з асистентом</p>
          <InfoHint
            label="Бесіди з асистентом"
            description="Цей блок показує, наскільки активно ти використовувала чат-підтримку протягом останніх 30 днів і які теми звучали найчастіше."
            instruction="Дивись на теми й короткі фрагменти діалогів: вони добре підсвічують повторювані питання, сумніви й точки росту."
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Діалогів', value: conversationSummary?.totalConversations ?? 0, icon: MessageSquare },
            { label: 'Повідомлень', value: conversationSummary?.totalMessages ?? 0, icon: Bot },
          ].map(item => (
            <div key={item.label} className={`${SURFACE_BLOCK_CLASS} rounded-[16px] px-3 py-3`}>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <item.icon className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{item.label}</span>
              </div>
              <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{item.value}</p>
            </div>
          ))}
        </div>

        {(conversationSummary?.totalConversations ?? 0) === 0 && (conversationSummary?.totalMessages ?? 0) === 0 ? (
          <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
            Ще замало діалогів для аналізу тем.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className={`${SURFACE_BLOCK_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Теми, що звучали найчастіше</p>
              {conversationSummary?.topThemes?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {conversationSummary.topThemes.map(theme => (
                    <span
                      key={theme}
                      className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.07)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Ще замало діалогів, щоб виділити повторювані теми.</p>
              )}
            </div>

            <div className={`${SURFACE_BLOCK_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Останні сигнали з діалогів</p>
              {conversationSummary?.recentHighlights?.length ? (
                <div className="mt-3 space-y-3">
                  {conversationSummary.recentHighlights.map(item => (
                    <div key={item.id} className={`${SURFACE_BLOCK_CLASS} rounded-[14px] px-3 py-3`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                        <span className="text-[11px] text-[var(--text-muted)]">{item.messageCount} повідомлень</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{item.preview || 'Короткий фрагмент ще не сформовано.'}</p>
                      <p className="mt-2 text-[11px] text-[var(--text-muted)]">{formatDateTime(item.updatedAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">За останні 30 днів ще немає збережених діалогів для цього блоку.</p>
              )}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
