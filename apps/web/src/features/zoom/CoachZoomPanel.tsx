// apps/web/src/features/zoom/CoachZoomPanel.tsx

import { useEffect, useRef, useState } from 'react';
import {
  useGetCalendarSessionsQuery,
  useGetLeaderboardQuery,
  useFinalizeBattleMutation,
  useCreateZoomSessionMutation,
} from './zoom.api';
import type { LeaderboardEntry, ZoomCalendarSession, ZoomSessionType } from './zoom.types';
import ZoomCalendar from './ZoomCalendar';
import { ZoomAvailabilityEditor } from './ZoomAvailabilityEditor';
import { useAppSelector } from '@/app/hooks';

// ── Types ─────────────────────────────────────────────────────────────────────

type BattleOutcome = 'challenger' | 'opponent' | 'both' | 'none';

interface BattleSession extends ZoomCalendarSession {
  challengerName?: string;
  opponentName?: string;
  progressA?: number;
  progressB?: number;
  explicitDay?: number;
  goalA?: string;
  goalB?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<ZoomSessionType, string> = {
  group_practice: '👥',
  individual:     '👤',
  intensive:      '⚡',
  battle_review:  '⚔',
};
const TYPE_LABEL: Record<ZoomSessionType, string> = {
  group_practice: 'Групова',
  individual:     'Індивідуальна',
  intensive:      'Інтенсив',
  battle_review:  'Battle',
};
const TYPE_ICON_BG: Record<ZoomSessionType, string> = {
  group_practice: 'bg-purple-500/20 text-purple-400',
  individual:     'bg-teal-500/20 text-teal-400',
  intensive:      'bg-blue-500/20 text-blue-400',
  battle_review:  'bg-amber-500/20 text-amber-400',
};
const TYPE_BADGE: Record<ZoomSessionType, string> = {
  group_practice: 'bg-purple-500/20 text-purple-300',
  individual:     'bg-teal-500/20 text-teal-300',
  intensive:      'bg-blue-500/20 text-blue-300',
  battle_review:  'bg-amber-500/20 text-amber-300',
};

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_SESSIONS: ZoomCalendarSession[] = [
  {
    id: 'mock-1',
    scheduledAt: (() => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay() + 1) % 7 || 7)); d.setHours(19, 0, 0, 0); return d.toISOString(); })(),
    topic: 'ФОКУС · Zoom-практика',
    status: 'SCHEDULED',
    type: 'group_practice',
    zoomLink: '',
    attendeesCount: 0,
    notifiedAt24h: null,
    notifiedAt2h: null,
    goalText: null,
    canEdit: true,
  },
  {
    id: 'mock-2',
    scheduledAt: (() => { const d = new Date(); d.setDate(d.getDate() + 9); d.setHours(11, 0, 0, 0); return d.toISOString(); })(),
    topic: 'Індивідуальна стратегічна сесія',
    status: 'SCHEDULED',
    type: 'individual',
    zoomLink: 'https://zoom.us/j/123456',
    attendeesCount: 1,
    notifiedAt24h: new Date().toISOString(),
    notifiedAt2h: null,
    goalText: null,
    canEdit: true,
  },
];

const MOCK_BATTLES: BattleSession[] = [
  {
    id: 'mock-b1',
    scheduledAt: (() => { const d = new Date(); d.setDate(d.getDate() + 5); d.setHours(18, 0, 0, 0); return d.toISOString(); })(),
    topic: 'Battle Review',
    status: 'SCHEDULED',
    type: 'battle_review',
    zoomLink: '',
    canEdit: true,
    challengerName: '@oksana',
    opponentName: '@mariia_v',
    goalA: 'Запустити сторінку продукту',
    goalB: 'Написати 3 пости за тиждень',
    progressA: 70,
    progressB: 40,
    explicitDay: 5,
  },
];

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

