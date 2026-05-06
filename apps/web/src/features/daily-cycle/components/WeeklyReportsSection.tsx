import { ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react'

import type { WeeklyReportFull } from '@/features/ai-mentor/services/mentor.api'
import { GlassCard } from '@/ui'

import { WeeklyDetailPanel } from '@/features/daily-cycle/components/WeeklyDetailPanel'
import { formatRange, normalizeStringList } from '@/features/daily-cycle/utils/reportsTab.utils'

type Props = {
  displayReports: WeeklyReportFull[]
  reportsFetching: boolean
  expandedReportId: string | null
  expandedReportFetching: boolean
  expandedReport: WeeklyReportFull | undefined
  exportingWeeklyId: string | null
  weeklyPdfErrorId: string | null
  onToggleExpanded: (reportId: string) => void
  onDownloadPdf: (report: WeeklyReportFull) => Promise<void> | void
}

export function WeeklyReportsSection({
  displayReports,
  reportsFetching,
  expandedReportId,
  expandedReportFetching,
  expandedReport,
  exportingWeeklyId,
  weeklyPdfErrorId,
  onToggleExpanded,
  onDownloadPdf,
}: Props) {
  return (
    <GlassCard className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-white p-5 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">Щотижневі звіти</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Один тиждень = одна картка. Відкривай лише той, що потрібен.</p>
        </div>
        {reportsFetching ? <span className="text-sm text-[var(--text-muted)]">Оновлюємо…</span> : null}
      </div>

      <div className="mt-4 space-y-4">
        {displayReports.length > 0 ? displayReports.map(report => {
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
                  { label: 'виконано', value: report.metrics?.tasksDone ?? 0 },
                  { label: 'не завершено', value: Math.max((report.metrics?.tasksTotal ?? 0) - (report.metrics?.tasksDone ?? 0), 0) },
                  { label: 'стрік', value: report.streakDays ?? 0 },
                  { label: 'бал', value: report.overallScore ?? '—' },
                ].map(item => (
                  <span key={item.label} className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                    {item.label} {item.value}
                  </span>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {normalizeStringList(report.topInsights).length > 0 ? (
                  <div className="space-y-2">
                    {normalizeStringList(report.topInsights).map(item => (
                      <div key={item} className="flex items-start gap-2 text-[12.5px] leading-6 text-[var(--text-secondary)]">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {normalizeStringList(report.nextWeekTasks).length > 0 ? (
                  <div className="space-y-2 border-t border-[rgba(255,255,255,0.06)] pt-3">
                    {normalizeStringList(report.nextWeekTasks).map(item => (
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
                  onClick={() => onToggleExpanded(report.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.035)]"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {isExpanded ? 'Згорнути' : 'Відкрити'}
                </button>

                <button
                  type="button"
                  onClick={() => { void onDownloadPdf(report) }}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.035)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {isWeeklyPdfBusy ? <><Loader2 className="h-4 w-4 animate-spin" />Формуємо…</> : isWeeklyPdfError ? 'Спробувати знову' : 'Завантажити PDF'}
                </button>
              </div>

              {isWeeklyPdfError ? <p className="mt-2 text-sm text-[rgb(248,113,113)]">Не вдалося сформувати PDF тижня. Спробуй ще раз.</p> : null}

              {isExpanded ? (
                expandedReportFetching ? (
                  <div className="mt-4 rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                    Завантажуємо деталі тижня…
                  </div>
                ) : report.id.startsWith('fallback-') ? (
                  <WeeklyDetailPanel report={report} />
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
  )
}
