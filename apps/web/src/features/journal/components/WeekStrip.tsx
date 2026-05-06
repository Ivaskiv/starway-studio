// apps/web/src/features/journal/components/WeekStrip.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { JournalDayState } from '../types';
import { addDays, parseDateKey, toDateKey } from '../utils';

type WeekStripProps = {
  selectedDay: string;
  daysByDate: Record<string, JournalDayState>;
  onSelectDay: (day: string) => void;
};

function getWeekDays(selectedDay: string) {
  const base = parseDateKey(selectedDay);
  const weekDay = (base.getDay() + 6) % 7; 
  const monday = new Date(base);
  monday.setDate(base.getDate() - weekDay);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function getDayDots(day: JournalDayState | null, date: Date) {
  const summary = day?.summary ?? { completed: 0, pending: 0, missed: 0 };
  const isFuture = date > new Date();

  return [
    {
      key: 'completed',
      colorClass: !isFuture && summary.completed > 0 ? 'bg-emerald-400' : 'bg-white/10',
      tooltip: 'Виконані дії',
      count: summary.completed,
    },
    {
      key: 'pending',
      colorClass: !isFuture && summary.pending > 0 ? 'bg-amber-300' : 'bg-white/10',
      tooltip: 'Очікують завершення',
      count: summary.pending,
    },
    {
      key: 'missed',
      colorClass: !isFuture && summary.missed > 0 ? 'bg-rose-400' : 'bg-white/10',
      tooltip: 'Пропущені або прострочені',
      count: summary.missed,
    },
  ];
}

function buildCardSummary(day: JournalDayState | null, date: Date): string {
  if (date > new Date()) {
    return 'Ще попереду';
  }

  if (!day?.hasEntry) {
    return 'Без активності';
  }

  const summary = day.summary;
  return `${summary.completed} виконано • ${summary.pending} в роботі`;
}

export default function WeekStrip({ selectedDay, daysByDate, onSelectDay }: WeekStripProps) {
  const weekDays = getWeekDays(selectedDay);

  return (
    <section className="overflow-hidden rounded-[26px] border border-[rgba(255,255,255,0.06)] bg-[rgba(14,20,34,0.98)] p-4 shadow-[0_18px_40px_rgba(4,10,22,0.24)] sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/42">Тиждень</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {parseDateKey(selectedDay).toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectDay(toDateKey(addDays(parseDateKey(selectedDay), -7)))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-white/[0.04] text-white/68 transition hover:bg-white/[0.08]"
            aria-label="Попередній тиждень"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectDay(toDateKey(addDays(parseDateKey(selectedDay), 7)))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-white/[0.04] text-white/68 transition hover:bg-white/[0.08]"
            aria-label="Наступний тиждень"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-3">
        {weekDays.map((date) => {
          const dateKey = toDateKey(date);
          const day = daysByDate[dateKey] ?? null;
          const dots = getDayDots(day, date);
          const isSelected = selectedDay === dateKey;
          const isToday = toDateKey(new Date()) === dateKey;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDay(dateKey)}
              className={[
                'group relative min-h-[136px] rounded-[20px] border bg-[rgba(17,24,40,0.96)] px-[15px] py-4 text-left shadow-[0_10px_24px_rgba(5,10,22,0.18)] outline-none transition-all duration-200',
                isSelected
                  ? 'border-[rgba(81,138,255,0.9)] bg-[rgba(16,28,54,0.98)] shadow-[0_0_0_1px_rgba(129,174,255,0.22),0_14px_32px_rgba(15,34,70,0.24)]'
                  : 'border-[rgba(255,255,255,0.05)] hover:border-[rgba(119,164,255,0.16)] hover:bg-[rgba(18,26,44,0.96)] hover:shadow-[0_12px_28px_rgba(15,34,70,0.18)] focus-visible:border-[rgba(119,164,255,0.2)] focus-visible:shadow-[0_0_0_1px_rgba(119,164,255,0.1),0_14px_32px_rgba(15,34,70,0.22)]',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/42">
                  {date.toLocaleDateString('uk-UA', { weekday: 'short' })}
                </p>
              </div>

              <p className="mt-3 text-[2.1rem] font-semibold leading-none text-white">
                {date.getDate()}
              </p>

              <div className="mt-4 flex items-center gap-1.5">
                {dots.map((dot) => (
                  <span
                    key={`${dateKey}-${dot.key}`}
                    className={`h-2.5 w-2.5 rounded-full ${dot.colorClass}`}
                    aria-label={`${dot.tooltip}: ${dot.count}`}
                  />
                ))}
              </div>

              <p className="mt-2 text-[1.1rem] font-semibold leading-none text-[rgb(96,165,250)]">
                {day?.summary.xp ? `+${day.summary.xp}` : '—'}
              </p>

              <span className="pointer-events-none absolute inset-0 rounded-[20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
