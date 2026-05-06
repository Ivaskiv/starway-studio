import { BarChart3, CalendarDays, Download, FileDown, Loader2, RefreshCcw, Sparkles, Target } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'

import {
    type WeeklyReportFull,
    useGetMonthlyConversationSummaryQuery,
    useGetMyWeeklyReportsQuery,
    useGetWeeklyReportByIdQuery,
    useLazyGetWeeklyReportByIdQuery,
} from '@/features/ai-mentor/services/mentor.api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { PdfPreviewPanel } from '@/features/daily-cycle/components/PdfPreviewPanel'
import { ReportChecklistCard } from '@/features/daily-cycle/components/ReportChecklistCard'
import { ReportsInsightsSections } from '@/features/daily-cycle/components/ReportsInsightsSections'
import { WeeklyReportsSection } from '@/features/daily-cycle/components/WeeklyReportsSection'
import {
  REPORT_ACTION_CLASS,
  REPORT_ACTION_SECONDARY_CLASS,
  SECTION_EYEBROW_CLASS,
  SURFACE_CARD_CLASS,
  WHEEL_LABEL_MAP,
} from '@/features/daily-cycle/types/reportsTab.constants'
import { downloadBlobAsFile } from '@/features/daily-cycle/questions/utils/pdf.utils'
import { useGetDailyHistoryQuery } from '@/features/daily-cycle/services/daily.api'
import {
    buildFallbackWeeklyReport,
    buildTrendPoints,
    formatRange,
    groupEntriesByWeek,
    isSessionCaptured,
    startOfWindow,
    withTimeout,
} from '@/features/daily-cycle/utils/reportsTab.utils'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import { useMicroTasks } from '@/features/microTask/hooks/useMicroTasks'
import { generateMonthlySummaryPdf } from '@/features/reportsPdf/services/monthlyReportPdf'
import { generateWeeklyReportPdf } from '@/features/reportsPdf/services/weeklyReportPdf'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { useGetWheelHistoryQuery } from '@/features/wheel/services/wheel.api'
import { isWheelSphereId } from '@/features/wheel/types/wheel.types'
import { GlassCard, InfoHint, withMinimumDelay } from '@/ui'

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
    const trendPoints = buildTrendPoints(monthEntries)

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
  const weakestLabel = weakestId && isWheelSphereId(weakestId) ? (WHEEL_LABEL_MAP.get(weakestId) ?? weakestId) : weakestId ?? '—'
  const strongestLabel = strongestId && isWheelSphereId(strongestId) ? (WHEEL_LABEL_MAP.get(strongestId) ?? strongestId) : strongestId ?? '—'
  const trendFirstValue = monthSummary.trendPoints[0]?.value ?? 0
  const trendLastValue = monthSummary.trendPoints[monthSummary.trendPoints.length - 1]?.value ?? 0
  const latestWheelDate = monthSummary.latestWheel ? new Date(monthSummary.latestWheel.completedAt ?? monthSummary.latestWheel.createdAt) : null
  const nextWheelUpdateDate = latestWheelDate ? new Date(latestWheelDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null

  const monthlyNarrative = useMemo(() => [
    monthSummary.trendPoints.length < 2
      ? 'Даних ще замало, щоб оцінити траєкторію стану.'
      : trendLastValue >= trendFirstValue
        ? 'Стан рухався рівніше або зростаючо.'
        : 'Стан просідав, тож ритм варто спростити.',
    `Сильна сфера: ${strongestLabel}.`,
    `Сфера фокусу: ${weakestLabel}.`,
  ].join('\n'), [monthSummary.trendPoints.length, strongestLabel, trendFirstValue, trendLastValue, weakestLabel])

  const monthlyStatusNote = useMemo(() => {
    if (monthSummary.trendPoints.length < 2) return 'Даних ще замало, щоб чесно оцінити місячну траєкторію.'
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
    if (reports.length > 0 && expandedReport) return expandedReport
    return displayReports[0] ?? null
  }, [displayReports, expandedReport, reports.length])
  const isReportsBusy = reportsFetching || expandedReportFetching || isPreparingPreview || isExportingPdf || isRefreshingBundle

  useEffect(() => () => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
  }, [])

  const openPdfPreview = async (blob: Blob, title: string) => {
    const url = URL.createObjectURL(blob)
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
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
              <InfoHint label="Звіти" description="Тут зібрані щотижневі підсумки по 7 днях і місячний зріз руху: ранок, вечір, колесо, мікрозавдання та загальна динаміка." instruction="Відкривай останній тиждень для фокусу на найближчих кроках, а місячний підсумок використовуй для великої корекції курсу." />
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
              {isPreparingPreview ? <><Loader2 className="h-4 w-4 animate-spin" />Формуємо…</> : monthlyPdfError ? <><FileDown className="h-4 w-4" />Спробувати знову</> : <><Download className="h-4 w-4" />PDF звіт</>}
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
        <PdfPreviewPanel
          pdfPreviewUrl={pdfPreviewUrl}
          pdfPreviewTitle={pdfPreviewTitle}
          onClose={() => setPdfPreviewUrl(null)}
        />
      ) : null}

      <WeeklyReportsSection
        displayReports={displayReports}
        reportsFetching={reportsFetching}
        expandedReportId={expandedReportId}
        expandedReportFetching={expandedReportFetching}
        expandedReport={expandedReport ?? undefined}
        exportingWeeklyId={exportingWeeklyId}
        weeklyPdfErrorId={weeklyPdfErrorId}
        onToggleExpanded={(reportId) => setExpandedReportId(current => (current === reportId ? null : reportId))}
        onDownloadPdf={async (report) => {
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
      />

      <ReportsInsightsSections
        monthSummary={monthSummary}
        strongestLabel={strongestLabel}
        weakestLabel={weakestLabel}
        monthlyStatusNote={monthlyStatusNote}
        trendFirstValue={trendFirstValue}
        trendLastValue={trendLastValue}
        nextWheelUpdateDate={nextWheelUpdateDate}
        conversationSummary={conversationSummary}
      />

      <ReportChecklistCard
        latestDayEntry={latestDayEntry}
        latestDayDateKey={latestDayDateKey}
        morningCount={monthSummary.morningCount}
        eveningCount={monthSummary.eveningCount}
        completedTasks={monthSummary.completedTasks}
        missedTasks={monthSummary.missedTasks}
      />

    </div>
  )
}
