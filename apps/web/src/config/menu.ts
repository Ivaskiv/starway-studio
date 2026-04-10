// frontend/src/config/menu.ts
// ╔══════════════════════════════════════════════════════════════════╗
// ║  АРХІТЕКТУРА НАВІГАЦІЇ                                           ║
// ║                                                                  ║
// ║  ХЕДЕР = платформна навігація (НЕ продукти!)                    ║
// ║    · Що таке Starway (для всіх, включно незалогінених)          ║
// ║    · "Кабінет" — тільки якщо user залогінений                   ║
// ║    · Ціни · Навчання · Підтримка                                ║
// ║                                                                  ║
// ║  SIDEBAR = продукти та інструменти КОНКРЕТНОГО юзера            ║
// ║    · Рендериться тільки в Dashboard layout                       ║
// ║    · Backend знає які продукти куплені                           ║
// ║    · Sidebar фільтрує за isPaid (локально)                      ║
// ║                                                                  ║
// ║  Тому ABsystem, Колесо, Воронка — це НЕ пункти хедера,        ║
// ║  а лише посилання на лендинг-секції для незалогінених.          ║
// ╚══════════════════════════════════════════════════════════════════╝

import type { LucideIcon } from 'lucide-react'
import {
  BarChart2, Bell, BookOpen, Bot, CircleDot,
  CreditCard, Eye, Flame, HelpCircle,
  Home, LayoutDashboard, LogOut,
  Package, Settings, Sparkles, Star,
  Target, TrendingUp, User, Video, Zap,
} from 'lucide-react'
import { ROUTES } from '@/config/routes'
import { resolvePlan, type SubscriptionSnapshot } from '@/features/subscription/utils/subscription'

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface MenuItem {
  id:              string
  path:            string
  label:           string
  description?:    string
  icon?:           LucideIcon
  badge?:          string | number
  badgeVariant?:   'accent' | 'paid' | 'new' | 'hot'
  children?:       MenuItem[]
  requiresPaid?:   boolean
  requiresAuth?:   boolean   // показувати тільки залогіненим
  hideWhenAuth?:   boolean   // ховати якщо залогінений (напр. "Увійти")
  dividerBefore?:  boolean
  danger?:         boolean
  showInHeader?:   boolean
  showInSidebar?:  boolean
  showInUserMenu?: boolean
}

// ─────────────────────────────────────────────────────────────────
// HEADER MENU — платформна навігація
// ─────────────────────────────────────────────────────────────────

