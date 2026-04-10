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
    <section className="glass-card overflow-hidden border border-[rgba(92,136,255,0.12)] bg-[linear-gradient(180deg,rgba(38,72,148,0.24),rgba(9,16,34,0.9))] p-4 shadow-[0_18px_44px_rgba(8,15,32,0.24)] sm:p-5">
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectDay(toDateKey(addDays(parseDateKey(selectedDay), -7)))}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(92,136,255,0.12)] bg-white/[0.04] text-white/68 transition hover:bg-white/[0.08]"
            aria-label="Попередній тиждень"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectDay(toDateKey(addDays(parseDateKey(selectedDay), 7)))}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(92,136,255,0.12)] bg-white/[0.04] text-white/68 transition hover:bg-white/[0.08]"
            aria-label="Наступний тиждень"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-[10px]">
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
                'group relative rounded-[20px] border bg-[rgba(11,18,34,0.88)] px-[15px] py-4 text-left shadow-[0_8px_22px_rgba(5,10,22,0.14)] outline-none transition-all duration-200',
                isSelected
                  ? 'border-[rgba(119,164,255,0.28)] bg-[rgba(16,28,54,0.96)] shadow-[0_0_0_1px_rgba(119,164,255,0.16),0_14px_32px_rgba(15,34,70,0.24)]'
                  : 'border-[rgba(92,136,255,0.08)] hover:border-[rgba(119,164,255,0.16)] hover:bg-[rgba(15,22,40,0.94)] hover:shadow-[0_12px_28px_rgba(15,34,70,0.18)] focus-visible:border-[rgba(119,164,255,0.2)] focus-visible:shadow-[0_0_0_1px_rgba(119,164,255,0.1),0_14px_32px_rgba(15,34,70,0.22)]',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                  {date.toLocaleDateString('uk-UA', { weekday: 'short' })}
                </p>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${isToday ? 'border-[rgba(119,164,255,0.18)] bg-[rgba(119,164,255,0.12)] text-[rgb(var(--accent-soft-rgb))]' : 'border-[rgba(92,136,255,0.08)] bg-white/[0.03] text-white/52'}`}>
                  {isToday ? 'Сьогодні' : `${day?.summary.xp ?? 0} XP`}
                </span>
              </div>

              <p className="mt-3 text-[1.95rem] font-semibold leading-none text-white">
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

              <p className="mt-3 text-[11px] leading-5 text-white/42">
                {buildCardSummary(day, date)}
              </p>

              <span className="pointer-events-none absolute inset-0 rounded-[20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
