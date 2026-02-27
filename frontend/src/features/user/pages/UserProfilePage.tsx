// frontend/src/features/user/pages/UserProfilePage.tsx

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSystemState } from '@/shared/access/hooks/useSystemState';
import UserDeliveryChannelsCard from '@/features/user/components/UserDeliveryChannelsCard';
import UserProductRolesPanel from '@/features/user/components/UserProductRolesPanel';
import UserProgress from '@/features/user/components/UserProgress';
import UserSettingsCard from '@/features/user/components/UserSettingsCard';
import UserStats from '@/features/user/components/UserStats';
import { ModuleIntro } from '@/shared/components/ModuleIntro';
import { ModuleUsageCounter } from '@/shared/components/ModuleUsageCounter';
import { GlassCard } from '@/ui';
import { Crown, LogOut, UserRound, TrendingUp, Trophy } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'history' | 'badges';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Огляд',      icon: '◉' },
  { id: 'history',  label: 'Динаміка',   icon: '↗' },
  { id: 'badges',   label: 'Досягнення', icon: '🏆' },
];

const BADGES_STATIC = [
  { id: 1, icon: '🔥', label: '12 днів поспіль',      earned: true  },
  { id: 2, icon: '🎯', label: 'Перша сесія',           earned: true  },
  { id: 3, icon: '💎', label: '50 сесій',              earned: false },
  { id: 4, icon: '🌟', label: 'Топ-10',                earned: false },
  { id: 5, icon: '🧠', label: 'AI-аналіз x5',         earned: true  },
  { id: 6, icon: '🏆', label: 'Місяць без пропусків',  earned: false },
];

const HISTORY_STATIC = [
  { month: 'Вер', points: 820  },
  { month: 'Жов', points: 1140 },
  { month: 'Лис', points: 980  },
  { month: 'Гру', points: 1560 },
  { month: 'Січ', points: 2100 },
  { month: 'Лют', points: 3480 },
];

