import { ChevronRight } from 'lucide-react';
import { getNormalizedSessionType, getSessionBorderClass, getSessionMeta, getUserZoomCommercePresentation } from '../../zoom.utils';
import type { LeaderboardEntry, ZoomCalendarSession, ZoomSessionType } from '../../zoom.types';
import { UserZoomStatusBadge } from '../calendar/UserZoomStatusBadge';
import { fmtDateTime } from '../../utils/userPanelPresentation';

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

export function SectionLabel({ label, demo = false }: { label: string; demo?: boolean }) {
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

export function MySessionRow({
  session,
  onSelect,
}: {
  session: ZoomCalendarSession
  onSelect: (session: ZoomCalendarSession) => void
}) {
  const sessionMeta = getSessionMeta(session);
  const commerce = getUserZoomCommercePresentation(session)
  const isRescheduledGroupPractice = Boolean(
    session.previousScheduledAt
      && session.isMyBooking
      && session.status === 'SCHEDULED'
      && getNormalizedSessionType(session) === 'group_practice'
      && new Date(session.scheduledAt).getTime() > Date.now(),
  )

  return (
    <button
      type="button"
      data-user-my-session-row="compact"
      onClick={() => onSelect(session)}
      className={['w-full rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-3 pl-4 text-left', getSessionBorderClass(session)].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{session.topic}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {fmtDateTime(session.scheduledAt)} · {sessionMeta}
          </p>
          {isRescheduledGroupPractice && (
            <>
              <p className="mt-1 text-[10px] font-semibold text-sky-200">ПЕРЕНЕСЕНО</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Було: {fmtDateTime(session.previousScheduledAt!)}</p>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <UserZoomStatusBadge state={commerce.state} label={commerce.label} />
          <ChevronRight className="h-4 w-4 text-white/35" aria-hidden="true" />
        </div>
      </div>
    </button>
  );
}

export function AvailableSessionRow({
  session,
  onSelect,
}: {
  session: ZoomCalendarSession
  onSelect: (session: ZoomCalendarSession) => void
}) {
  const sessionMeta = getSessionMeta(session)
  const commerce = getUserZoomCommercePresentation(session)

  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      className={['w-full rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-3 pl-4 text-left', getSessionBorderClass(session)].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {session.topic}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {fmtDateTime(session.scheduledAt)} · {sessionMeta}
          </p>
        </div>

        <UserZoomStatusBadge
          state={commerce.state}
          label={commerce.label}
        />
      </div>
    </button>
  )
}

export function RemindersSection({ sessions }: { sessions: ZoomCalendarSession[] }) {
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

export function UserLeaderboardRow({
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