export const HEADER_MENU: MenuItem[] = [

  // ── Кабінет (тільки залогіненим) ─────────────────────────────
  {
    id:           'dashboard',
    path:         ROUTES.DASHBOARD,
    label:        'Кабінет',
    icon:         LayoutDashboard,
    showInHeader: true,
    requiresAuth: true,
  },

  // ── Платформа — що входить (dropdown) ────────────────────────
  {
    id:           'platform',
    path:         '/#platform',
    label:        'Платформа',
    icon:         Sparkles,
    showInHeader: true,
    children: [
      {
        id:          'platform-mentor',
        path:        '/#ai-mentor',
        label:       'ABsystem',
        description: 'Персональний менторський контур для щоденної підтримки',
        icon:        Bot,
      },
      {
        id:          'platform-wheel',
        path:        '/#wheel',
        label:       'Колесо балансу',
        description: 'Оцінка 8 сфер — основа методики',
        icon:        CircleDot,
      },
      {
        id:          'platform-cycle',
        path:        '/#daily-cycle',
        label:       'Щоденний цикл',
        description: 'Стан → Ціль → Вибір → Дія',
        icon:        Flame,
      },
    ],
  },

  // ── Програми / тарифи (dropdown) ─────────────────────────────
  {
    id:           'programs',
    path:         '/#programs',
    label:        'Програми',
    icon:         Star,
    showInHeader: true,
    children: [
      {
        id:          'prog-free',
        path:        '/#free',
        label:       'Free',
        description: 'Колесо балансу + щоденний цикл',
        icon:        Zap,
      },
      {
        id:           'prog-trial',
        path:         '/#trial',
        label:        'Trial 7 днів',
        description:  'Всі функції — безкоштовно',
        icon:         Flame,
        badge:        'Безкоштовно',
        badgeVariant: 'hot',
      },
      {
        id:           'prog-premium',
        path:         ROUTES.SUBSCRIPTION,
        label:        'Premium',
        description:  'ABsystem · Цілі · Zoom · Курси',
        icon:         Star,
        badge:        'Pro',
        badgeVariant: 'paid',
      },
    ],
  },

  // ── Навчання (dropdown) ───────────────────────────────────────
  {
    id:           'learn',
    path:         '/#learn',
    label:        'Навчання',
    icon:         BookOpen,
    showInHeader: true,
    children: [
      {
        id:          'learn-courses',
        path:        '/#courses',
        label:       'Курси',
        description: 'Структуровані програми розвитку',
        icon:        BookOpen,
      },
      {
        id:          'learn-blog',
        path:        '/blog',
        label:       'Блог',
        description: 'Статті та кейси',
        icon:        BookOpen,
      },
      {
        id:          'learn-help',
        path:        ROUTES.HELP,
        label:       'Підтримка',
        description: 'FAQ та документація',
        icon:        HelpCircle,
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────
// SIDEBAR MENU — продукти та інструменти юзера
// Рендериться тільки в Dashboard layout (залогінений user).
// Sidebar.tsx сам вирішує що показати виходячи з isPaid.
// ─────────────────────────────────────────────────────────────────

export const SIDEBAR_MENU: MenuItem[] = [

  // ── Огляд ────────────────────────────────────────────────────
  {
    id: 'home', path: ROUTES.DASHBOARD,
    label: 'Кабінет', icon: Home, showInSidebar: true,
  },

  // ── Менторські інструменти ───────────────────────────────────
  {
    id: 'ai-mentor', path: ROUTES.AI_MENTOR,
    label: 'ABsystem', icon: Bot, showInSidebar: true,
  },

  // ── Free ─────────────────────────────────────────────────────
  {
    id: 'wheel', path: ROUTES.WHEEL,
    label: 'Колесо балансу', icon: CircleDot, showInSidebar: true,
  },
  {
    id: 'cycle', path: ROUTES.CYCLE,
    label: 'Щоденний цикл', icon: Flame, showInSidebar: true,
  },
  {
    id: 'progress', path: ROUTES.PROGRESS,
    label: 'Прогрес', icon: TrendingUp, showInSidebar: true,
  },

  // ── Paid (видно, але locked якщо !isPaid) ────────────────────
  {
    id: 'vision', path: ROUTES.VISION,
    label: 'Точка Б', icon: Eye, showInSidebar: true,
    requiresPaid: true, badge: 'Pro', badgeVariant: 'paid',
  },
  {
    id: 'goals', path: ROUTES.GOALS,
    label: 'Цілі', icon: Target, showInSidebar: true,
    requiresPaid: true, badge: 'Pro', badgeVariant: 'paid',
  },
  {
    id: 'actions', path: ROUTES.ACTIONS,
    label: 'Дії', icon: BarChart2, showInSidebar: true,
    requiresPaid: true, badge: 'Pro', badgeVariant: 'paid',
  },
  {
    id: 'zoom', path: ROUTES.ZOOM,
    label: 'Zoom-сесії', icon: Video, showInSidebar: true,
    requiresPaid: true, badge: 'Pro', badgeVariant: 'paid',
  },

  // ── Продукти ─────────────────────────────────────────────────
  {
    id: 'products', path: ROUTES.PRODUCTS,
    label: 'Продукти', icon: Package, showInSidebar: true,
  },
]

// ─────────────────────────────────────────────────────────────────
// USER DROPDOWN
// ─────────────────────────────────────────────────────────────────

export const USER_MENU: MenuItem[] = [
  { id: 'profile',       path: ROUTES.PROFILE,                  label: 'Мій профіль',   icon: User,        showInUserMenu: true },
  { id: 'notifications', path: ROUTES.NOTIFICATIONS,            label: 'Повідомлення',  icon: Bell,        showInUserMenu: true, badge: 0 },
  { id: 'subscription',  path: ROUTES.SUBSCRIPTION,             label: 'Підписка',      icon: CreditCard,  showInUserMenu: true },
  { id: 'settings',      path: ROUTES.SETTINGS,                 label: 'Налаштування',  icon: Settings,    showInUserMenu: true },
  { id: 'help',          path: ROUTES.HELP,                     label: 'Підтримка',     icon: HelpCircle,  showInUserMenu: true, dividerBefore: true },
  { id: 'logout',        path: '/logout',                       label: 'Вийти',         icon: LogOut,      showInUserMenu: true, dividerBefore: true, danger: true },
]

// ─────────────────────────────────────────────────────────────────
// GETTERS
// ─────────────────────────────────────────────────────────────────

/** isAuth — з useAuth().user != null */
export function getHeaderMenu(isAuth = false): MenuItem[] {
  return HEADER_MENU.filter(i => {
    if (!i.showInHeader)             return false
    if (i.requiresAuth  && !isAuth)  return false  // "Кабінет" тільки залогінений
    if (i.hideWhenAuth  &&  isAuth)  return false  // "Увійти" ховаємо залогіненому
    return true
  })
}

export function getSidebarMenu(): MenuItem[] {
  return SIDEBAR_MENU.filter(i => i.showInSidebar)
}

export function getUserMenuItems(): MenuItem[] {
  return USER_MENU.filter(i => i.showInUserMenu)
}

/** @deprecated */
export function getMenuForLocation(loc: 'header' | 'sidebar' | 'user-menu'): MenuItem[] {
  if (loc === 'header')    return getHeaderMenu()
  if (loc === 'sidebar')   return getSidebarMenu()
  if (loc === 'user-menu') return getUserMenuItems()
  return []
}

export function getActiveItem(pathname: string, items: MenuItem[]): MenuItem | null {
  for (const item of items) {
    if (item.path === pathname) return item
    if (
      item.path !== '/' &&
      item.path !== '/logout' &&
      !item.path.startsWith('/#') &&
      pathname.startsWith(item.path)
    ) return item
    if (item.children) {
      const child = getActiveItem(pathname, item.children)
      if (child) return child
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────
// ACCESS
// ─────────────────────────────────────────────────────────────────

export function hasMenuAccess(item: MenuItem, snap: SubscriptionSnapshot | null): boolean {
  if (!item.requiresPaid) return true
  return resolvePlan(snap).isPaid
}

export function getSubscriptionBadge(snap: SubscriptionSnapshot | null) {
  const { isPaid, isTrial, label, daysLeft } = resolvePlan(snap)
  return { label, isPaid, isTrial, daysLeft }
}

// ─────────────────────────────────────────────────────────────────
// BADGE STYLES
// ─────────────────────────────────────────────────────────────────

export const BADGE_CLASS: Record<NonNullable<MenuItem['badgeVariant']>, string> = {
  accent: 'bg-[rgba(var(--accent-rgb),.15)] border-[var(--border-accent)] text-[var(--accent)]',
  paid:   'bg-[rgba(var(--accent-rgb),.12)] border-[var(--border-accent)] text-[var(--accent)]',
  new:    'bg-[rgba(74,222,128,.12)] border-[rgba(74,222,128,.30)] text-[#4ade80]',
  hot:    'bg-[rgba(239,68,68,.12)]  border-[rgba(239,68,68,.30)]  text-[#f87171]',
}
