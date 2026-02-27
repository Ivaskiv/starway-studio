// frontend/src/layout/Sidebar.tsx
import { ROUTES } from '@/config/routes';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { useMediaQuery } from '@/services/media.api';
import { useSystemState } from '@/shared/access/hooks/useSystemState';
import { getToastMessage } from '@/shared/i18n/toast';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION DATA
// ─────────────────────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    section: null,
    items: [
      {
        id: 'progress',
        label: 'Прогрес',
        icon: '↗',
        path: '/dashboard/progress',
        locked: false,
        badge: null,
        highlight: false,
      },
      {
        id: 'goals',
        label: 'Цілі',
        icon: '◎',
        path: '/dashboard/goals',
        locked: true,
        badge: null,
        highlight: false,
      },
      {
        id: 'zoom',
        label: 'Zoom-сесії',
        icon: '▦',
        path: '/dashboard/zoom',
        locked: true,
        badge: null,
        highlight: false,
      },
    ],
  },
  {
    section: 'Робота',
    items: [
      {
        id: 'sessions',
        label: 'Сесії',
        icon: '◷',
        path: '/dashboard/sessions',
        locked: false,
        badge: '3',
        highlight: false,
      },
      {
        id: 'clients',
        label: 'Клієнти',
        icon: '◈',
        path: '/dashboard/clients',
        locked: false,
        badge: null,
        highlight: false,
      },
      {
        id: 'reports',
        label: 'Звіти',
        icon: '◻',
        path: '/dashboard/reports',
        locked: false,
        badge: null,
        highlight: false,
      },
      {
        id: 'ai',
        label: 'AI-аналіз',
        icon: '✦',
        path: '/dashboard/ai',
        locked: false,
        badge: '2/10',
        highlight: true,
      },
    ],
  },
  {
    section: 'Налаштування',
    items: [
      {
        id: 'profile-s',
        label: 'Профіль',
        icon: '◉',
        path: ROUTES.PROFILE,
        locked: false,
        badge: null,
        highlight: false,
      },
      {
        id: 'billing',
        label: 'Підписка',
        icon: '◈',
        path: ROUTES.SUBSCRIPTION,
        locked: false,
        badge: null,
        highlight: false,
      },
      {
        id: 'help',
        label: 'Підтримка',
        icon: '💬',
        path: '/dashboard/help',
        locked: false,
        badge: null,
        highlight: false,
      },
    ],
  },
] as const;