const RECENT_STATIC = [
  { id: 1, icon: '🎡', text: 'Колесо балансу заповнено', points: +80,  time: '2 год тому' },
  { id: 2, icon: '🤖', text: 'AI-аналіз згенеровано',   points: +120, time: 'вчора'       },
  { id: 3, icon: '📝', text: 'Профіль оновлено',        points: +20,  time: '3 дні тому'  },
  { id: 4, icon: '🎯', text: 'Сесія проведена',         points: +150, time: '5 днів тому' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const cls =
    plan === 'paid'  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'  :
    plan === 'trial' ? 'bg-blue-500/15  text-blue-400  border-blue-500/30'   :
                       'bg-white/5 text-white/40 border-white/10';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${cls}`}>
      <Crown className="w-3.5 h-3.5" />
      {plan === 'paid' ? 'Premium' : plan === 'trial' ? 'Trial' : 'Free'}
    </span>
  );
}

// animated counter
function AnimNum({ target, duration = 1000 }: { target: number; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const raf = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setV(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [target, duration]);
  return <>{v.toLocaleString('uk-UA')}</>;
}

// SVG ring
function Ring({ value, max, size = 72, color, label, sub }: {
  value: number; max: number; size?: number; color: string; label: string; sub: string;
}) {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const [dash, setDash] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDash((Math.min(value, max) / max) * circ), 120);
    return () => clearTimeout(t);
  }, [value, max, circ]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={circ - dash}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.34,1.56,0.64,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{label}</span>
        </div>
      </div>
      <span className="text-[10px] text-white/38 text-center leading-tight">{sub}</span>
    </div>
  );
}

// card wrapper with design-system tokens
function StarCard({ children, glow, className = '' }: {
  children: React.ReactNode; glow?: boolean; className?: string;
}) {
  return (
    <div className={[
      'rounded-2xl border border-white/[0.07] bg-[#13151f] p-5',
      glow ? 'shadow-[0_0_32px_rgba(var(--accent-rgb),0.08)]' : '',
      className,
    ].join(' ')}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[14px] font-bold text-white mb-4">
      <span className="text-[rgb(var(--accent-rgb))]">{icon}</span>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const { user, logout } = useAuth();
  const { state, counts } = useSystemState();
  const [tab, setTab] = useState<Tab>('overview');

  if (!user) {
    return (
      <div className="flex items-center justify-center h-48 text-white/30 text-sm animate-pulse">
        Завантаження...
      </div>
    );
  }

  // ── resolve display values ─────────────────────────────────────────────────
  const displayName = (user as any).firstName
    ? `${(user as any).firstName} ${(user as any).lastName ?? ''}`.trim()
    : user.name ?? user.email ?? '—';
  const plan = (user as any).access?.plan ?? 'free';

  // progress (real data or preview defaults)
  const points    = (state as any)?.progress?.points    ?? 3480;
  const pointsMax = (state as any)?.progress?.pointsMax ?? 5000;
  const level     = (state as any)?.progress?.level     ?? 7;
  const levelTitle = (state as any)?.progress?.levelTitle ?? 'Провідник';
  const nextLevel  = (state as any)?.progress?.nextLevel  ?? 'Майстер';
  const streak     = (state as any)?.user?.streak          ?? 12;
  const genUsed    = (state as any)?.aiUsage?.used          ?? 7;
  const genTotal   = (state as any)?.aiUsage?.total         ?? 10;
  const sessions   = (state as any)?.activity?.sessions     ?? 48;
  const sessMonth  = (state as any)?.activity?.sessionsMonth ?? 6;
  const rank       = (state as any)?.rank                   ?? 14;
  const rankTotal  = (state as any)?.rankTotal              ?? 203;
  const pct        = Math.min((points / pointsMax) * 100, 100);

  const avatarLetter = (
    (user as any)?.firstName?.[0] ?? user?.name?.[0] ?? user?.email?.[0] ?? 'U'
  ).toUpperCase();

  return (
    <div className="max-w-[980px] mx-auto p-4 md:p-6 space-y-4 animate-[slideUp_0.35s_ease]">

      {/* ── MODULE INTRO ────────────────────────────────────────────────────── */}
      <ModuleIntro
        title="Профіль"
        steps={[
          '1. Контролюйте продукти, підписки й шаблони зверху.',
          '2. Стрік і рівень оновлюються в реальному часі з backend.',
          '3. Огляд → Динаміка → Досягнення — переключайте таби.',
        ]}
      />

      {/* ── USAGE COUNTERS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ModuleUsageCounter label="Мої продукти"  used={counts.ownedProducts}      total={Math.max(1, counts.ownedProducts)} />
        <ModuleUsageCounter label="Підписки"       used={counts.subscribedProducts} total={Math.max(1, counts.subscribedProducts)} />
        <ModuleUsageCounter label="Шаблони"        used={counts.templates}          total={Math.max(1, counts.templates)} />
      </div>

      {/* ── USER HERO CARD ─────────────────────────────────────────────────── */}
      <StarCard glow>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3.5">
            {/* avatar */}
            <div className="relative">
              <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-[rgb(var(--accent-rgb))] to-[rgba(var(--accent-rgb),0.65)] flex items-center justify-center text-xl font-bold text-white shadow-[0_4px_16px_rgba(var(--accent-rgb),0.3)]">
                {avatarLetter}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#13151f]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white leading-tight">{displayName}</h1>
              <p className="text-[13px] text-white/38 mt-0.5">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <PlanBadge plan={plan} />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="text-[13px]">🔥</span>
              <span className="text-[12px] font-bold text-red-400">{streak} днів</span>
            </div>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="flex items-center justify-between text-[12px] mb-2">
          <span className="text-amber-400 font-bold">▲ Рівень {level} · {levelTitle}</span>
          <span className="text-white/38">До {nextLevel}: {(pointsMax - points).toLocaleString('uk-UA')} XP</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-[1.1s] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #f59e0b, rgb(var(--accent-rgb)))',
              boxShadow: '0 0 10px rgba(var(--accent-rgb),0.5)',
            }}
          />
        </div>
        <div className="flex justify-between text-[11px] mt-1.5">
          <span className="text-white/38"><AnimNum target={points} /> XP</span>
          <span className="text-white/38">{pointsMax.toLocaleString('uk-UA')} XP</span>
        </div>

        {/* meta row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Мої продукти', val: counts.ownedProducts      },
            { label: 'Підписки',     val: counts.subscribedProducts  },
            { label: 'Шаблони',      val: counts.templates           },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-[13px] text-white/60">
              {s.label}: <span className="text-white font-semibold ml-1">{s.val}</span>
            </div>
          ))}
        </div>
      </StarCard>

      {/* ── TABS ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-[12px] border border-white/[0.07] bg-white/[0.02]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex-1 flex items-center justify-center gap-2',
              'py-2 px-3 rounded-[9px] text-[13px] font-medium',
              'transition-all duration-150',
              tab === t.id
                ? 'bg-[rgba(var(--accent-rgb),0.14)] border border-[rgba(var(--accent-rgb),0.22)] text-white font-semibold'
                : 'text-white/38 hover:text-white/70 hover:bg-white/[0.04]',
            ].join(' ')}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB: ОГЛЯД ══════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-4">

          {/* stat tiles */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: sessions,  label: 'Сесій всього',       icon: '📋', color: '#818cf8', raw: false },
              { val: `#${rank}`,label: `з ${rankTotal} учасників`, icon: '🏅', color: '#34d399', raw: true  },
              { val: sessMonth, label: 'Сесій цього місяця', icon: '📅', color: '#f472b6', raw: false },
            ].map((s, i) => (
              <StarCard key={i} className="text-center py-4">
                <div className="text-[22px] mb-2">{s.icon}</div>
                <div className="text-[22px] font-extrabold" style={{ color: s.color }}>
                  {s.raw ? s.val : <AnimNum target={Number(s.val)} duration={900} />}
                </div>
                <div className="text-[10px] text-white/38 mt-1">{s.label}</div>
              </StarCard>
            ))}
          </div>

          {/* AI gen bar */}
          <StarCard>
            <SectionTitle icon="✦">AI-генерації цього місяця</SectionTitle>
            <div className="flex justify-between text-[13px] text-white/38 mb-2.5">
              <span>Використано <b className="text-white">{genUsed}</b> з <b className="text-white">{genTotal}</b></span>
              <span>{genTotal - genUsed} залишилось</span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: genTotal }).map((_, i) => (
                <div key={i} className="flex-1 h-[7px] rounded-sm transition-all duration-300"
                  style={{
                    transitionDelay: `${i * 40}ms`,
                    background: i < genUsed
                      ? i < 7 ? '#818cf8' : '#ef4444'
                      : 'rgba(255,255,255,0.08)',
                  }}
                />
              ))}
            </div>
          </StarCard>

          {/* Recent activity */}
          <StarCard>
            <SectionTitle icon="◈">Остання активність</SectionTitle>
            {RECENT_STATIC.map((a, i) => (
              <div
                key={a.id}
                className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: i < RECENT_STATIC.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
              >
                <div className="w-[34px] h-[34px] rounded-[9px] bg-white/[0.06] flex items-center justify-center text-[17px] flex-shrink-0">
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">{a.text}</p>
                  <p className="text-[11px] text-white/38 mt-0.5">{a.time}</p>
                </div>
                <span className={`text-[13px] font-bold flex-shrink-0 ${a.points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {a.points > 0 ? '+' : ''}{a.points}
                </span>
              </div>
            ))}
          </StarCard>

          {/* existing sub-components */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <UserStats userId={user.id} />
            <UserProgress />
          </div>
          <UserProductRolesPanel />
          <UserDeliveryChannelsCard />
          <UserSettingsCard />
        </div>
      )}

      {/* ══════════════════ TAB: ДИНАМІКА ══════════════════ */}
      {tab === 'history' && (
        <div className="space-y-4">

          {/* bar chart */}
          <StarCard>
            <SectionTitle icon="↗">Динаміка очок по місяцях</SectionTitle>
            <div className="flex items-end justify-between gap-2" style={{ height: 148 }}>
              {HISTORY_STATIC.map((h, i) => {
                const maxP  = Math.max(...HISTORY_STATIC.map(d => d.points));
                const barH  = Math.round((h.points / maxP) * 120);
                const isLast = i === HISTORY_STATIC.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px]" style={{
                      color: isLast ? '#f59e0b' : 'rgba(255,255,255,0.38)',
                      fontWeight: isLast ? 700 : 400,
                    }}>
                      {h.points.toLocaleString('uk-UA')}
                    </span>
                    <div className="w-full rounded-[5px]"
                      style={{
                        height: barH,
                        background: isLast
                          ? 'linear-gradient(180deg,#f59e0b,rgb(var(--accent-rgb)))'
                          : 'rgba(255,255,255,0.1)',
                        boxShadow: isLast ? '0 4px 16px rgba(245,158,11,0.35)' : 'none',
                        transition: 'height 0.9s cubic-bezier(0.34,1.56,0.64,1)',
                      }}
                    />
                    <span className="text-[11px] text-white/38">{h.month}</span>
                  </div>
                );
              })}
            </div>
          </StarCard>

          {/* growth stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Зростання',        val: '+66%', color: '#34d399', sub: 'за 3 місяці'  },
              { label: 'Найкращий місяць', val: 'Лют',  color: '#f59e0b', sub: '3 480 очок'   },
            ].map((s, i) => (
              <StarCard key={i} className="text-center">
                <p className="text-[13px] text-white/60 mb-2">{s.label}</p>
                <p className="text-[32px] font-extrabold" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[11px] text-white/38 mt-1">{s.sub}</p>
              </StarCard>
            ))}
          </div>

          {/* rings */}
          <StarCard>
            <SectionTitle icon="◈">Показники місяця</SectionTitle>
            <div className="flex justify-around pt-2">
              <Ring value={genUsed}   max={genTotal} color="#818cf8"                  label={`${genUsed}/${genTotal}`} sub="AI генерацій" />
              <Ring value={sessMonth} max={10}        color="#34d399"                  label={String(sessMonth)}        sub="Сесій"        />
              <Ring value={streak}    max={30}         color="rgb(var(--accent-rgb))"  label={`${streak}🔥`}           sub="Стрік"        />
            </div>
          </StarCard>
        </div>
      )}

      {/* ══════════════════ TAB: ДОСЯГНЕННЯ ══════════════════ */}
      {tab === 'badges' && (
        <div className="space-y-4">

          {/* summary */}
          <StarCard>
            <div className="flex items-center gap-4">
              <p className="text-[40px] font-extrabold text-amber-400">
                {BADGES_STATIC.filter(b => b.earned).length}
              </p>
              <div>
                <p className="font-semibold text-white">з {BADGES_STATIC.length} отримано</p>
                <p className="text-[12px] text-white/38 mt-0.5">Продовжуй, щоб відкрити решту!</p>
              </div>
            </div>
          </StarCard>

          {/* badges grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BADGES_STATIC.map((b, i) => (
              <div
                key={b.id}
                className="rounded-2xl border p-5 flex flex-col items-center gap-2 text-center transition-all"
                style={{
                  background: b.earned ? 'rgba(245,158,11,0.07)' : '#13151f',
                  borderColor: b.earned ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)',
                  opacity: b.earned ? 1 : 0.45,
                  filter: b.earned ? 'none' : 'grayscale(1)',
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <span className="text-[32px]">{b.icon}</span>
                <span className="text-[12px] font-semibold" style={{ color: b.earned ? '#f59e0b' : 'rgba(255,255,255,0.38)' }}>
                  {b.label}
                </span>
                {b.earned && (
                  <span className="text-[10px] font-bold px-3 py-0.5 rounded-full bg-amber-500/18 text-amber-400 border border-amber-500/25">
                    Отримано ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LOGOUT ─────────────────────────────────────────────────────────── */}
      <button
        onClick={logout}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/[0.06] border border-white/[0.06] hover:border-red-500/20 transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span>Вийти з акаунту</span>
      </button>
    </div>
  );
}