function SectionLabel({
  label,
  count,
  collapsible = false,
  open = false,
  onToggle,
  demo = false,
}: {
  label: string;
  count?: number;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  demo?: boolean;
}) {
  return (
    <div
      className={['flex items-center justify-between mb-3', collapsible ? 'cursor-pointer select-none' : ''].join(' ')}
      onClick={collapsible ? onToggle : undefined}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))] flex items-center">
        {label}
        {count !== undefined ? ` · ${count}` : ''}
        {demo && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ml-2 normal-case tracking-normal font-medium">
            демо
          </span>
        )}
      </p>
      {collapsible && (
        <svg
          viewBox="0 0 16 16"
          className={['w-4 h-4 text-[rgb(var(--accent-soft-rgb))]/40 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// ── UpcomingSessionCard ───────────────────────────────────────────────────────

function UpcomingSessionCard({ session }: { session: ZoomCalendarSession }) {
  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-3">
      <div className="flex items-center gap-3">
        <span className={['w-9 h-9 rounded-full flex items-center justify-center text-[16px] flex-shrink-0', TYPE_ICON_BG[session.type]].join(' ')}>
          {TYPE_ICON[session.type]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{session.topic}</p>
            <span className={['inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', TYPE_BADGE[session.type]].join(' ')}>
              {TYPE_LABEL[session.type]}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {fmtDateTime(session.scheduledAt)}
            {session.attendeesCount !== undefined && ` · ${session.attendeesCount} учасн.`}
          </p>
        </div>
        <button className="text-xs px-2 py-1 rounded-lg border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0 transition-colors">
          Ред.
        </button>
      </div>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {session.notifiedAt24h ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">✓ -24h відправлено</span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">⏳ -24h заплановано</span>
        )}
        {session.zoomLink ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">✓ Zoom є</span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">⚠ Zoom-посилання немає</span>
        )}
      </div>
    </div>
  );
}

// ── BattleCard ────────────────────────────────────────────────────────────────

function BattleCard({
  session,
  onFinalize,
}: {
  session: BattleSession;
  onFinalize: (id: string, outcome: BattleOutcome) => void;
}) {
  const progARef = useRef<HTMLDivElement>(null);
  const progBRef = useRef<HTMLDivElement>(null);

  const startedAt = new Date(session.scheduledAt).getTime() - 7 * 24 * 60 * 60 * 1000;
  const elapsed = Math.min(Date.now() - startedAt, 7 * 24 * 60 * 60 * 1000);
  const timePct = Math.round((elapsed / (7 * 24 * 60 * 60 * 1000)) * 100);

  const pctA = session.progressA ?? timePct;
  const pctB = session.progressB ?? timePct;
  const day = session.explicitDay ?? Math.min(Math.ceil(elapsed / (24 * 60 * 60 * 1000)), 7);
  const labelA = session.challengerName ?? 'A';
  const labelB = session.opponentName ?? 'Б';
  const goalAText = session.goalA ?? session.goalText;
  const goalBText = session.goalB;

  useEffect(() => {
    progARef.current?.style.setProperty('--prog-a', `${pctA}%`);
  }, [pctA]);

  useEffect(() => {
    progBRef.current?.style.setProperty('--prog-b', `${pctB}%`);
  }, [pctB]);

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm flex-shrink-0">⚔</span>
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{session.topic}</p>
          <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium flex-shrink-0">battle</span>
          <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0">День {day}/7</span>
        </div>
        <button
          onClick={() => onFinalize(session.id, 'challenger')}
          className="btn-liquid-primary inline-flex items-center text-[11px] font-semibold px-3 py-1 rounded-[var(--btn-radius)] flex-shrink-0"
        >
          Фінал
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <div>
          <p className="text-[11px] text-[var(--text-muted)] mb-1 truncate">
            {labelA}{goalAText ? ` — ${goalAText}` : ''}
          </p>
          <div className="h-1.5 rounded-full bg-[var(--border-primary)] overflow-hidden">
            <div ref={progARef} className="h-full rounded-full bg-purple-500 [width:var(--prog-a,0%)] transition-all duration-500" />
          </div>
        </div>
        <div>
          <p className="text-[11px] text-[var(--text-muted)] mb-1 truncate">
            {labelB}{goalBText ? ` — ${goalBText}` : ''}
          </p>
          <div className="h-1.5 rounded-full bg-[var(--border-primary)] overflow-hidden">
            <div ref={progBRef} className="h-full rounded-full bg-red-500 [width:var(--prog-b,0%)] transition-all duration-500" />
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mt-2 flex-wrap">
        {(['challenger', 'opponent', 'both', 'none'] as BattleOutcome[]).map(o => (
          <button
            key={o}
            onClick={() => onFinalize(session.id, o)}
            className="py-1 px-2.5 rounded-lg border border-[var(--border-primary)] bg-transparent text-[11px] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] transition-all"
          >
            {o === 'challenger' ? `${labelA} виконала` : o === 'opponent' ? `${labelB} виконала` : o === 'both' ? 'Обидва' : 'Ніхто'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── LeaderboardRow ────────────────────────────────────────────────────────────

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const rankLabel = rank < 3 ? RANK_EMOJI[rank] : `${rank + 1}`;
  const initials = entry.userId.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2 py-2 border-b border-[var(--border-primary)] last:border-b-0">
      <span className="text-[13px] w-6 text-center flex-shrink-0">{rankLabel}</span>
      <span className="w-7 h-7 rounded-full bg-purple-500/15 text-purple-300 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
        {initials}
      </span>
      <span className="flex-1 text-sm text-[var(--text-secondary)] truncate">@{entry.userId.slice(0, 10)}…</span>
      <span className="text-xs text-[rgb(var(--accent-soft-rgb))] font-semibold flex-shrink-0">
        {entry.battleWins} · {entry.mindXP} XP
      </span>
    </div>
  );
}

// ── CoachZoomPanel ────────────────────────────────────────────────────────────

export interface CoachZoomPanelProps {
  expertId: string;
}

export function CoachZoomPanel({ expertId }: CoachZoomPanelProps) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: sessions = [] } = useGetCalendarSessionsQuery({ from: monthStart, to: monthEnd, role: 'coach', userId: expertId });
  const { data: leaderboard = [] } = useGetLeaderboardQuery();
  const [finalize] = useFinalizeBattleMutation();
  const [createSession, { isLoading: isCreating }] = useCreateZoomSessionMutation();

  const [battlesOpen, setBattlesOpen] = useState(true);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);

  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('19:00');
  const [formTopic, setFormTopic] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formType, setFormType] = useState<ZoomSessionType>('group_practice');

  const activeBattles = sessions.filter(
    s => s.type === 'battle_review' && s.status !== 'COMPLETED' && s.status !== 'CANCELLED',
  );
  const upcomingSessions = sessions
    .filter(s => s.type !== 'battle_review' && s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && new Date(s.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  const isMockSessions  = sessions.length === 0;
  const isMockBattles   = activeBattles.length === 0;
  const isMockLeaderboard = leaderboard.length === 0;

  const displayUpcoming: ZoomCalendarSession[] = isMockSessions ? MOCK_SESSIONS : upcomingSessions;
  const displayBattles: BattleSession[] = isMockBattles ? MOCK_BATTLES : (activeBattles as BattleSession[]);
  const displayLeaderboard: LeaderboardEntry[] = isMockLeaderboard ? MOCK_LEADERBOARD : leaderboard;

  const handleFinalize = (sessionId: string, outcome: BattleOutcome) => {
    finalize({ sessionId, outcome }).catch(console.error);
  };
const user = useAppSelector((s) => s.auth.user)

const previewRole =
  user?.activeRole ?? user?.role ?? 'USER'

const canManageZoom =
  previewRole === 'EXPERT' ||
  previewRole === 'ADMIN' ||
  previewRole === 'SUPERADMIN'
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const [d, m, y] = formDate.split('.').map(Number);
    const [h, mi] = formTime.split(':').map(Number);
    const dt = new Date(y, m - 1, d, h, mi, 0);
    await createSession({ scheduledAt: dt.toISOString(), topic: formTopic, type: formType, zoomLink: formLink || undefined }).unwrap();
    setFormDate(''); setFormTopic(''); setFormLink('');
  };

  return (
    <div className="flex flex-col gap-6">

      {/* 1. Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">📅 Панель коуча</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Nadya Ivaskiv · Starway Studio</p>
        </div>
        <a
          href="#coach-create-form"
          className="btn-liquid-primary inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-[var(--btn-radius)] flex-shrink-0"
        >
          + Нова сесія
        </a>
      </div>

      {/* 2. Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'СЕСІЙ / МІСЯЦЬ', value: displayUpcoming.filter(s => s.type !== 'battle_review').length },
          { label: 'АКТИВНИХ BATTLES', value: displayBattles.length },
          { label: 'TOP XP', value: displayLeaderboard[0]?.mindXP ?? '—' },
          { label: 'УЧАСНИКИ', value: displayLeaderboard.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[var(--glass-bg)] rounded-xl p-4 border border-[var(--border-primary)]">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">{label}</p>
            <p className="text-3xl font-semibold text-[var(--text-primary)] leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* 3. Calendar */}
      <section>
        <SectionLabel label="КАЛЕНДАР СЕСІЙ" />
        <ZoomCalendar mode="coach" userId={expertId} />
      </section>

      {/* 4. Availability template (collapsible) */}
      <section>
        <SectionLabel label="ШАБЛОН РОЗКЛАДУ" collapsible open={isAvailabilityOpen} onToggle={() => setIsAvailabilityOpen(o => !o)} />
        {isAvailabilityOpen && <ZoomAvailabilityEditor />}
      </section>

      {/* 5. Upcoming sessions */}
      <section>
        <SectionLabel label="НАЙБЛИЖЧІ СЕСІЇ" count={displayUpcoming.length} demo={isMockSessions} />
        {displayUpcoming.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-1">Немає запланованих сесій</p>
        ) : (
          <div className="flex flex-col gap-2">
            {displayUpcoming.map(s => <UpcomingSessionCard key={s.id} session={s} />)}
          </div>
        )}
      </section>

      {/* 6. Active battles (collapsible) */}
      <section>
        <SectionLabel
          label="АКТИВНІ BATTLES"
          count={displayBattles.length}
          collapsible
          open={battlesOpen}
          onToggle={() => setBattlesOpen(o => !o)}
          demo={isMockBattles}
        />
        {battlesOpen && (
          displayBattles.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-1">Battles ще не розпочато</p>
          ) : (
            <div className="flex flex-col gap-2">
              {displayBattles.map(s => <BattleCard key={s.id} session={s} onFinalize={handleFinalize} />)}
            </div>
          )
        )}
      </section>

      {/* 7. Leaderboard (collapsible) */}
      <section>
        <SectionLabel
          label="LEADERBOARD — BATTLE WINS"
          collapsible
          open={leaderboardOpen}
          onToggle={() => setLeaderboardOpen(o => !o)}
          demo={isMockLeaderboard}
        />
        {leaderboardOpen && (
          displayLeaderboard.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-1">Поки що немає battle перемог</p>
          ) : (
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] px-3 py-1">
              {displayLeaderboard.map((e, i) => <LeaderboardRow key={e.userId} entry={e} rank={i} />)}
            </div>
          )
        )}
      </section>
      {/* 8. Create session form */}
{canManageZoom && (
      <section id="coach-create-form">
        <SectionLabel label="НОВА СЕСІЯ" />
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-4 flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Дата ДД.ММ.РРРР</label>
              <input className="input-glass text-sm" value={formDate} onChange={e => setFormDate(e.target.value)} placeholder="29.05.2026" required />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Час HH:MM</label>
              <input className="input-glass text-sm" value={formTime} onChange={e => setFormTime(e.target.value)} placeholder="19:00" required />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Тема</label>
            <input className="input-glass text-sm" value={formTopic} onChange={e => setFormTopic(e.target.value)} placeholder="Щотижнева сесія балансу" required />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Zoom-посилання</label>
            <input className="input-glass text-sm" value={formLink} onChange={e => setFormLink(e.target.value)} placeholder="https://zoom.us/j/..." type="url" />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Тип</label>
            <select className="input-glass text-sm" value={formType} onChange={e => setFormType(e.target.value as ZoomSessionType)}>
              <option value="group_practice">Групова практика</option>
              <option value="individual">Індивідуальна</option>
              <option value="intensive">Інтенсив</option>
              <option value="battle_review">Battle</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="btn-liquid-primary w-full inline-flex items-center justify-center text-sm font-semibold py-2.5 rounded-[var(--btn-radius)] disabled:opacity-50"
          >
            {isCreating ? 'Створення...' : '+ Створити сесію'}
          </button>
        </form>
      </section>
)}
    </div>
  );
}
