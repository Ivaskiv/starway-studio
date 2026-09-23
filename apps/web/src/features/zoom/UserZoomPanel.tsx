// apps/web/src/features/zoom/UserZoomPanel.tsx

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, CheckCircle2, ChevronLeft, ChevronRight, Crosshair, Target, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { useSystemState } from '@/features/auth/hooks/useSystemState';
import { BaseModal } from '@/features/modals/BaseModal';
import {
  useGetLeaderboardQuery,
  useInitiateBattleMutation,
  useAcceptBattleMutation,
  useDeclineBattleMutation,
  useLogBattleProgressMutation,
  useGetEligibleOpponentsQuery,
  useGetPendingSwapsQuery,
  useAcceptSwapMutation,
  useDeclineSwapMutation,
  useGetCalendarSessionsQuery,
  useCreateUserIndividualRequestMutation,
  useGetIndividualAvailabilityQuery,
  useGetIndividualAvailabilitySummaryQuery,
} from './zoom.api';
import { useGetMySessionsQuery } from './services/zoom.api';
import {
  getSessionBorderClass,
  getSessionMeta,
  getZoomPaymentBadgeLabel,
  getUserZoomCommercePresentation,
  isZoomLinkActive,
} from './zoom.utils';
import type { LeaderboardEntry, ZoomCalendarSession, ZoomSessionType } from './zoom.types';
import { normalizeZoomHubSession } from './utils/zoomCalendar.utils';
import ZoomCalendar from './components/calendar/Calendar';
import { BattleInstruction } from './components/BattleInstruction';
import { openExternalPaymentUrl } from '@/features/subscription/utils/openExternalPaymentUrl';
import { UserZoomStatusBadge } from './components/calendar/UserZoomStatusBadge'

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

const INDIVIDUAL_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatIndividualDate(dateKey: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(parseLocalDate(dateKey));
}

