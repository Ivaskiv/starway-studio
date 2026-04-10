// apps/web/src/features/journal/components/DayChecklistCard.tsx
import { Clock3, CheckCircle2 } from 'lucide-react';
import type { JournalDayState } from '../types';
import { getDayChecklistState } from '../utils';

interface DayChecklistCardProps {
  dateKey: string;
  dayState: JournalDayState;
}

export default function DayChecklistCard({ dateKey, dayState }: DayChecklistCardProps) {
  const checklist = getDayChecklistState(dayState, dateKey);

  return (
    <div className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">
            Чекплан дня
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            Що вже закрито, а що ще чекає завершення.
          </p>
        </div>

        {checklist.isLateCompletion && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
            <Clock3 className="h-3.5 w-3.5" />
            Із запізненням
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {checklist.items.map((item) => (
          <div
            key={item.label}
            className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] px-4 py-3"
          >
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
                    : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : '•'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {checklist.isLateCompletion && (
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
          День завершено пізніше. Прогрес зараховано, але ритм дня отримує менший коефіцієнт.
        </p>
      )}
    </div>
  );
}