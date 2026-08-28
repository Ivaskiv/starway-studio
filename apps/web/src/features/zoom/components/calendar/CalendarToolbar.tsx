// frontend/src/features/zoom/components/CalendarToolbar.tsx
// Головний компонент сторінки Zoom-сесій — upcoming + history + glassmorphism
// Glassmorphism: dark teal bg, orange accents, frosted glass cards

import { useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, Sparkles } from 'lucide-react';
import { useZoom } from '../../hooks/useZoom';
import type { ZoomSessionWithAttendance } from '../../types/zoom.types';
import PostSessionReport from '../booking/PostSessionReport';
import RequestsList from '../booking/RequestsList';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Заплановано', dot: 'bg-teal-400',   text: 'text-teal-300',   bg: 'bg-teal-400/10 border-teal-400/25' },
  ACTIVE:    { label: 'Активна',     dot: 'bg-green-400 animate-pulse', text: 'text-green-300', bg: 'bg-green-400/10 border-green-400/25' },
  COMPLETED: { label: 'Завершена',   dot: 'bg-white/30',   text: 'text-white/45',   bg: 'bg-white/[0.04] border-white/10' },
  CANCELLED: { label: 'Скасована',   dot: 'bg-red-400/60', text: 'text-red-300/60', bg: 'bg-red-400/5 border-red-400/15' },
} as const;

// ── Upcoming card ─────────────────────────────────────────────────────────────

function UpcomingCard({
  session,
  onRegister,
  registering,
  formatDate,
}: {
  session: ZoomSessionWithAttendance;
  onRegister: (id: string) => void;
  registering: boolean;
  formatDate: ReturnType<typeof useZoom>['formatDate'];
}) {
  const { date, time, daysLeft } = formatDate(session.scheduledAt);
  const cfg = STATUS_CONFIG[session.status];

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.04] p-6">
      {/* glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[rgb(var(--accent-rgb))] opacity-[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-teal-400 opacity-[0.05] blur-3xl" />

      {/* header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/30 mb-1.5">
            Наступна сесія
          </p>
          <h2 className="text-[18px] font-semibold text-white leading-snug">{session.topic}</h2>
        </div>

        {/* status */}
        <span className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* date row */}
      <div className="flex items-center gap-6 mb-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.06] text-white/70">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] text-white/35 leading-none mb-0.5">Дата</p>
            <p className="text-[13px] font-medium text-white capitalize">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.06] text-white/70">
            <Clock3 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] text-white/35 leading-none mb-0.5">Час</p>
            <p className="text-[13px] font-medium text-white">{time}</p>
          </div>
        </div>
        {daysLeft > 0 && (
          <div className="ml-auto text-right">
            <p className="text-[11px] text-white/30">До сесії</p>
            <p className="text-[22px] font-bold text-[rgb(var(--accent-rgb))] leading-none">
              {daysLeft}<span className="text-[13px] text-white/40 ml-1">дн</span>
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        {session.isRegistered ? (
          <a
            href="#"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[rgba(var(--accent-rgb),0.15)] border border-[rgba(var(--accent-rgb),0.35)] text-[rgb(var(--accent-rgb))] text-[13px] font-semibold hover:bg-[rgba(var(--accent-rgb),0.22)] transition-all"
          >
            <ArrowRight className="h-4 w-4" /> Приєднатись до Zoom
          </a>
        ) : (
          <button
            onClick={() => onRegister(session.id)}
            disabled={registering}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[rgba(var(--accent-rgb),0.12)] border border-[rgba(var(--accent-rgb),0.3)] text-[rgb(var(--accent-rgb))] text-[13px] font-semibold hover:bg-[rgba(var(--accent-rgb),0.2)] transition-all disabled:opacity-50"
          >
            {registering ? '...' : '＋ Зареєструватись'}
          </button>
        )}
        <button className="px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.04] text-white/50 text-[13px] hover:bg-white/[0.08] hover:text-white/70 transition-all">
          Скасувати
        </button>
      </div>
    </div>
  );
}

// ── History card ──────────────────────────────────────────────────────────────

