// frontend/src/layout/Sidebar.tsx

import { Lock } from 'lucide-react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { ROUTES } from '@/config/routes';
import { getMenuForLocation } from '@/config/menu';
import { hasPaidAccess } from '@/features/user/types/user.types';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const { navigateTo, isActive } = useSmartNavigation();
  const { pathname } = useLocation();

  const menuItems = getMenuForLocation('sidebar');
  const hasPremium = user ? hasPaidAccess(user) : false;
  const trialEnded =
    !!user?.trialEndsAt &&
    new Date(user.trialEndsAt).getTime() <= Date.now() &&
    !hasPremium;

  const autoExpandedPath = useMemo(() => {
    // fix code_x: auto-expand only one relevant parent section based on current route.
    const activeParent = menuItems.find(item => {
      if (!item.children?.length) return false;
      return item.children.some(child => pathname === child.path || pathname.startsWith(`${child.path}/`));
    });
    return activeParent?.path ?? '';
  }, [menuItems, pathname]);

  const [expandedPath, setExpandedPath] = useState<string>('');

  useEffect(() => {
    setExpandedPath(autoExpandedPath);
  }, [autoExpandedPath]);

  return (
    <aside
      className={`${
        collapsed ? 'w-56' : 'w-64'
      } relative p-3 bg-slate-900/40 border-r border-white/10 h-[calc(100vh-4rem)] sticky top-16 overflow-y-hidden transition-[width] duration-300`}
    >
      {/* fix code_x: floating toggle avoids pushing menu items downward. */}
      <div
        className={`${
          collapsed ? 'left-1/2 -translate-x-1/2' : '-right-4'
        } absolute top-4 z-30`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-white/15 bg-slate-900/85 text-white/80 hover:bg-slate-800 hover:text-white transition-colors shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
          aria-label={collapsed ? 'Відкрити меню' : 'Згорнути меню'}
          title={collapsed ? 'Відкрити меню' : 'Згорнути меню'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <nav className="space-y-1 pt-1">
        {menuItems.map(item => {
          const locked = item.requiresPaid && !hasPremium;
          const isParentActive = isActive(item.path);
          const hasChildren = !!item.children?.length;
          const isExpanded = hasChildren && expandedPath === item.path;

          return (
            <div key={item.path} className="space-y-1">
              <div className="relative">
                <button
                  title={item.label}
                  onClick={() =>
                    navigateTo(item.path, {
                      ...item,
                      requiresAuth: item.requiresAuth ?? true,
                      onAccessDenied: () =>
                        navigateTo(`${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(item.path)}`),
                    })
                  }
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded
                    text-white/85
                    justify-start
                    ${isParentActive ? 'bg-[color:rgba(var(--accent-rgb),0.14)] border border-[color:rgba(var(--accent-rgb),0.35)]' : ''}
                    ${locked ? 'opacity-55 border border-white/10' : 'hover:bg-white/5'}`}
                >
                  {item.icon && <item.icon className="w-5 h-5 text-white/80 shrink-0" />}
                  <span className="truncate">{item.label}</span>
                  {locked && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-amber-300/90">
                      <Lock className="w-4 h-4" />
                      Premium
                    </span>
                  )}
                </button>

                {hasChildren && (
                  <button
                    type="button"
                    aria-label={isExpanded ? 'Згорнути підменю' : 'Розгорнути підменю'}
                    onClick={e => {
                      e.stopPropagation();
                      setExpandedPath(prev => (prev === item.path ? '' : item.path));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {!!item.children?.length && isExpanded && (
                <div className="ml-8 space-y-1 border-l border-white/10 pl-3">
                  {item.children.map(child => {
                    const childLocked = child.requiresPaid && !hasPremium;
                    return (
                      <button
                        key={`${item.path}:${child.path}`}
                        title={child.label}
                        onClick={() =>
                          navigateTo(child.path, {
                            ...child,
                            requiresAuth: child.requiresAuth ?? true,
                            onAccessDenied: () =>
                              navigateTo(`${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(child.path)}`),
                          })
                        }
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-sm text-white/75 text-left
                          ${isActive(child.path) ? 'bg-[color:rgba(var(--accent-rgb),0.11)] border border-[color:rgba(var(--accent-rgb),0.3)]' : 'hover:bg-white/5'}
                          ${childLocked ? 'opacity-55 border border-white/10' : ''}`}
                      >
                        {child.icon && <child.icon className="w-4 h-4 text-white/75 shrink-0" />}
                        <span className="truncate">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-3 space-y-2">
        {trialEnded && (
          <div className="mb-3 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2">
            {/* fix code_x: after trial end keep data and show paywall CTA instead of hiding sections. */}
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              Trial завершено. Дані збережені. Оберіть тариф, щоб розблокувати всі модулі.
            </p>
            <button
              type="button"
              onClick={() => navigateTo(ROUTES.SUBSCRIPTION, { requiresAuth: true })}
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-amber-400/45 bg-amber-500/20 px-2 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/30"
            >
              Обрати тариф
            </button>
          </div>
        )}

        {/* fix code_x: separate CTAs: AI Generator (mentor/wheel) vs AI Funnel (funnel-only flow). */}
        <button
          type="button"
          onClick={() =>
            navigateTo(`${ROUTES.AI_GENERATOR}?tab=mentor`, {
              requiresAuth: true,
              requiresPaid: true,
              onAccessDenied: () =>
                navigateTo(`${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(ROUTES.AI_GENERATOR)}`),
            })
          }
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[color:rgba(var(--accent-rgb),0.5)] bg-[color:rgba(var(--accent-rgb),0.2)] px-3 py-2 text-sm font-semibold text-white hover:bg-[color:rgba(var(--accent-rgb),0.3)] transition-colors whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>AI Генератор</span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigateTo(`${ROUTES.AI_FUNNEL_BUILDER}?tab=funnel`, {
              requiresAuth: true,
              requiresPaid: true,
              onAccessDenied: () =>
                navigateTo(`${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(ROUTES.AI_FUNNEL_BUILDER)}`),
            })
          }
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-colors whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>AI Воронка</span>
        </button>
      </div>
    </aside>
  );
}