function formatIndividualTime(iso: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
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
  const paymentLabel = getZoomPaymentBadgeLabel(session);

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
      {(paymentLabel || session.notifiedAt24h) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {paymentLabel && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[var(--text-secondary)] font-semibold">
              {paymentLabel}
            </span>
          )}
          {session.notifiedAt24h && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-semibold">
              <Bell className="h-3 w-3" />
              Нагадування заплановано
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AvailableSessionRow({
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

// ── ActiveBattleSection ───────────────────────────────────────────────────────

function ActiveBattleSection({
  session,
  userId,
  onLogProgress,
  onAccept,
  onDecline,
}: {
  session: ZoomCalendarSession;
  userId: string;
  onLogProgress: (args: { sessionId: string; userId: string; day: number; text: string }) => void;
  onAccept: (sessionId: string) => void;
  onDecline: (sessionId: string) => void;
}) {
  const progRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');

  const startedAt = new Date(session.scheduledAt).getTime() - 7 * 24 * 60 * 60 * 1000;
  const elapsed = Math.min(Date.now() - startedAt, 7 * 24 * 60 * 60 * 1000);
  const pct = Math.round((elapsed / (7 * 24 * 60 * 60 * 1000)) * 100);
  const day = Math.min(Math.ceil(elapsed / (24 * 60 * 60 * 1000)), 7);
  const isPending = session.battleStatus === 'pending';
  const isOpponent = session.opponentId === userId;
  const paymentLabel = getZoomPaymentBadgeLabel(session);

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
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="inline-flex rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
            День {day}/7
          </span>
          {paymentLabel && (
            <span className="inline-flex rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
              {paymentLabel}
            </span>
          )}
        </div>
      </div>
      {isPending && (
        <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-200">
          {isOpponent ? 'Battle очікує твого рішення.' : 'Battle очікує прийняття суперником.'}
          {isOpponent && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onAccept(session.id)}
                className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200"
              >
                Прийняти
              </button>
              <button
                type="button"
                onClick={() => onDecline(session.id)}
                className="rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-200"
              >
                Відхилити
              </button>
            </div>
          )}
        </div>
      )}
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

function BattleCallSection({
  userId,
  onOpenInstructions,
}: {
  userId: string
  onOpenInstructions: () => void
}) {
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const { data: opponents = [] } = useGetEligibleOpponentsQuery(userId);
  const [initiate, { isLoading }] = useInitiateBattleMutation();

  const handleSend = async () => {
    if (!selectedOpponent) return;
    const response = await initiate({ challengerId: userId, opponentId: selectedOpponent }).unwrap();
    if (response.type === 'non_subscriber' && response.checkoutUrl) {
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
      <div className="grid w-full grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleSend}
          disabled={!selectedOpponent || isLoading}
          className="glass-button inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-[var(--btn-radius)] disabled:opacity-40"
        >
          {isLoading ? 'Відправка...' : (
            <>
              <Crosshair className="h-4 w-4" />
              Викликати на Battle
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onOpenInstructions}
          className="rounded-[var(--btn-radius)] border border-[var(--border-primary)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--glass-bg-hover)]"
        >
          Правила
        </button>
      </div>
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

type UserPanelTab = 'sessions' | 'progress' | 'materials' | 'rewards' | 'ai' | 'more';
type UserProgressTab = 'overview' | 'goals' | 'statistics';
type UserRewardsTab = 'all' | 'achievements' | 'bonuses' | 'levels';
type UserCreateAction = 'menu' | 'group' | 'individual' | 'battle' | null;

export function UserZoomPanel({ userId }: UserZoomPanelProps) {
  const user = useAppSelector((state) => state.auth.user);
  const { getModuleAccess, isLoading: isAccessLoading, state: accessState, zoomAccess } = useSystemState();
  const [searchParams, setSearchParams] = useSearchParams();
  const panel = searchParams.get('panel');
  const activeTab: UserPanelTab = panel === 'progress' || panel === 'materials' || panel === 'rewards' || panel === 'ai' || panel === 'more'
    ? panel
    : 'sessions';
  const [activeProgressTab, setActiveProgressTab] = useState<UserProgressTab>('overview');
  const [activeRewardsTab, setActiveRewardsTab] = useState<UserRewardsTab>('all');
  const [rewardDetailsOpen, setRewardDetailsOpen] = useState(false);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: sessions = [] } = useGetCalendarSessionsQuery(
    { from: monthStart, to: monthEnd, role: 'user', userId },
    {
      pollingInterval: 30_000,
      refetchOnFocus: true,
      refetchOnMountOrArgChange: true,
    },
  );
  const { data: mySessionsResponse } = useGetMySessionsQuery(undefined);
  const { data: leaderboard = [] } = useGetLeaderboardQuery();
  const [logProgress] = useLogBattleProgressMutation();
  const [acceptBattle] = useAcceptBattleMutation();
  const [declineBattle] = useDeclineBattleMutation();
  const { data: pendingSwaps = [] } = useGetPendingSwapsQuery();
  const [acceptSwap] = useAcceptSwapMutation();
  const [declineSwap] = useDeclineSwapMutation();
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [createAction, setCreateAction] = useState<UserCreateAction>(null);
  const [requestedUserSession, setRequestedUserSession] = useState<ZoomCalendarSession | null>(null)
  const [individualDate, setIndividualDate] = useState('');
  const [individualTime, setIndividualTime] = useState('');
  const [individualQuestion, setIndividualQuestion] = useState('');
  const [individualRequestError, setIndividualRequestError] = useState<string | null>(null);
  const [individualCalendarMonth, setIndividualCalendarMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const individualCalendarFirstDate = new Date(
    individualCalendarMonth.getFullYear(), individualCalendarMonth.getMonth(), 1,
  );
  const individualCalendarStart = new Date(individualCalendarFirstDate);
  individualCalendarStart.setDate(individualCalendarStart.getDate() - ((individualCalendarStart.getDay() + 6) % 7));
  const individualCalendarEnd = new Date(individualCalendarStart);
  individualCalendarEnd.setDate(individualCalendarEnd.getDate() + 41);
  const [createIndividualRequest, { isLoading: isCreatingIndividualRequest }] = useCreateUserIndividualRequestMutation();
  const {
    data: individualAvailability = [],
    isFetching: isFetchingIndividualAvailability,
    isError: isIndividualAvailabilityError,
    refetch: refetchIndividualAvailability,
  } = useGetIndividualAvailabilityQuery(individualDate, {
    skip: !individualDate || createAction !== 'individual',
  });
  const { data: individualAvailabilitySummary = [] } = useGetIndividualAvailabilitySummaryQuery({
    from: toLocalDateKey(individualCalendarStart),
    to: toLocalDateKey(individualCalendarEnd),
  }, {
    skip: createAction !== 'individual',
  });
  const selectedIndividualSlot = individualAvailability.find(
    (slot) => slot.scheduledAt === individualTime,
  ) ?? null;
  const hasOnlyBusyIndividualSlots =
    individualAvailability.length > 0
    && individualAvailability.every((slot) => !slot.available);
  const todayKey = toLocalDateKey(now);
  const calendarMonthLabel = new Intl.DateTimeFormat('uk-UA', {
    month: 'long', year: 'numeric',
  }).format(individualCalendarMonth);
  const calendarMonthDays = new Date(
    individualCalendarMonth.getFullYear(),
    individualCalendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarOffset = (new Date(
    individualCalendarMonth.getFullYear(), individualCalendarMonth.getMonth(), 1,
  ).getDay() + 6) % 7;
  const individualFreeSlotCount = individualAvailability.filter((slot) => slot.available).length;
  const selectedIndividualDaySummary = individualAvailabilitySummary.find(
    (day) => day.date === individualDate,
  );
  const canSubmitIndividualRequest = Boolean(
    individualDate
    && selectedIndividualSlot?.available
    && individualQuestion.trim()
    && !isFetchingIndividualAvailability
    && !isIndividualAvailabilityError
  );

  const activeBattle = sessions.find(
    s => s.type === 'battle_review' && s.status !== 'COMPLETED' && s.status !== 'CANCELLED',
  ) ?? null;

  const bookedSessionIds = new Set(
    (mySessionsResponse?.sessions ?? []).map((session) => session.id),
  );

  const availableSessions = sessions
    .filter(s => s.type !== 'battle_review' && new Date(s.scheduledAt) > now)
    .filter(s => !s.isMyBooking && !bookedSessionIds.has(s.id))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  const displayMySessions: ZoomCalendarSession[] = (mySessionsResponse?.sessions ?? [])
    .map((session) =>
      ({
        ...normalizeZoomHubSession(session, {
          type: 'GROUP',
          zoomLink: '',
        }),
        canEdit: false,
      }),
    )
    .filter(s => s.type !== 'battle_review' && new Date(s.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  const displayAvailableSessions: ZoomCalendarSession[] = availableSessions;
  const individualCalendarGroupSessions = sessions.filter((session) =>
    session.type === 'group' || session.type === 'group_practice',
  );
  const displayActiveBattle: ZoomCalendarSession | null = activeBattle;
  const displayLeaderboard: LeaderboardEntry[] = leaderboard;
  const myStats = leaderboard.find(e => e.userId === userId);
  const weekStart = new Date(now);
  const dayFromMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - dayFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const completedThisWeek = sessions.filter((session) => {
    const scheduledAt = new Date(session.scheduledAt);
    return (
      session.status === 'COMPLETED' &&
      (session.isMyBooking || bookedSessionIds.has(session.id)) &&
      scheduledAt >= weekStart &&
      scheduledAt < weekEnd
    );
  });
  const weeklyZoomPractices = completedThisWeek.filter(
    (session) => session.type === 'group' || session.type === 'group_practice',
  ).length;
  const weeklyIndividualSessions = completedThisWeek.filter(
    (session) => session.type === 'individual' || session.type === 'private',
  ).length;
  const weeklyCompletedBattles = completedThisWeek.filter(
    (session) => session.type === 'battle_review',
  ).length;
  const materialSessions = sessions
    .filter((session) => session.isMyBooking || bookedSessionIds.has(session.id))
    .filter(
      (session) =>
        (Boolean(session.recordingUrl) && session.canViewRecording === true) ||
        Boolean(session.summary) ||
        Boolean(session.outcomeTopic),
    )
    .sort(
      (left, right) =>
        new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime(),
    );

  const handleLogProgress = (args: { sessionId: string; userId: string; day: number; text: string }) => {
    logProgress(args).catch(console.error);
  };
  const handleAcceptBattle = (sessionId: string) => {
    acceptBattle(sessionId).catch(console.error);
  };
  const handleDeclineBattle = (sessionId: string) => {
    declineBattle(sessionId).catch(console.error);
  };
  const profileName = user?.firstName?.trim() || user?.email || userId;
  const profileInitials = profileName.slice(0, 2).toUpperCase();
  const hasAiMentorAccess = !getModuleAccess('AI_MENTOR').isLocked;
  const ownedProducts = accessState?.products.owned ?? [];
  const subscribedProducts = accessState?.products.subscribed.filter((product) => product.status !== 'locked') ?? [];
  const setActiveTab = (tab: UserPanelTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'sessions') next.delete('panel');
    else next.set('panel', tab);
    setSearchParams(next, { replace: true });
  };
  const selectIndividualDate = (dateKey: string) => {
    setIndividualDate(dateKey);
    setIndividualTime('');
    setIndividualQuestion('');
    setIndividualRequestError(null);
  };
  const moveIndividualCalendarMonth = (offset: number) => {
    const nextMonth = new Date(
      individualCalendarMonth.getFullYear(), individualCalendarMonth.getMonth() + offset, 1,
    );
    setIndividualCalendarMonth(nextMonth);
    if (
      individualDate
      && (parseLocalDate(individualDate).getFullYear() !== nextMonth.getFullYear()
        || parseLocalDate(individualDate).getMonth() !== nextMonth.getMonth())
    ) {
      setIndividualDate('');
      setIndividualTime('');
      setIndividualQuestion('');
      setIndividualRequestError(null);
    }
  };
  const closeCreateModal = () => {
    if (isCreatingIndividualRequest) return;
    setCreateAction(null);
    setIndividualRequestError(null);
  };
  const handleIndividualRequest = async () => {
    const dateTime = new Date(individualTime);

    if (
      !individualDate
      || !selectedIndividualSlot?.available
      || Number.isNaN(dateTime.getTime())
      || dateTime <= new Date()
    ) {
      setIndividualRequestError('Обери майбутні дату й час.');
      return;
    }
    if (!individualQuestion.trim()) {
      setIndividualRequestError('Опиши коротко питання або проблему.');
      return;
    }
    try {
      if (import.meta.env.DEV) {
        console.info('[USER_INDIVIDUAL_REQUEST_TRACE]', {
          phase: 'submit',
          scheduledAt: dateTime.toISOString(),
          hasQuestion: true,
          questionLength: individualQuestion.trim().length,
        })
      }
      await createIndividualRequest({
        scheduledAt: dateTime.toISOString(),
        questionText: individualQuestion.trim(),
      }).unwrap();
      setIndividualDate('');
      setIndividualTime('');
      setIndividualQuestion('');
      closeCreateModal();
    } catch (error) {
      if (import.meta.env.DEV) {
        const response =
          error && typeof error === 'object' && 'data' in error
            ? (error as { data?: { error?: unknown; message?: unknown } }).data
            : undefined
        console.info('[USER_INDIVIDUAL_REQUEST_TRACE]', {
          phase: 'rejected',
          status: error && typeof error === 'object' && 'status' in error
            ? (error as { status?: unknown }).status
            : null,
          backendCode: typeof response?.error === 'string' ? response.error : null,
          backendMessage: typeof response?.message === 'string' ? response.message : null,
        })
      }
      const backendCode = error && typeof error === 'object' && 'data' in error
        ? (error as { data?: { error?: unknown } }).data?.error
        : null
      if (backendCode === 'COMMERCE_SLOT_UNAVAILABLE') {
        setIndividualRequestError('Цей час уже зайнятий. Обери інший час.');
        setIndividualTime('');
        void refetchIndividualAvailability();
      } else {
        setIndividualRequestError('Не вдалося створити запит. Спробуй ще раз.');
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-3 px-0.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-sky-300/25 bg-sky-500/15 text-xs font-semibold text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.12)]">
            {profileInitials}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-tight text-[var(--text-primary)]">{profileName}</h1>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Твій простір розвитку</p>
          </div>
        </div>
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-200"
          aria-label="Сповіщення"
        >
          <Bell className="h-3.5 w-3.5" />
        </span>
      </header>

      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.08] bg-black/15 p-1">
        {([
          { id: 'sessions', label: 'Мої сесії' },
          { id: 'progress', label: 'Мій прогрес' },
          { id: 'materials', label: 'Матеріали' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'rounded-lg border px-1.5 py-1.5 text-[11px] font-semibold transition-colors',
              activeTab === tab.id
                ? 'border-sky-300/35 bg-sky-500/18 text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                : 'border-transparent text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sessions' && (
        <section className="min-w-0">
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setCreateAction('menu')}
              className="btn-liquid-primary w-full rounded-[var(--btn-radius)] px-4 py-2.5 text-sm font-semibold"
            >
              + ДОДАТИ СЛОТ
            </button>

          </div>

          {createAction !== null && (
            <BaseModal
              isOpen
              onClose={closeCreateModal}
              overlayClassName="bg-black/70 backdrop-blur-sm"
              containerClassName="z-[100] px-3 py-4"
              panelClassName="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1117] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Нова Zoom-сесія</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {createAction === 'menu' ? 'Обери формат' : createAction === 'group' ? 'Групова практика' : createAction === 'individual' ? 'Індивідуальна сесія' : 'Zoom Battle'}
                    </h2>
                  </div>
                  <button type="button" onClick={closeCreateModal} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-lg text-white/50">×</button>
                </div>

                {createAction === 'menu' && (
                  <div className="mt-5 grid gap-2">
                    <button type="button" onClick={() => setCreateAction('group')} className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-left text-sm font-semibold text-emerald-100">👥 ГРУПОВА</button>
                    <button type="button" onClick={() => setCreateAction('individual')} className="rounded-2xl border border-sky-300/25 bg-sky-500/10 px-4 py-3 text-left text-sm font-semibold text-sky-100">👤 ІНДИВІДУАЛЬНА</button>
                    <button type="button" onClick={() => setCreateAction('battle')} className="rounded-2xl border border-amber-300/25 bg-amber-500/10 px-4 py-3 text-left text-sm font-semibold text-amber-100">⚔️ BATTLE</button>
                  </div>
                )}

                {createAction === 'group' && (
                  <div className="mt-5 space-y-2">
                    <p className="text-sm text-white/60">Обери доступну практику, щоб записатися та додати питання.</p>
                    {displayAvailableSessions.filter((session) => session.type === 'group' || session.type === 'group_practice').map((session) => (
                      <AvailableSessionRow key={session.id} session={session} onSelect={(selected) => { setRequestedUserSession(selected); closeCreateModal(); }} />
                    ))}
                    {displayAvailableSessions.every((session) => session.type !== 'group' && session.type !== 'group_practice') && <p className="py-3 text-sm text-white/45">Наразі немає доступних групових практик.</p>}
                  </div>
                )}

                {createAction === 'individual' && (
                  <div className="mt-5 space-y-4">
                    <section aria-label="Календар індивідуальних сесій" className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          aria-label="Попередній місяць"
                          disabled={individualCalendarMonth.getFullYear() === now.getFullYear() && individualCalendarMonth.getMonth() === now.getMonth()}
                          onClick={() => moveIndividualCalendarMonth(-1)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/75 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <p className="text-center text-sm font-semibold capitalize text-white">{calendarMonthLabel}</p>
                        <button
                          type="button"
                          aria-label="Наступний місяць"
                          onClick={() => moveIndividualCalendarMonth(1)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/75"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {INDIVIDUAL_WEEKDAYS.map((weekday) => (
                          <span key={weekday} className="pb-1 text-[10px] font-semibold uppercase text-white/40">{weekday}</span>
                        ))}
                        {Array.from({ length: calendarOffset }).map((_, index) => <span key={`offset-${index}`} />)}
                        {Array.from({ length: calendarMonthDays }, (_, index) => {
                          const date = new Date(
                            individualCalendarMonth.getFullYear(), individualCalendarMonth.getMonth(), index + 1,
                          );
                          const dateKey = toLocalDateKey(date);
                          const isPast = dateKey < todayKey;
                          const isToday = dateKey === todayKey;
                          const isSelected = dateKey === individualDate;
                          const hasGroup = individualCalendarGroupSessions.some(
                            (session) => toLocalDateKey(new Date(session.scheduledAt)) === dateKey,
                          );
                          const hasOwnBooking = sessions.some((session) =>
                            toLocalDateKey(new Date(session.scheduledAt)) === dateKey
                            && (session.isMyBooking || bookedSessionIds.has(session.id)),
                          );
                          const daySummary = individualAvailabilitySummary.find((day) => day.date === dateKey);
                          const hasKnownAvailability = daySummary?.hasAvailableIndividual === true;
                          const hasKnownUnavailable = daySummary !== undefined && !daySummary.hasAvailableIndividual;
                          return (
                            <button
                              key={dateKey}
                              type="button"
                              disabled={isPast}
                              aria-pressed={isSelected}
                              aria-label={formatIndividualDate(dateKey)}
                              onClick={() => selectIndividualDate(dateKey)}
                              className={[
                                'relative flex min-h-11 flex-col items-center justify-center rounded-xl border text-xs font-semibold transition-colors',
                                isSelected
                                  ? 'border-sky-200 bg-slate-800 text-white'
                                  : isPast
                                    ? 'cursor-not-allowed border-transparent text-white/20'
                                    : isToday
                                      ? 'border-sky-300/35 bg-sky-500/10 text-sky-100'
                                      : 'border-transparent text-white/75 hover:border-white/15 hover:bg-white/[0.05]',
                              ].join(' ')}
                            >
                              <span>{index + 1}</span>
                              <span className="mt-0.5 flex h-2 items-center gap-0.5" aria-hidden="true">
                                {hasKnownAvailability && <i className="h-1.5 w-1.5 rounded-full bg-emerald-300" />}
                                {hasKnownUnavailable && <i className="text-[8px] not-italic text-white/45">×</i>}
                                {hasGroup && <i className="text-[8px] not-italic text-amber-200">G</i>}
                                {hasOwnBooking && <i className="text-[8px] not-italic text-sky-200">✓</i>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {!individualDate && <p className="text-sm text-white/45">Обери дату, щоб побачити доступний час.</p>}
                    {individualDate && (
                      <section aria-live="polite" className="space-y-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Обрана дата</p>
                          <p className="mt-1 text-sm font-semibold capitalize text-white">{formatIndividualDate(individualDate)}</p>
                          {!isFetchingIndividualAvailability && !isIndividualAvailabilityError && individualAvailability.length > 0 && (
                            <p className="mt-1 text-xs text-white/55">Індивідуальні години · вільно: {individualFreeSlotCount}</p>
                          )}
                        </div>

                        {isFetchingIndividualAvailability && (
                          <div className="grid grid-cols-2 gap-2" aria-label="Завантажуємо доступний час">
                            {[0, 1, 2, 3].map((index) => <span key={index} className="h-14 animate-pulse rounded-xl bg-white/[0.06]" />)}
                          </div>
                        )}
                        {isIndividualAvailabilityError && (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                            <span>Не вдалося завантажити доступний час.</span>
                            <button type="button" onClick={() => void refetchIndividualAvailability()} className="rounded-lg border border-amber-200/25 px-2 py-1 text-xs font-semibold">Повторити</button>
                          </div>
                        )}
                        {!isFetchingIndividualAvailability && !isIndividualAvailabilityError && individualAvailability.length === 0 && selectedIndividualDaySummary?.hasIndividualWindow === false && (
                          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/55">Коуч ще не відкрив доступні години на цю дату.</p>
                        )}
                        {!isFetchingIndividualAvailability && !isIndividualAvailabilityError && (hasOnlyBusyIndividualSlots || (selectedIndividualDaySummary?.hasIndividualWindow === true && selectedIndividualDaySummary.availableCount === 0)) && (
                          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/55">На цю дату всі індивідуальні слоти зайняті.</p>
                        )}
                        {!isFetchingIndividualAvailability && !isIndividualAvailabilityError && individualAvailability.length > 0 && (
                          <div className="grid grid-cols-2 gap-2" aria-label="Доступний час">
                            {individualAvailability.map((slot) => {
                              const selected = individualTime === slot.scheduledAt;
                              return (
                                <button
                                  key={slot.scheduledAt}
                                  type="button"
                                  disabled={!slot.available}
                                  onClick={() => {
                                    setIndividualTime(slot.scheduledAt);
                                    setIndividualRequestError(null);
                                  }}
                                  className={[
                                    'min-h-14 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors',
                                    selected
                                      ? 'border-sky-200 bg-slate-800 text-white'
                                      : slot.available
                                        ? 'border-sky-300/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20'
                                        : 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/45',
                                  ].join(' ')}
                                >
                                  <span className="block">{formatIndividualTime(slot.scheduledAt)}</span>
                                  <span className="mt-0.5 block text-[10px] font-medium text-inherit opacity-70">
                                    {slot.available ? 'Вільно' : 'Зайнято'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {individualCalendarGroupSessions
                          .filter((session) => toLocalDateKey(new Date(session.scheduledAt)) === individualDate)
                          .map((session) => (
                            <div key={session.id} className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">Групова практика</p>
                              <p className="mt-1 text-sm font-semibold text-white">{session.topic}</p>
                              <p className="mt-1 text-xs text-white/60">{fmtDateTime(session.scheduledAt)}</p>
                              {session.isMyBooking || bookedSessionIds.has(session.id) ? (
                                <p className="mt-2 text-xs font-semibold text-sky-200">✓ ВАШ ЗАПИС</p>
                              ) : (
                                <button type="button" onClick={() => { setRequestedUserSession(session); closeCreateModal(); }} className="mt-2 rounded-lg border border-amber-200/25 px-3 py-1.5 text-xs font-semibold text-amber-100">Записатися</button>
                              )}
                            </div>
                          ))}
                      </section>
                    )}

                    {selectedIndividualSlot?.available && (
                      <>
                        <section className="rounded-2xl border border-sky-300/25 bg-sky-500/10 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">Обраний час</p>
                          <p className="mt-1 text-sm font-semibold capitalize text-white">{formatIndividualDate(individualDate)}</p>
                          <p className="mt-1 text-lg font-semibold text-sky-100">
                            {formatIndividualTime(selectedIndividualSlot.scheduledAt)}–{formatIndividualTime(new Date(new Date(selectedIndividualSlot.scheduledAt).getTime() + 60 * 60 * 1000).toISOString())}
                          </p>
                          <p className="text-xs text-white/60">60 хв</p>
                        </section>
                        <label className="block text-sm text-white/75">Питання або проблема<textarea value={individualQuestion} onChange={(event) => {
                          setIndividualQuestion(event.target.value);
                          setIndividualRequestError(null);
                        }} rows={4} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white" /></label>
                        {individualRequestError && <p className="text-sm text-amber-300">{individualRequestError}</p>}
                        <button type="button" onClick={() => void handleIndividualRequest()} disabled={!canSubmitIndividualRequest || isCreatingIndividualRequest} className="btn-liquid-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50">{isCreatingIndividualRequest ? 'Створюємо…' : 'Продовжити'}</button>
                      </>
                    )}
                  </div>
                )}

                {createAction === 'battle' && <div className="mt-5"><BattleCallSection userId={userId} onOpenInstructions={() => setInstructionsOpen(true)} /></div>}
              </div>
            </BaseModal>
          )}

          <ZoomCalendar
            mode="user"
            userId={userId}
            sessionSource={{ from: monthStart, to: monthEnd, sessions }}
            requestedUserSession={requestedUserSession}
            onRequestedUserSessionHandled={() => setRequestedUserSession(null)}
          />
        </section>
      )}

      {activeTab === 'progress' && !zoomAccess?.hasFocus && (
        <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-10 text-center">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Мої цілі</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {isAccessLoading ? 'Перевіряємо доступ…' : 'Цілі FOCUS недоступні для поточного доступу'}
          </p>
        </section>
      )}

      {activeTab === 'progress' && zoomAccess?.hasFocus && (
        <section className="flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Мій прогрес</h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Твоя активність і результати у Starway</p>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-1">
            {([
              { id: 'overview', label: 'Загальний' },
              { id: 'goals', label: 'Цілі' },
              { id: 'statistics', label: 'Статистика' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveProgressTab(tab.id)}
                className={[
                  'rounded-lg px-2 py-2 text-xs font-semibold transition-colors',
                  activeProgressTab === tab.id
                    ? 'bg-[rgb(var(--accent-soft-rgb))]/20 text-[rgb(var(--accent-soft-rgb))]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeProgressTab === 'overview' && (
            <div className="rounded-2xl border border-[rgb(var(--accent-soft-rgb))]/25 bg-[radial-gradient(circle_at_top_right,rgb(var(--accent-soft-rgb)/0.16),transparent_48%),var(--glass-bg)] p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Твій рівень</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold text-[var(--text-primary)]">
                    {myStats?.level ?? '—'}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Рівень</p>
                </div>
                <p className="text-sm font-semibold text-[rgb(var(--accent-soft-rgb))]">
                  {myStats?.mindXP ?? 0} XP
                </p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-label="XP progress">
                <div className="h-full w-0 rounded-full bg-[rgb(var(--accent-soft-rgb))]" />
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">Поріг наступного рівня недоступний</p>
            </div>
          )}

          {(activeProgressTab === 'overview' || activeProgressTab === 'statistics') && (
            <>
              <section>
                <SectionLabel label="ЦЬОГО ТИЖНЯ" />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Zoom-практики', value: weeklyZoomPractices },
                    { label: 'Індивідуальні сесії', value: weeklyIndividualSessions },
                    { label: 'Завдання виконано', value: '—' },
                    { label: 'Battle завершено', value: weeklyCompletedBattles },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-3">
                      <p className="text-2xl font-semibold text-[var(--text-primary)]">{metric.value}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <SectionLabel label="МОЇ РЕЗУЛЬТАТИ" />
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-3">
                  {[
                    { label: 'Mind XP', value: myStats?.mindXP ?? 0 },
                    { label: 'Battle wins', value: myStats?.battleWins ?? 0 },
                    { label: 'Рівень', value: myStats?.level ?? '—' },
                  ].map((result) => (
                    <div key={result.label} className="text-center">
                      <p className="text-xl font-semibold text-[var(--text-primary)]">{result.value}</p>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">{result.label}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {(activeProgressTab === 'overview' || activeProgressTab === 'goals') && (
            <section>
              <SectionLabel label="ПОТОЧНІ ЦІЛІ" />
              <div className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--glass-bg)] p-4 text-center text-xs text-[var(--text-muted)]">
                Немає активних цілей
              </div>
            </section>
          )}

          {activeProgressTab === 'overview' && (
            <section>
              <SectionLabel label="ОСТАННІ ДОСЯГНЕННЯ" />
              <div className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--glass-bg)] p-4 text-center text-xs text-[var(--text-muted)]">
                Досягнення ще не зафіксовані
              </div>
            </section>
          )}
        </section>
      )}

      {activeTab === 'materials' && (
        <section className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Матеріали</h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Записи та підсумки твоїх Zoom-сесій</p>
          </div>

          {materialSessions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {materialSessions.map((session) => (
                <article
                  key={session.id}
                  className="rounded-2xl border border-sky-400/15 bg-[linear-gradient(145deg,rgba(15,36,63,0.92),rgba(7,18,35,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {session.topic}
                      </p>
                      <p className="mt-1 text-[11px] text-sky-200/65">
                        {fmtDateTime(session.scheduledAt)} · {getSessionMeta(session)}
                      </p>
                    </div>
                    <span className="flex-shrink-0 rounded-full border border-sky-300/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
                      Матеріал
                    </span>
                  </div>

                  {session.outcomeTopic && (
                    <p className="mt-3 text-xs font-medium text-[var(--text-secondary)]">
                      {session.outcomeTopic}
                    </p>
                  )}
                  {session.summary && (
                    <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                      {session.summary}
                    </p>
                  )}
                  {session.recordingUrl && session.canViewRecording === true && (
                    <a
                      href={session.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-sky-300/25 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-500/25"
                    >
                      Відкрити запис
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-sky-300/15 bg-[linear-gradient(145deg,rgba(15,36,63,0.72),rgba(7,18,35,0.82))] px-4 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Матеріалів поки немає</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Тут зʼявляться доступні записи та підсумки твоїх сесій
              </p>
            </div>
          )}
        </section>
      )}

      {activeTab === 'ai' && (
        <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-10 text-center">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">AI-агенти</h1>
          {hasAiMentorAccess ? (
            <>
              <p className="mt-2 text-sm text-[var(--text-muted)]">AI-агенти доступні у твоєму продукті</p>
              <Link
                to="/miniapp/mentor"
                className="mt-4 inline-flex rounded-xl border border-sky-300/30 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100"
              >
                Відкрити AI-агенти
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {isAccessLoading ? 'Перевіряємо доступ…' : 'AI-агенти недоступні для поточного доступу'}
            </p>
          )}
        </section>
      )}

      {activeTab === 'more' && (
        <section className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Ще</h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Профіль, налаштування та доступи</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Профіль</p>
            <p className="mt-2 text-sm font-semibold text-white">{profileName}</p>
            {user?.email && <p className="mt-1 text-xs text-white/45">{user.email}</p>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Налаштування</p>
            <div className="mt-2 grid gap-1 text-xs text-white/55">
              <p>Мова: {user?.settings?.language ?? 'За замовчуванням'}</p>
              <p>Сповіщення: {user?.settings?.notifications?.enabled === false ? 'Вимкнено' : 'Увімкнено'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Мої доступи</p>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              {zoomAccess?.hasFocus && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-sky-500/10 px-3 py-2 text-sky-100">
                  <span>FOCUS</span>
                  <span className="text-[11px] font-semibold">Доступ активний</span>
                </div>
              )}
              {ownedProducts.map((product) => (
                <div key={`owned-${product.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2 text-white/75">
                  <span className="min-w-0 truncate">{product.name}</span>
                  <span className="flex-shrink-0 text-[11px] text-white/45">{product.status ?? 'У власності'}</span>
                </div>
              ))}
              {subscribedProducts.map((product) => (
                <div key={`subscribed-${product.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2 text-white/75">
                  <span className="min-w-0 truncate">{product.name}</span>
                  <span className="flex-shrink-0 text-[11px] text-white/45">{product.status}</span>
                </div>
              ))}
              {!isAccessLoading && !zoomAccess?.hasFocus && ownedProducts.length === 0 && subscribedProducts.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-xs text-white/40">
                  Активних продуктових доступів немає
                </p>
              )}
              {isAccessLoading && <p className="text-xs text-white/40">Перевіряємо доступи…</p>}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'rewards' && rewardDetailsOpen && myStats && (
        <section className="flex flex-col gap-5">
          <button
            type="button"
            onClick={() => setRewardDetailsOpen(false)}
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-sky-200"
          >
            <span aria-hidden="true">←</span>
            Назад
          </button>

          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Деталі нагороди</h1>
          </div>

          <div className="flex min-h-52 items-center justify-center rounded-3xl border border-sky-400/20 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.24),transparent_46%),linear-gradient(145deg,rgba(15,36,63,0.96),rgba(7,18,35,0.99))]">
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-sky-300/30 bg-sky-400/10 shadow-[0_0_48px_rgba(56,189,248,0.18)]">
              <span className="text-4xl font-semibold text-sky-100">{myStats.level}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-sky-200/65">рівень</span>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Рівень {myStats.level}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Опис нагороди недоступний</p>
            <p className="mt-2 text-xs font-semibold text-sky-200">{myStats.mindXP} XP</p>
          </div>

          <section>
            <SectionLabel label="ЩО ЦЕ ДАЄ?" />
            <div className="rounded-xl border border-dashed border-sky-400/15 bg-[rgba(8,24,45,0.72)] p-4 text-center text-xs text-[var(--text-muted)]">
              Дані про переваги цієї нагороди відсутні
            </div>
          </section>

          <section>
            <SectionLabel label="РЕКОМЕНДАЦІЇ" />
            <div className="rounded-xl border border-dashed border-sky-400/15 bg-[rgba(8,24,45,0.72)] p-4 text-center text-xs text-[var(--text-muted)]">
              Персональні рекомендації недоступні
            </div>
          </section>

          <button
            type="button"
            onClick={() => {
              setRewardDetailsOpen(false);
              setActiveTab('progress');
            }}
            className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,165,233,0.22)] transition-colors hover:bg-sky-400"
          >
            До мого прогресу
          </button>
        </section>
      )}

      {activeTab === 'rewards' && !rewardDetailsOpen && (
        <section className="flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Нагороди</h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Твої досягнення, бонуси та рівні</p>
          </div>

          <div className="grid grid-cols-4 gap-1 rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-1">
            {([
              { id: 'all', label: 'Усі' },
              { id: 'achievements', label: 'Досягнення' },
              { id: 'bonuses', label: 'Бонуси' },
              { id: 'levels', label: 'Рівні' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveRewardsTab(tab.id)}
                className={[
                  'min-w-0 rounded-lg px-1 py-2 text-[11px] font-semibold transition-colors',
                  activeRewardsTab === tab.id
                    ? 'bg-sky-500/20 text-sky-200'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(activeRewardsTab === 'all' || activeRewardsTab === 'levels') && (
            <button
              type="button"
              onClick={() => setRewardDetailsOpen(true)}
              disabled={!myStats}
              className="w-full rounded-2xl border border-sky-400/20 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_48%),linear-gradient(145deg,rgba(15,36,63,0.94),rgba(7,18,35,0.98))] p-4 text-left disabled:cursor-default"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-200/65">Твій поточний рівень</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold text-[var(--text-primary)]">{myStats?.level ?? '—'}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Рівень</p>
                </div>
                <p className="text-sm font-semibold text-sky-200">{myStats?.mindXP ?? 0} XP</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-label="Rewards XP progress">
                <div className="h-full w-0 rounded-full bg-sky-400" />
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">Поріг наступного рівня недоступний</p>
            </button>
          )}

          {(activeRewardsTab === 'all' || activeRewardsTab === 'achievements') && (
            <section>
              <SectionLabel label="ОТРИМАНІ НАГОРОДИ" />
              <div className="rounded-xl border border-dashed border-sky-400/15 bg-[rgba(8,24,45,0.72)] p-4 text-center text-xs text-[var(--text-muted)]">
                Отримані нагороди ще не зафіксовані
              </div>
            </section>
          )}

          {(activeRewardsTab === 'all' || activeRewardsTab === 'achievements' || activeRewardsTab === 'levels') && (
            <section>
              <SectionLabel label="НАСТУПНІ НАГОРОДИ" />
              <div className="rounded-xl border border-white/10 bg-[rgba(8,24,45,0.72)] p-4 text-center">
                <span className="text-lg text-white/35" aria-hidden="true">🔒</span>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Умови наступних нагород недоступні</p>
              </div>
            </section>
          )}

          {(activeRewardsTab === 'all' || activeRewardsTab === 'bonuses') && (
            <section>
              <SectionLabel label="БОНУСИ ДЛЯ ТЕБЕ" />
              <div className="rounded-xl border border-dashed border-sky-400/15 bg-[rgba(8,24,45,0.72)] p-4 text-center text-xs text-[var(--text-muted)]">
                Доступних бонусів немає
              </div>
            </section>
          )}
        </section>
      )}
    </div>
  );
}