function HistoryCard({
  session,
  formatDate,
}: {
  session: ZoomSessionWithAttendance;
  formatDate: ReturnType<typeof useZoom>['formatDate'];
}) {
  const [showReport, setShowReport] = useState(false);
  const { short, time } = formatDate(session.scheduledAt);
  const cfg = STATUS_CONFIG[session.status];
  const hasReport = !!session.postSessionReport;

  return (
    <div className="group rounded-xl border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-200 overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3.5">
        {/* status dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />

        {/* info */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-white/80 truncate">{session.topic}</p>
          <p className="text-[11px] text-white/30 mt-0.5 capitalize">
            {short} · {time}
            {session.status === 'CANCELLED' && <span className="ml-2 text-red-300/50">Скасована</span>}
          </p>
        </div>

        {/* actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {session.isRegistered && session.status === 'COMPLETED' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/10 border border-teal-400/20 text-teal-400/80">
              ✓ Відвідала
            </span>
          )}
          {hasReport && (
            <button
              onClick={() => setShowReport(v => !v)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
            >
              {showReport ? 'Згорнути' : 'Звіт →'}
            </button>
          )}
        </div>
      </div>

      {/* inline report */}
      {showReport && hasReport && (
        <div className="border-t border-white/[0.07] px-4 pb-4 pt-3">
          <PostSessionReport report={session.postSessionReport!} />
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-3xl mb-5">
        <Sparkles className="h-7 w-7 text-white/70" />
      </div>
      <p className="text-[15px] font-medium text-white/70 mb-1">Сесій ще немає</p>
      <p className="text-[12px] text-white/30 max-w-[220px] mb-6 leading-relaxed">
        Подай перший запит — ментор відповість протягом 24 годин
      </p>
      <button
        onClick={onRequest}
        className="px-5 py-2.5 rounded-xl bg-[rgba(var(--accent-rgb),0.12)] border border-[rgba(var(--accent-rgb),0.3)] text-[rgb(var(--accent-rgb))] text-[13px] font-semibold hover:bg-[rgba(var(--accent-rgb),0.2)] transition-all"
      >
         Подати запит на сесію
      </button>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 mb-6 animate-pulse">
      <div className="h-3 w-24 bg-white/10 rounded mb-3" />
      <div className="h-5 w-3/4 bg-white/10 rounded mb-5" />
      <div className="flex gap-4 mb-5">
        <div className="h-8 w-32 bg-white/[0.06] rounded-lg" />
        <div className="h-8 w-24 bg-white/[0.06] rounded-lg" />
      </div>
      <div className="h-11 w-full bg-white/[0.06] rounded-xl" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CalendarToolbar() {
  const { upcoming, history, register, registering, isLoading, isMock, formatDate } = useZoom();
  const [showRequestForm, setShowRequestForm] = useState(false);

  return (
    <div className="min-h-screen bg-[#0d1117] px-4 py-6 md:px-8">
      {/* page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-white tracking-tight">Сесії</h1>
          <p className="text-[12px] text-white/35 mt-0.5">Zoom-зустрічі з ментором</p>
        </div>

        <div className="flex items-center gap-2">
          {isMock && (
            <span className="text-[10px] px-2 py-1 rounded-full border border-amber-400/25 bg-amber-400/10 text-amber-300/70">
              Demo
            </span>
          )}
          <button
            onClick={() => setShowRequestForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(var(--accent-rgb),0.1)] border border-[rgba(var(--accent-rgb),0.25)] text-[rgb(var(--accent-rgb))] text-[13px] font-semibold hover:bg-[rgba(var(--accent-rgb),0.18)] transition-all"
          >
            <span className="text-[11px]">＋</span> Запит
          </button>
        </div>
      </div>

      {/* request form */}
      {showRequestForm && (
        <div className="mb-6">
          <RequestsList onClose={() => setShowRequestForm(false)} />
        </div>
      )}

      {/* upcoming */}
      {isLoading ? (
        <SkeletonCard />
      ) : upcoming ? (
        <UpcomingCard
          session={upcoming}
          onRegister={register}
          registering={registering}
          formatDate={formatDate}
        />
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 mb-6 flex items-center gap-3">
          <span className="text-2xl">📭</span>
          <div>
            <p className="text-[13px] font-medium text-white/60">Немає запланованих сесій</p>
            <p className="text-[11px] text-white/30">Подай запит або чекай на розклад від ментора</p>
          </div>
        </div>
      )}

      {/* history */}
      {!isLoading && (
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/25 mb-3 px-1">
            Минулі сесії · {history.length}
          </p>

          {history.length === 0 ? (
            <EmptyState onRequest={() => setShowRequestForm(true)} />
          ) : (
            <div className="flex flex-col gap-2">
              {history.map(s => (
                <HistoryCard key={s.id} session={s} formatDate={formatDate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
