// apps/web/src/features/zoom/UserZoomPanel.tsx

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, CheckCircle2, Crosshair, Target, X } from 'lucide-react';
import {
  useGetCalendarSessionsQuery,
  useGetLeaderboardQuery,
  useInitiateBattleMutation,
  useLogBattleProgressMutation,
  useGetEligibleOpponentsQuery,
  useGetPendingSwapsQuery,
  useAcceptSwapMutation,
  useDeclineSwapMutation,
} from './zoom.api';
import { getSessionBorderClass, getSessionMeta, isZoomLinkActive } from './zoom.utils';
import type { LeaderboardEntry, ZoomCalendarSession, ZoomSessionType } from './zoom.types';
import ZoomCalendar from './components/calendar/Calendar';
import { openExternalPaymentUrl } from '@/features/subscription/utils/openExternalPaymentUrl';
const RANK_EMOJI = ['🥇', '🥈', '🥉'];

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_MY_SESSIONS: ZoomCalendarSession[] = [
  {
    id: 'mock-u1',
    scheduledAt: (() => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay() + 1) % 7 || 7)); d.setHours(19, 0, 0, 0); return d.toISOString(); })(),
    topic: 'Чому ти відкладаєш важливе?',
    status: 'SCHEDULED',
    type: 'group_practice',
    zoomLink: 'https://zoom.us/j/999',
    attendeesCount: 23,
    notifiedAt24h: new Date().toISOString(),
    notifiedAt2h: null,
    goalText: null,
    canEdit: false,
    isMyBooking: true,
  },
  {
    id: 'mock-u2',
    scheduledAt: (() => { const d = new Date(); d.setDate(d.getDate() + 9); d.setHours(11, 0, 0, 0); return d.toISOString(); })(),
    topic: 'Індивідуальна стратегічна сесія',
    status: 'SCHEDULED',
    type: 'individual',
    zoomLink: '',
    attendeesCount: 1,
    notifiedAt24h: null,
    notifiedAt2h: null,
    goalText: null,
    canEdit: false,
    isMyBooking: true,
  },
];