const NAV_CTA = [
  { id: 'create', label: 'Create Product', path: ROUTES.PRODUCT_CREATION, moduleKey: null },
  { id: 'ai-gen', label: 'AI Генератор', path: ROUTES.AI_GENERATOR, moduleKey: 'AI_GENERATOR' },
  { id: 'funnel', label: 'AI Воронка', path: ROUTES.AI_FUNNEL_BUILDER, moduleKey: 'AI_FUNNEL' },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { state, getModuleAccess } = useSystemState();
  const { navigateTo, user } = useSmartNavigation();
  const { pathname } = useLocation();
  const isMobile = useMediaQuery('(max-width:768px)');

  const hasPremium = Boolean(state?.subscription?.isActive);
  const trialEnded = state?.trial?.endsAt
    ? new Date(state.trial.endsAt).getTime() <= Date.now() && !state.subscription?.isActive
    : false;

  const handleNav = (path: string) => {
    navigateTo(path, { requiresAuth: true });
    if (isMobile) onToggle();
  };

  const handleLocked = (path: string) => {
    toast.error(getToastMessage('module.moduleLocked'));
    navigateTo(`${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(path)}`, { requiresAuth: true });
  };

  // ── avatar initial ──────────────────────────────────────────────────────────
  const avatarLetter = (
    (user as any)?.firstName?.[0] ??
    user?.name?.[0] ??
    user?.email?.[0] ??
    'U'
  ).toUpperCase();

  const userName = (user as any)?.firstName
    ? `${(user as any).firstName} ${(user as any).lastName ?? ''}`.trim()
    : (user?.name ?? user?.email ?? '—');

  const userLevel = (state as any)?.progress?.level ?? 1;
  const userPoints = (state as any)?.progress?.points ?? 0;

  return (
    <aside
      className={[
        collapsed ? 'w-[60px]' : 'w-[260px]',
        'flex flex-col flex-shrink-0 bg-[#111318]',
        'border-r border-white/[0.07] h-screen sticky top-0',
        'transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden',
      ].join(' ')}
    >
      {/* ── SCROLLABLE NAV ─────────────────────────────────────────────────── */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-1.5' : 'px-2.5'}`}
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi < NAV_GROUPS.length - 1 ? 'mb-1' : ''}>
            {/* section label */}
            {group.section && !collapsed && (
              <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-white/[0.22] px-3 pt-3 pb-1.5">
                {group.section}
              </p>
            )}
            {group.section && collapsed && <div className="h-px bg-white/[0.07] mx-1 my-2" />}

            {/* items */}
            {group.items.map(item => {
              const isLocked = item.locked && !hasPremium;
              const isItemActive = pathname.startsWith(item.path);

              return (
                <button
                  key={item.id}
                  title={collapsed ? item.label : undefined}
                  onClick={() => (isLocked ? handleLocked(item.path) : handleNav(item.path))}
                  className={[
                    'w-full flex items-center rounded-[10px] mb-0.5 transition-all duration-150 relative',
                    collapsed ? 'justify-center px-0 py-[10px] gap-0' : 'px-3 py-[9px] gap-2.5',
                    isItemActive
                      ? item.highlight
                        ? 'bg-[linear-gradient(90deg,rgba(var(--accent-rgb),0.14),rgba(var(--accent-rgb),0.04))] border border-[rgba(var(--accent-rgb),0.22)] font-semibold text-white'
                        : 'bg-white/[0.08] font-semibold text-white'
                      : isLocked
                        ? 'text-white/35 opacity-50 cursor-default'
                        : item.highlight
                          ? 'text-white/60 hover:bg-[rgba(var(--accent-rgb),0.07)]'
                          : 'text-white/[0.58] hover:bg-white/[0.04] hover:translate-x-0.5',
                  ].join(' ')}
                >
                  {/* active left bar */}
                  {isItemActive && (
                    <span
                      className={[
                        'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] rounded-r-sm',
                        item.highlight
                          ? 'bg-gradient-to-b from-amber-400 to-orange-500 shadow-[0_0_6px_rgba(var(--accent-rgb),0.65)]'
                          : 'bg-[rgb(var(--accent-rgb))] shadow-[0_0_6px_rgba(var(--accent-rgb),0.5)]',
                      ].join(' ')}
                    />
                  )}

                  {/* symbol icon */}
                  <span
                    className={[
                      'flex-shrink-0 text-center leading-none select-none w-5',
                      collapsed ? 'text-[17px]' : 'text-[15px]',
                      isItemActive
                        ? item.highlight
                          ? 'text-[rgb(var(--accent-rgb))]'
                          : 'text-white'
                        : isLocked
                          ? 'text-white/25'
                          : item.highlight
                            ? 'text-[rgba(var(--accent-rgb),0.8)]'
                            : 'text-white/38',
                    ].join(' ')}
                  >
                    {item.icon}
                  </span>

                  {/* label + badges */}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left text-[13.5px] truncate">{item.label}</span>

                      {isLocked && (
                        <span className="ml-auto inline-flex items-center gap-1 flex-shrink-0">
                          <span className="text-[10px]">🔒</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[rgb(var(--accent-rgb))] text-white">
                            Преміум
                          </span>
                        </span>
                      )}

                      {!isLocked && item.badge && (
                        <span
                          className={[
                            'ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0',
                            item.highlight
                              ? 'bg-[rgba(var(--accent-rgb),0.2)] text-[rgb(var(--accent-rgb))] border border-[rgba(var(--accent-rgb),0.35)]'
                              : 'bg-white/10 text-white/60 border border-white/10',
                          ].join(' ')}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}

            {gi < NAV_GROUPS.length - 1 && !collapsed && (
              <div className="h-px bg-white/[0.07] mx-1 my-1.5" />
            )}
          </div>
        ))}

        {/* ── CTA buttons ── */}
        {!collapsed && (
          <>
            <div className="h-px bg-white/[0.07] mx-1 my-2" />
            <div className="flex flex-col gap-[7px] pb-3">
              {NAV_CTA.map(btn => {
                const access = btn.moduleKey ? getModuleAccess(btn.moduleKey as any) : null;
                const locked = access?.isLocked ?? false;
                return (
                  <button
                    key={btn.id}
                    onClick={() => (locked ? handleLocked(btn.path) : handleNav(btn.path))}
                    className={[
                      'flex items-center gap-2 px-3 py-[10px] rounded-[10px]',
                      'text-[13px] font-medium text-left transition-all border whitespace-nowrap',
                      locked
                        ? 'bg-white/[0.02] border-white/[0.07] text-white/30'
                        : 'bg-[rgba(var(--accent-rgb),0.08)] border-[rgba(var(--accent-rgb),0.2)] text-white/75',
                      !locked &&
                        'hover:bg-[rgba(var(--accent-rgb),0.15)] hover:border-[rgba(var(--accent-rgb),0.4)] hover:text-white',
                    ].join(' ')}
                  >
                    <span
                      className={
                        locked
                          ? 'text-white/20 text-[13px]'
                          : 'text-[rgb(var(--accent-rgb))] text-[13px]'
                      }
                    >
                      ✦
                    </span>
                    {btn.label}
                    {locked && <span className="ml-auto text-[10px]">🔒</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── SuperAdmin ── */}
        {state?.ui?.showAdminPanel && !collapsed && (
          <div className="border-t border-white/[0.07] pt-3 mt-1 pb-2">
            <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-white/[0.22] px-3 pb-2">
              SuperAdmin
            </p>
            {[
              { label: 'Mentors', path: '/dashboard/ai-mentor' },
              { label: 'Funnels', path: '/dashboard/ai-funnel' },
              { label: 'Products', path: '/dashboard/products' },
            ].map(btn => (
              <button
                key={btn.path}
                onClick={() => handleNav(btn.path)}
                className="w-full flex items-center px-3 py-[9px] rounded-[10px] mb-0.5 bg-white/[0.03] border border-white/[0.07] text-white/65 text-[13px] hover:bg-white/[0.06] transition-colors"
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Trial ended banner ── */}
        {trialEnded && !collapsed && (
          <div className="mx-0.5 my-3 p-3.5 rounded-xl border border-amber-400/35 bg-amber-500/10">
            <p className="text-[11px] leading-relaxed text-amber-200/90 mb-2.5">
              Trial завершено. Дані збережені. Оберіть тариф.
            </p>
            <button
              onClick={() => handleNav(ROUTES.SUBSCRIPTION)}
              className="w-full py-1.5 rounded-[9px] border border-amber-400/45 bg-amber-500/20 text-amber-100 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
            >
              Обрати тариф
            </button>
          </div>
        )}
      </div>

      {/* ── USER CARD — pinned bottom ───────────────────────────────────────── */}
      <div
        className={[
          'sticky bottom-0 border-t border-white/[0.07] bg-black/20 flex-shrink-0 backdrop-blur-xl',
          collapsed ? 'py-3 flex justify-center' : 'px-3.5 py-3 flex items-center gap-2.5',
        ].join(' ')}
      >
        {/* avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-[rgb(var(--accent-rgb))] to-[rgba(var(--accent-rgb),0.7)] flex items-center justify-center text-sm font-bold text-white">
            {avatarLetter}
          </div>
          <div className="absolute -bottom-px -right-px w-2 h-2 rounded-full bg-emerald-400 border-[1.5px] border-[#111318]" />
        </div>

        {/* name + level — only when expanded */}
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">
                {userName}
              </p>
              <p className="text-[10px] text-white/38 flex items-center gap-1 mt-0.5">
                <span className="text-amber-400 font-semibold">▲ Lv.{userLevel}</span>
                <span className="text-white/[0.18]">·</span>
                <span>{userPoints.toLocaleString('uk-UA')} pts</span>
              </p>
            </div>
            <button
              title="Вийти"
              className="flex-shrink-0 bg-transparent border-none cursor-pointer text-white/38 hover:text-red-400 text-base p-1 rounded-[7px] transition-colors"
            >
              ↩
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
