// frontend/src/components/UserMenu.tsx

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Zap, Crown } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAccess } from '@/features/auth/hooks/useAccess';
import { getUserMenuItems } from '@/config/menu';
import { ROUTES } from '@/config/routes';

interface UserMenuProps { variant?: 'sidebar' | 'header'; }

export function UserMenu({ variant = 'sidebar' }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isPaid, isTrial } = useAccess();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (isOpen && variant === 'sidebar') {
      requestAnimationFrame(() => {
        menuRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
  }, [isOpen, variant]);

  if (!user) return null;

  const initials    = (user.name?.[0] || user.email?.[0] || 'U').toUpperCase();
  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const planLabel   = isPaid ? 'Premium' : isTrial ? 'Trial' : 'Free';

  const menuItems = getUserMenuItems();

  const planCls = isPaid
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : isTrial
      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
      : 'bg-white/[0.05] text-white/40 border-white/10';

  return (
    <div ref={menuRef} className="relative">

      {/* ── TRIGGER ── */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className={[
          'flex items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.04]',
          'hover:bg-white/[0.07] transition-colors outline-none',
          variant === 'header' ? 'pl-1 pr-2.5 py-1' : 'w-full px-3 py-2.5',
        ].join(' ')}
      >
        {/* avatar */}
        <div className="relative flex-shrink-0">
          <div className="user-menu-avatar w-7 h-7 rounded-[8px] flex items-center justify-center text-[13px] font-bold">
            {initials}
          </div>
          <div className="absolute -bottom-px -right-px w-2 h-2 rounded-full bg-emerald-400 border-[1.5px] border-[#111318]" />
        </div>

        <span className="text-[13px] font-semibold text-white">{displayName}</span>

        {/* plan pill — sidebar only */}
        {variant === 'sidebar' && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${planCls}`}>
            {isPaid && <Zap className="w-2.5 h-2.5" />}
            {planLabel}
          </span>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-white/38 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* ── DROPDOWN ── */}
      {isOpen && (
        <div className={[
          'absolute z-[100] w-[240px] bg-[#181b27] border border-white/[0.07]',
          'rounded-[14px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden',
          variant === 'header' ? 'right-0 top-[calc(100%+6px)]' : 'left-0 bottom-[calc(100%+6px)]',
        ].join(' ')}>

          {/* user info */}
          <div className="px-4 pt-4 pb-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="user-menu-avatar w-9 h-9 rounded-[9px] flex items-center justify-center text-[15px] font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{displayName}</p>
                <p className="text-[11px] text-white/38 truncate">{user.email}</p>
              </div>
            </div>

            {/* plan badge */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-[9px] border ${planCls}`}>
              <span className="text-[11px] font-semibold flex items-center gap-1.5">
                {isPaid && <Zap className="w-3 h-3" />}
                {isPaid ? 'Premium план' : isTrial ? 'Trial період' : 'Free план'}
              </span>
              {!isPaid && (
                <button
                  type="button"
                  onClick={() => { navigate(ROUTES.SUBSCRIPTION); setIsOpen(false); }}
                  className="text-[10px] font-bold text-[color:var(--accent)] hover:text-[color:var(--accent-soft)] transition-colors bg-transparent border-none cursor-pointer"
                >Upgrade →</button>
              )}
            </div>
          </div>

          {/* menu items */}
          <div className="p-1.5 space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon
              if (item.path === '/logout') {
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => { logout(); setIsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[13px] text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.08] transition-all text-left"
                  >
                    <LogOut className="w-[15px] h-[15px] text-red-400/70" />
                    {item.label}
                  </button>
                )
              }
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[13px] text-white/65 hover:text-white hover:bg-white/[0.05] transition-all text-left"
                >
                  {Icon && (
                    <Icon className="w-[15px] h-[15px] text-white/38 flex-shrink-0" />
                  )}
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* upgrade CTA */}
          {!isPaid && (
            <div className="px-1.5 pb-1.5">
              <button
                type="button"
                onClick={() => { navigate(ROUTES.SUBSCRIPTION); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[13px] font-semibold text-[color:var(--accent)] border border-[rgba(var(--accent-rgb),0.25)] hover:border-[rgba(var(--accent-rgb),0.45)] hover:bg-[rgba(var(--accent-rgb),0.08)] transition-all"
              >
                <Crown className="w-[15px] h-[15px] flex-shrink-0" />
                Покращити план
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