// scheduledAt set so elapsed ≈ 4.9 days → pct=70%, day=5
const MOCK_ACTIVE_BATTLE: ZoomCalendarSession = {
  id: 'mock-b1',
  scheduledAt: new Date(Date.now() + Math.round(2.1 * 24 * 60 * 60 * 1000)).toISOString(),
  topic: 'Battle Review',
  status: 'ACTIVE',
  type: 'battle_review',
  zoomLink: '',
  goalText: 'Запустити сторінку продукту',
  canEdit: false,
};

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { userId: 'u1', battleWins: 5, bestStreak: 3, mindXP: 540, level: 4 },
  { userId: 'u2', battleWins: 3, bestStreak: 2, mindXP: 320, level: 3 },
  { userId: 'u3', battleWins: 2, bestStreak: 1, mindXP: 210, level: 2 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm} · ${hh}:${mi}`;
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({ label, demo = false }: { label: string; demo?: boolean }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))] mb-3 flex items-center">
      {label}
      {demo && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ml-2 normal-case tracking-normal font-medium">
          демо
        </span>
      )}
    </p>
  );
}

// ── MySessionRow ──────────────────────────────────────────────────────────────

function MySessionRow({ session }: { session: ZoomCalendarSession }) {
  const linkActive = isZoomLinkActive(session.scheduledAt) && !!session.zoomLink;
  const sessionMeta = getSessionMeta(session);

  return (
    <div className={['rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-3 pl-4', getSessionBorderClass(session)].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{session.topic}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {fmtDateTime(session.scheduledAt)} · {sessionMeta}
          </p>
        </div>
        {linkActive ? (
          <a
            href={session.zoomLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-liquid-primary inline-flex items-center text-[11px] font-semibold px-3 py-1 rounded-[var(--btn-radius)] flex-shrink-0"
          >
            <ArrowRight className="mr-1 h-3.5 w-3.5" />
            Zoom
          </a>
        ) : (
          <button
            disabled
            className="btn-liquid-primary inline-flex items-center text-[11px] font-semibold px-3 py-1 rounded-[var(--btn-radius)] flex-shrink-0 opacity-40 cursor-not-allowed"
          >
            <ArrowRight className="mr-1 h-3.5 w-3.5" />
            Zoom
          </button>
        )}
      </div>
      {session.notifiedAt24h && (
        <div className="flex gap-1.5 mt-2">
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-semibold">
            <Bell className="h-3 w-3" />
            Нагадування заплановано
          </span>
        </div>
      )}
    </div>
  );
}

// ── ActiveBattleSection ───────────────────────────────────────────────────────

function ActiveBattleSection({
  session,
  userId,
  onLogProgress,
}: {
  session: ZoomCalendarSession;
  userId: string;
  onLogProgress: (args: { sessionId: string; userId: string; day: number; text: string }) => void;
}) {
  const progRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');

  const startedAt = new Date(session.scheduledAt).getTime() - 7 * 24 * 60 * 60 * 1000;
  const elapsed = Math.min(Date.now() - startedAt, 7 * 24 * 60 * 60 * 1000);
  const pct = Math.round((elapsed / (7 * 24 * 60 * 60 * 1000)) * 100);
  const day = Math.min(Math.ceil(elapsed / (24 * 60 * 60 * 1000)), 7);

  useEffect(() => {
    progRef.current?.style.setProperty('--my-progress', `${pct}%`);
  }, [pct]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;
    onLogProgress({ sessionId: session.id, userId, day, text: text.trim() });
    setText('');
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400">
          <Crosshair className="h-4 w-4" />
          {session.topic}
        </p>
        <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
          День {day}/7
        </span>
      </div>
      {session.goalText && (
        <p className="text-xs text-[var(--text-muted)] mb-3">Моя ціль: {session.goalText}</p>
      )}
      <div className="mb-1.5">
        <div className="h-1.5 rounded-full bg-[var(--border-primary)] overflow-hidden">
          <div ref={progRef} className="h-full rounded-full bg-amber-500 [width:var(--my-progress,0%)] transition-all duration-500" />
        </div>
        <p className="text-[10px] text-amber-400 text-right mt-1">{pct}%</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-3">
        <textarea
          id={`progress-text-${session.id}`}
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          placeholder="Що ти зробила сьогодні для свого результату?"
          className="w-full resize-none rounded-[18px] border border-[var(--border-primary)] bg-white/[0.02] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus:border-[rgba(var(--accent-rgb),0.34)]"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="btn-liquid-primary mt-2 w-full inline-flex items-center justify-center text-sm font-semibold py-2.5 rounded-[var(--btn-radius)] disabled:opacity-40"
        >
          + Зафіксувати прогрес сьогодні
        </button>
      </form>
    </div>
  );
}

// ── BattleCallSection ─────────────────────────────────────────────────────────

function BattleCallSection({ userId }: { userId: string }) {
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const { data: opponents = [] } = useGetEligibleOpponentsQuery(userId);
  const [initiate, { isLoading }] = useInitiateBattleMutation();

  const handleSend = async () => {
    if (!selectedOpponent) return;
    const response = await initiate({ challengerId: userId, opponentId: selectedOpponent }).unwrap();
    if (response.type === 'non_subscriber') {
      openExternalPaymentUrl(response.checkoutUrl)
    }
    setSelectedOpponent('');
  };

  return (
    <div className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--glass-bg)] p-4 flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-[var(--text-muted)]">
        Вибери учасника і запропонуй 7-денний челендж
      </p>
      {opponents.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {opponents.slice(0, 8).map(o => {
            const initials = (o.name ?? o.email).slice(0, 2).toUpperCase();
            const selected = selectedOpponent === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setSelectedOpponent(selected ? '' : o.id)}
                title={o.name ?? o.email}
                className={[
                  'w-9 h-9 rounded-full text-[10px] font-semibold flex items-center justify-center transition-all',
                  selected
                    ? 'bg-amber-500/30 text-amber-300 ring-1 ring-amber-400'
                    : 'bg-purple-500/15 text-purple-300 hover:bg-purple-500/25',
                ].join(' ')}
              >
                {initials}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={handleSend}
        disabled={!selectedOpponent || isLoading}
        className="glass-button inline-flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-[var(--btn-radius)] disabled:opacity-40"
      >
        {isLoading ? 'Відправка...' : (
          <>
            <Crosshair className="h-4 w-4" />
            Надіслати виклик
          </>
        )}
      </button>
    </div>
  );
}

// ── RemindersSection ──────────────────────────────────────────────────────────

function RemindersSection({ sessions }: { sessions: ZoomCalendarSession[] }) {
  const now = Date.now();
  const upcoming = sessions
    .filter(s => s.type !== 'battle_review' && new Date(s.scheduledAt).getTime() > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 3);

  if (upcoming.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">Немає запланованих нагадувань</p>;
  }

  const DOT: Record<ZoomSessionType, string> = {
    group_practice: 'bg-purple-500',
    individual:     'bg-teal-500',
    intensive:      'bg-blue-500',
    battle_review:  'bg-amber-500',
  };

  return (
    <div className="flex flex-col">
      {upcoming.map(s => {
        const msUntil = new Date(s.scheduledAt).getTime() - now;
        const hoursUntil = Math.round(msUntil / (60 * 60 * 1000));
        const timeLabel = hoursUntil < 2 ? 'Незабаром' : hoursUntil < 24 ? `За ${hoursUntil}г` : `${Math.ceil(hoursUntil / 24)} дн.`;
        return (
          <div key={s.id} className="flex items-start gap-2 py-2 border-b border-[var(--border-primary)] last:border-b-0">
            <span className={['w-2 h-2 rounded-full mt-1.5 flex-shrink-0', DOT[s.type]].join(' ')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--text-primary)] truncate">{s.topic}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{fmtDateTime(s.scheduledAt)}</p>
            </div>
            <span className={[
              'inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0',
              hoursUntil < 24 ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400',
            ].join(' ')}>
              {timeLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── UserLeaderboardRow ────────────────────────────────────────────────────────

function UserLeaderboardRow({
  entry,
  rank,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
}) {
  const rankLabel = rank < 3 ? RANK_EMOJI[rank] : `${rank + 1}`;
  const initials = entry.userId.slice(0, 2).toUpperCase();

  return (
    <div className={[
      'flex items-center gap-2 py-2 border-b border-[var(--border-primary)] last:border-b-0',
      isMe ? 'ring-1 ring-[rgb(var(--accent-soft-rgb))]/40 rounded-lg px-1 -mx-1 bg-purple-500/[0.04]' : '',
    ].join(' ')}>
      <span className="text-[13px] w-6 text-center flex-shrink-0">{rankLabel}</span>
      <span className={[
        'w-7 h-7 rounded-full text-[10px] font-semibold flex items-center justify-center flex-shrink-0',
        isMe ? 'bg-purple-500/20 text-purple-300' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]',
      ].join(' ')}>
        {initials}
      </span>
      <span className={[
        'flex-1 text-sm truncate',
        isMe ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]',
      ].join(' ')}>
        @{entry.userId.slice(0, 10)}…
        {isMe && (
          <span className="ml-1.5 inline-flex text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold align-middle">
            ти
          </span>
        )}
      </span>
      <span className="text-xs text-[rgb(var(--accent-soft-rgb))] font-semibold flex-shrink-0">
        {entry.battleWins} · {entry.mindXP} XP
      </span>
    </div>
  );
}

// ── UserZoomPanel ─────────────────────────────────────────────────────────────

export interface UserZoomPanelProps {
  userId: string;
}

export function UserZoomPanel({ userId }: UserZoomPanelProps) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: sessions = [] } = useGetCalendarSessionsQuery(
    { from: monthStart, to: monthEnd, role: 'user', userId },
    { pollingInterval: 30_000, refetchOnMountOrArgChange: true },
  );
  const { data: leaderboard = [] } = useGetLeaderboardQuery();
  const [logProgress] = useLogBattleProgressMutation();
  const { data: pendingSwaps = [] } = useGetPendingSwapsQuery();
  const [acceptSwap] = useAcceptSwapMutation();
  const [declineSwap] = useDeclineSwapMutation();

  const activeBattle = sessions.find(
    s => s.type === 'battle_review' && s.status !== 'COMPLETED' && s.status !== 'CANCELLED',
  ) ?? null;

  const mySessions = sessions
    .filter(s => s.isMyBooking && s.type !== 'battle_review' && new Date(s.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  const displayMySessions: ZoomCalendarSession[] = mySessions;
  const displayActiveBattle: ZoomCalendarSession | null = activeBattle;
  const displayLeaderboard: LeaderboardEntry[] = leaderboard;
  const myStats = leaderboard.find(e => e.userId === userId);

  const handleLogProgress = (args: { sessionId: string; userId: string; day: number; text: string }) => {
    logProgress(args).catch(console.error);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* 1. Header */}
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-[var(--text-primary)]">
          <Target className="h-5 w-5" />
          Панель учасника
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">@{userId.slice(0, 8)} · ФОКУС активний</p>
      </div>

      {/* 2. Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'МОЇХ ZOOM', value: displayMySessions.length + (displayActiveBattle ? 1 : 0) },
          { label: 'BATTLE WINS', value: myStats?.battleWins ?? 0 },
          { label: 'MIND XP', value: myStats?.mindXP ?? 0 },
          { label: 'РІВЕНЬ', value: myStats?.level ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[var(--glass-bg)] rounded-xl p-4 border border-[var(--border-primary)]">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">{label}</p>
            <p className="text-3xl font-semibold text-[var(--text-primary)] leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* 3. Calendar */}
      <section>
        <SectionLabel label="МІЙ ZOOM-РОЗКЛАД" />
        <ZoomCalendar mode="user" userId={userId} />
      </section>

      {pendingSwaps.length > 0 && (
        <section>
          <SectionLabel label="SWAP ЗАПИТИ" />
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
            {pendingSwaps.slice(0, 3).map((swap) => (
              <div key={swap.id} className="rounded-lg border border-white/10 p-2 mb-2 last:mb-0">
                <p className="text-xs text-white/80">Запит на обмін слотом</p>
                <p className="text-[11px] text-white/60 mt-1">ID: {swap.id}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => swap.sessionIdTo && acceptSwap({ swapId: swap.id, sessionIdTo: swap.sessionIdTo }).catch(console.error)}
                    className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300"
                  >
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Погодитись
                    </span>
                  </button>
                  <button
                    onClick={() => declineSwap({ swapId: swap.id }).catch(console.error)}
                    className="rounded-lg bg-rose-500/20 px-3 py-1 text-xs text-rose-300"
                  >
                    <span className="inline-flex items-center gap-1">
                      <X className="h-3.5 w-3.5" />
                      Відхилити
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. My upcoming sessions */}
      <section>
        <SectionLabel label="МОЇ НАЙБЛИЖЧІ ZOOM" />
        {displayMySessions.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-1">Ти ще не зареєструвалась на жодну сесію</p>
        ) : (
          <div className="flex flex-col gap-2">
            {displayMySessions.map(s => <MySessionRow key={s.id} session={s} />)}
          </div>
        )}
      </section>

      {/* 5. Active battle */}
      <section>
        <SectionLabel label="МІЙ АКТИВНИЙ BATTLE" />
        {displayActiveBattle ? (
          <ActiveBattleSection session={displayActiveBattle} userId={userId} onLogProgress={handleLogProgress} />
        ) : (
          <p className="text-xs text-[var(--text-muted)] py-1">Активних battles немає</p>
        )}
      </section>

      {/* 6. Battle call */}
      <section>
        <SectionLabel label="ВИКЛИКАТИ НА BATTLE" />
        <BattleCallSection userId={userId} />
      </section>

      {/* 7. Reminders */}
      <section>
        <SectionLabel label="НАГАДУВАННЯ" />
        <RemindersSection sessions={sessions} />
      </section>

      {/* 8. Leaderboard */}
      <section>
        <SectionLabel label="LEADERBOARD" />
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] px-3 py-1">
          {displayLeaderboard.map((e, i) => (
            <UserLeaderboardRow
              key={e.userId}
              entry={e}
              rank={i}
              isMe={e.userId === userId}
            />
          ))}
        </div>
      </section>

    </div>
  );
}
