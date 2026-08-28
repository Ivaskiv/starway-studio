// frontend/src/features/zoom/components/PostSessionReport.tsx
// Відображає postSessionReport (Json) після завершеної сесії
// Приклад: <PostSessionReport report={session.postSessionReport} />

import type { PostSessionReport } from '../../types/zoom.types';

const SPHERE_LABELS: Record<string, string> = {
  money:             'Гроші',
  realization:       'Реалізація',
  relationships:     'Відносини',
  energy_body:       'Енергія/Тіло',
  freedom_time:      'Свобода/Час',
  inner_support:     'Духовність',
  environment:       'Оточення',
  meaning_direction: 'Сенс/Напрямок',
};

interface PostZoomReportProps {
  report: PostSessionReport;
}

export default function PostSessionReport({ report }: PostZoomReportProps) {
  return (
    <div className="space-y-4">
      {/* summary */}
      <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/25 mb-2">
          Підсумок
        </p>
        <p className="text-[13px] text-white/70 leading-relaxed">{report.summary}</p>
      </div>

      {/* action items */}
      {report.actionItems?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/25 mb-2.5 px-1">
            Кроки дій
          </p>
          <div className="space-y-1.5">
            {report.actionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[rgba(var(--accent-rgb),0.15)] border border-[rgba(var(--accent-rgb),0.25)] flex items-center justify-center text-[10px] font-bold text-[rgb(var(--accent-rgb))] mt-px">
                  {i + 1}
                </span>
                <p className="text-[12.5px] text-white/65 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* next focus */}
      {report.nextFocus && (
        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-teal-400/[0.07] border border-teal-400/20">
          <span className="text-teal-400 text-[15px]">→</span>
          <div>
            <p className="text-[10px] text-teal-300/50 mb-0.5">Наступний фокус</p>
            <p className="text-[13px] font-medium text-teal-200/80">
              {SPHERE_LABELS[report.nextFocus] ?? report.nextFocus}
            </p>
          </div>
        </div>
      )}

      {/* mentor notes */}
      {report.mentorNotes && (
        <div className="px-3.5 py-2.5 rounded-xl border-l-2 border-[rgba(var(--accent-rgb),0.4)] bg-[rgba(var(--accent-rgb),0.05)]">
          <p className="text-[10px] text-[rgba(var(--accent-rgb),0.6)] mb-1">Нотатки ментора</p>
          <p className="text-[12px] text-white/55 italic leading-relaxed">{report.mentorNotes}</p>
        </div>
      )}
    </div>
  );
}
