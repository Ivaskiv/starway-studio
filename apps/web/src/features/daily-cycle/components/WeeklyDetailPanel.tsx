import type { WeeklyReportFull } from '@/features/ai-mentor/services/mentor.api'

import { normalizeStringList } from '@/features/daily-cycle/utils/reportsTab.utils'

export function WeeklyDetailPanel({ report }: { report: WeeklyReportFull }) {
  const insights = normalizeStringList(report.topInsights)
  const nextWeekTasks = normalizeStringList(report.nextWeekTasks)

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">
          Ключові інсайти
        </p>
        {insights.length > 0 ? (
          <div className="mt-3 space-y-2">
            {insights.map(item => (
              <div key={item} className="flex items-start gap-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">Для цього тижня ще немає розгорнутих інсайтів.</p>
        )}
      </div>

      <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">
          Фокус на наступний тиждень
        </p>
        {nextWeekTasks.length > 0 ? (
          <div className="mt-3 space-y-2">
            {nextWeekTasks.map(item => (
              <div key={item} className="flex items-start gap-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">Наступний фокус ще не сформовано.</p>
        )}
      </div>
    </div>
  )
}
