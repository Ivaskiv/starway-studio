import { UserMenu } from '@/components/UserMenu';
import { ROUTES } from '@/config/routes';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { useSystemState } from '@/shared/access/hooks/useSystemState';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const HEADER_LINKS = [
  { id: 'products', label: 'Продукти', path: ROUTES.PRODUCTS },
  { id: 'community', label: 'Спільнота', path: '/community' },
  { id: 'schedule', label: 'Розклад', path: '/dashboard/schedule' },
  { id: 'changelog', label: 'Що нового', path: '/changelog', badge: 'NEW' },
] as const;

const NOTIFICATIONS = [
  { id: 1, icon: '🎯', text: 'Нова сесія заплановано', time: '5 хв', unread: true },
  { id: 2, icon: '🤖', text: 'AI-звіт готовий', time: '1 год', unread: true },
  { id: 3, icon: '🔥', text: 'Стрік 12 днів!', time: 'вчора', unread: false },
];

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Header({ collapsed, onToggle }: HeaderProps) {
  const { navigateTo } = useSmartNavigation();
  const { state } = useSystemState();
  const { pathname } = useLocation();

  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = NOTIFICATIONS.filter(n => n.unread).length;
  const streak = (state as any)?.user?.streak ?? 0;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 flex h-14 items-center border-b bg-[color:var(--bg)] text-[color:var(--text)]"
      style={{ borderColor: 'rgba(var(--accent-rgb),0.2)' }}
    >
      {/* LEFT / SIDEBAR ZONE */}
      <div
        className={[
          'relative flex h-full items-center border-r border-white/10 transition-all duration-300 ease-out',
          collapsed ? 'w-[60px] justify-center px-0' : 'w-[260px] justify-between px-4',
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 text-sm font-bold shadow-md shadow-orange-500/40">
            ✦
          </div>
          {!collapsed && (
            <span className="text-[15px] font-extrabold tracking-tight">
              Starway
            </span>
          )}
        </div>

        <button
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/60 transition-all hover:border-orange-400/40 hover:bg-orange-400/10 hover:text-orange-400"
          title={collapsed ? 'Розгорнути меню' : 'Згорнути меню'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* NAV */}
      <nav className="hidden flex-1 items-center gap-1 px-4 md:flex">
        {HEADER_LINKS.map(link => {
          const active =
            pathname === link.path ||
            pathname.startsWith(link.path + '/');

          return (
            <button
              key={link.id}
              onClick={() => navigateTo(link.path)}
              className={[
                'flex items-center gap-1 rounded-xl px-3 py-1.5 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white',
              ].join(' ')}
            >
              {link.label}
              {'badge' in link && link.badge && (
                <span className="rounded-full bg-[rgb(var(--accent-rgb))] px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {link.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* RIGHT */}
      <div className="flex items-center gap-2 pr-4">
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 lg:flex">
          <span className="text-white/40">⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Пошук"
            className="w-32 bg-transparent text-[12px] text-white placeholder:text-white/30 outline-none"
          />
        </div>

        {streak > 0 && (
          <div className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[12px] font-semibold text-red-400">
            🔥 {streak}
          </div>
        )}

        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white hover:bg-white/5"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
                {unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#181b27] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              {NOTIFICATIONS.map(n => (
                <div
                  key={n.id}
                  className="flex gap-3 px-4 py-3 text-[12px] text-white/80 hover:bg-white/5"
                >
                  <div>{n.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-white">
                      {n.text}
                    </div>
                    <div className="text-[11px] text-white/40">
                      {n.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <UserMenu variant="header" />
      </div>
    </header>
  );
}
