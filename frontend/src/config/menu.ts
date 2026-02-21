// frontend/src/config/menu.ts
import {
  Award, Bell, Bot, Calendar, CreditCard,
  HelpCircle, Home, LogOut, Package,
  Settings, Target, TrendingUp, User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { resolvePlan, type SubscriptionSnapshot } from '@/shared/utils/subscription.utils';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface MenuItem {
  path:           string;
  label:          string;
  icon?:          LucideIcon;
  badge?:         string | number;
  children?:      MenuItem[];
  requiresPaid?:  boolean;
  requiresAuth?:  boolean;
  showInHeader?:  boolean;
  showInSidebar?: boolean;
  showInUserMenu?:boolean;
}

// ─────────────────────────────────────────────
// MENU CONFIG
// ─────────────────────────────────────────────

export const MAIN_MENU: MenuItem[] = [
  // fix code_x: rename dashboard entry to avoid duplicate "Головна" semantics and keep sidebar taxonomy explicit.
  { path: ROUTES.DASHBOARD, label: 'Кабінет користувача', icon: Home, showInHeader: true, showInSidebar: true },
  { path: ROUTES.PRODUCTS,  label: 'Продукти', icon: Package, showInHeader: true, showInSidebar: true,
    children: [
      // fix code_x: requested IA - wheel and daily cycle are discoverable under products.
      { path: ROUTES.WHEEL, label: 'Колесо балансу', icon: Target },
      { path: ROUTES.CYCLE, label: 'Щоденний цикл', icon: Calendar },
    ],
  },
  { path: ROUTES.AI_MENTOR, label: 'AI Ментор', icon: Bot, showInHeader: true, showInSidebar: true,
    children: [
      // fix code_x: requested IA - same quick-entry tools inside AI Mentor section.
      { path: ROUTES.WHEEL, label: 'Колесо балансу', icon: Target },
      { path: ROUTES.CYCLE, label: 'Щоденний цикл', icon: Calendar },
    ],
  },
  { path: ROUTES.PROGRESS, label: 'Прогрес', icon: TrendingUp, showInHeader: true, showInSidebar: true },
  { path: ROUTES.PROFILE, label: 'Профіль', icon: User, showInHeader: true, showInSidebar: false },
];

export const SIDEBAR_MENU: MenuItem[] = [
  // fix code_x: keep top-level sidebar concise as requested.
  { path: ROUTES.GOALS, label: 'Цілі', icon: Award, showInSidebar: true, requiresPaid: true },
  { path: ROUTES.ZOOM, label: 'Zoom-сесії', icon: Calendar, showInSidebar: true, requiresPaid: true, badge: 'Paid' },
];

export const USER_MENU: MenuItem[] = [
  { path: ROUTES.PROFILE, label: 'Мій профіль', icon: User, showInUserMenu: true },
  { path: ROUTES.SUBSCRIPTION, label: 'Підписка', icon: CreditCard, showInUserMenu: true },
  { path: ROUTES.PROFILE, label: 'Повідомлення', icon: Bell, showInUserMenu: true },
  { path: ROUTES.SETTINGS, label: 'Налаштування', icon: Settings, showInUserMenu: true },
  { path: '/logout',                 label: 'Вийти',         icon: LogOut,     showInUserMenu: true },
];

// ─────────────────────────────────────────────
// ACCESS — делегуємо в subscription.utils
// ─────────────────────────────────────────────

/** Чи має user доступ до конкретного пункту меню */
export function hasAccess(item: MenuItem, user: SubscriptionSnapshot | null): boolean {
  if (!item.requiresPaid) return true;
  return resolvePlan(user).isPaid;
}

/** Чи має user будь-який premium доступ */
export function hasPremiumAccess(user: SubscriptionSnapshot | null): boolean {
  return resolvePlan(user).isPaid;
}

/** Дані для UI badge в Header/Sidebar */
export function getSubscriptionStatus(user: SubscriptionSnapshot | null) {
  const info = resolvePlan(user);
  return {
    label:     info.label,
    isPremium: info.isPaid,
    daysLeft:  info.daysLeft,
  };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export function getMenuForLocation(loc: 'header' | 'sidebar' | 'user-menu'): MenuItem[] {
  switch (loc) {
    case 'header':    return MAIN_MENU.filter(i => i.showInHeader);
    case 'sidebar':   return [...MAIN_MENU.filter(i => i.showInSidebar), ...SIDEBAR_MENU];
    case 'user-menu': return USER_MENU;
  }
}

export function getActiveMenuItem(pathname: string, items: MenuItem[]): MenuItem | null {
  for (const item of items) {
    if (item.path === pathname) return item;
    if (item.path !== '/' && pathname.startsWith(item.path)) return item;
    if (item.children) {
      const child = getActiveMenuItem(pathname, item.children);
      if (child) return child;
    }
  }
  return null;
}
