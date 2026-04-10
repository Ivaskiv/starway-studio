import { ArrowRight, Flame } from 'lucide-react';

interface JournalCommandCenterProps {
  compact?: boolean;
  displayName: string;
  subtitle: string;
  dayLabel: string;
  actionLabel: string;
  progressLabel: string;
  progressPercent: number;
  xp: number;
  streak: number;
  onAction: () => void;
}

export default function JournalCommandCenter({
  compact = false,
  displayName,
  subtitle,
  dayLabel,
  actionLabel,
  progressLabel,
  progressPercent,
  xp,
  streak,
  onAction,
}: JournalCommandCenterProps) {
  return (
    <>
      <section className="dashboard-liquid-card--soft overflow-hidden">
        <div className={compact ? 'dashboard-liquid-edge--top p-4' : 'dashboard-liquid-edge--top p-5 sm:p-6'}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
                Журнал дня
              </p>
              <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
                Добрий день, {displayName}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">{subtitle}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                  {dayLabel}
                </span>
                <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                  Стрік {streak}
                </span>
              </div>

              <button
                type="button"
                onClick={onAction}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.28)] bg-[rgba(var(--accent-rgb),0.16)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[rgba(var(--accent-rgb),0.38)] hover:bg-[rgba(var(--accent-rgb),0.22)]"
              >
                {actionLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-w-[240px] gap-3 sm:grid-cols-2 lg:min-w-[320px] lg:grid-cols-1">
              <div className="rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">Прогрес дня</p>
                <p className="mt-2 text-lg font-semibold text-white">{progressLabel}</p>
              </div>
              <div className="rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">XP сьогодні</p>
                <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-white">
                  <Flame className="h-4 w-4 text-amber-300" />
                  +{xp}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-liquid-card--soft overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(var(--accent-rgb),0.92),rgba(124,182,255,0.86))]"
                  style={{ width: `${Math.max(6, progressPercent)}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{progressLabel}</span>
                <span>Рух по дню оновлюється автоматично</span>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)]">
              <Flame className="h-4 w-4 text-amber-300" />
              +{xp} XP
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
