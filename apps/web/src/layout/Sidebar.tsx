// frontend/src/layout/Sidebar.tsx
// ─── ВИПРАВЛЕНО: рядки 324 і 327 — lowercase → UPPERCASE ролі ────────────────
// Всі інші рядки — БЕЗ ЗМІН
import { memo, useMemo } from 'react'
import {
  ArrowRightLeft,
  Banknote,
  BookOpen,
  Brain,
  Clock3,
  CreditCard,
  Home,
  Magnet,
  Megaphone,
  Package,
  Puzzle,
  Send,
  Settings,
  Shield,
  Sparkles,
  Target,
  User,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLocation } from 'react-router-dom'

import { ROUTE_METADATA, ROUTES, normalizeDashboardRoutePath, toAppRoutePath } from '@/config/routes'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import type { UserRole } from '@/features/user/types/user.types'
import { UserMenu } from '@/features/user/userMenu/UserMenu'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import type { AppView, PreviewRole } from '@/layout/types/layout.types'
import { getToastMessage } from '@/features/notifications/i18n/toast'
import { useMediaQuery } from '@/features/media/services/media.api'

export interface SidebarNavItem {
  id: string
  label: string
  icon: LucideIcon | null
  path: string
  visibleTo: UserRole[]
  indentLevel?: number
  requiresPaid?: boolean
  requiresEnrollment?: string
  badge?: string
  highlight?: boolean
}

export interface SidebarNavSection {
  id: string
  label: string | null
  visibleTo: UserRole[]
  items: SidebarNavItem[]
  accent?: boolean
}

export const SIDEBAR_NAV: SidebarNavSection[] = [
  {
    id: 'main',
    label: null,
    visibleTo: [],
    items: [
      { id: 'dashboard', label: 'Кабінет', icon: Home, path: ROUTES.DASHBOARD, visibleTo: [] },
      { id: 'ab-test', label: 'AB тест', icon: Sparkles, path: ROUTES.AB_TEST, visibleTo: [], highlight: true, badge: 'NEW' },
    ],
  },
  {
    id: 'user-programs',
    label: 'Мій розвиток',
    visibleTo: ['USER'],
    items: [
      // { id: 'absystem', label: 'ABsystem', icon: Sparkles, path: '/dashboard/ai-mentor', visibleTo: ['USER'] },
      { id: 'wheel', label: 'Колесо балансу', icon: Target, path: ROUTES.WHEEL, visibleTo: ['USER'] },
      { id: 'cycle', label: 'Щоденний цикл', icon: Clock3, path: ROUTES.CYCLE, visibleTo: ['USER']},
      { id: 'journal', label: 'Журнал', icon: BookOpen, path: ROUTES.JOURNAL, visibleTo: ['USER'] },
      { id: 'courses', label: 'Практики', icon: Puzzle, path: ROUTES.COURSES, visibleTo: ['USER'] },
      { id: 'products', label: 'Продукти', icon: Package, path: ROUTES.PRODUCTS, visibleTo: ['USER'] },
      { id: 'zoom', label: 'Zoom-сесії', icon: Video, path: ROUTES.ZOOM, visibleTo: ['USER', 'EXPERT', 'ADMIN', 'SUPERADMIN'] },
      { id: 'subscription', label: 'Підписка', icon: CreditCard, path: ROUTES.SUBSCRIPTION, visibleTo: ['USER'] },
    ],
  },
  {
    id: 'expert-ai',
    label: 'AI Система',
    visibleTo: ['EXPERT', 'SUPERADMIN'],
    items: [
      { id: 'ai-seo', label: 'AI SEO', icon: Brain, path: `${ROUTES.DASHBOARD}?section=ai-seo`, visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'ads', label: 'Реклама', icon: Megaphone, path: `${ROUTES.DASHBOARD}?section=content`, visibleTo: ['EXPERT', 'SUPERADMIN'] },
    ],
  },
  {
    id: 'expert-products',
    label: 'Продукти',
    visibleTo: ['EXPERT', 'SUPERADMIN'],
    items: [
      { id: 'my-products', label: 'Мої продукти', icon: Package, path: ROUTES.PRODUCTS, visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'leadmagnet', label: 'Лідмагніти', icon: Magnet, path: `${ROUTES.DASHBOARD}?section=leadmagnet`, visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'telegram', label: 'Telegram', icon: Send, path: `${ROUTES.DASHBOARD}?section=telegram`, visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'students', label: 'Учні', icon: Users, path: `${ROUTES.DASHBOARD}?section=students`, visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'zoom-coach', label: 'Zoom-календар', icon: Video, path: ROUTES.ZOOM, visibleTo: ['EXPERT', 'ADMIN', 'SUPERADMIN'] },
    ],
  },
  {
    id: 'account',
    label: 'Акаунт',
    visibleTo: [],
    items: [
      { id: 'profile', label: 'Профіль', icon: User, path: ROUTES.PROFILE, visibleTo: [] },
      { id: 'settings', label: 'Налаштування', icon: Settings, path: ROUTES.SETTINGS, visibleTo: [] },
    ],
  },
  {
    id: 'admin',
    label: 'SuperAdmin',
    visibleTo: ['SUPERADMIN', 'ADMIN', 'EXPERT'],
    accent: true,
    items: [
      { id: 'ai-assistant', label: 'ДНК STARWAY', icon: Sparkles, path: '/admin/ai-assistant', visibleTo: ['SUPERADMIN', 'ADMIN', 'EXPERT'] },
      { id: 'users', label: 'Всі користувачі', icon: Users, path: `${ROUTES.DASHBOARD}?section=students`, visibleTo: ['SUPERADMIN'] },
      { id: 'revenue', label: 'Revenue', icon: Banknote, path: toAppRoutePath('/dashboard/admin/revenue'), visibleTo: ['SUPERADMIN'] },
      { id: 'roles', label: 'Ролі юзерів', icon: Shield, path: ROUTES.ADMIN_ROLES, visibleTo: ['SUPERADMIN'] },
      { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft, path: toAppRoutePath('/dashboard/admin/transfer-ownership'), visibleTo: ['SUPERADMIN'] },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  view?: AppView
  previewRole?: PreviewRole
}

export function isVisibleFor(visibleTo: UserRole[], role: UserRole): boolean {
  return visibleTo.length === 0 || visibleTo.includes(role)
}

const Sidebar = memo(function Sidebar({ collapsed, onToggle, previewRole }: SidebarProps) {
  const { state } = useSystemState()
  const { navigateTo, isNavigationLocked } = useSmartNavigation()
  const { pathname } = useLocation()
  const normalizedPathname = useMemo(() => normalizeDashboardRoutePath(pathname), [pathname])
  const isMobile = useMediaQuery('(max-width:768px)')

  const hasPremium = Boolean(state?.subscription?.isActive)

  const enrollments = useMemo<string[]>(() => {
    const owned: string[] = (state as any)?.enrollments ?? []
    return owned
  }, [state])

  const normalizeRole = (value: string): UserRole => {
    const normalized = value.toUpperCase()
    if (normalized === 'SUPERADMIN') return 'SUPERADMIN'
    if (normalized === 'ADMIN') return 'ADMIN'
    if (normalized === 'EXPERT') return 'EXPERT'
    if (normalized === 'MENTOR') return 'MENTOR'
    if (normalized === 'PRODUCT_OWNER') return 'PRODUCT_OWNER'
    return 'USER'
  }

  const currentRole = useMemo<UserRole>(() => {
    // previewRole is now UserRole-typed — use it directly if provided
    if (previewRole) return normalizeRole(previewRole)
    const role = ((state as any)?.permissions?.role ?? '') as string
    return normalizeRole(role)
  }, [previewRole, state])

  const handleNav = (path: string) => {
    const rawPath = path.split('?')[0] ?? path
    const normalizedPath = normalizeDashboardRoutePath(rawPath)
    const requiresAuth = ROUTE_METADATA[normalizedPath as keyof typeof ROUTE_METADATA]?.requiresAuth ?? (
      normalizedPath.startsWith('/dashboard') || normalizedPath.startsWith('/admin')
    )

    navigateTo(path, { requiresAuth })
    if (isMobile) onToggle()
  }

  const handleLocked = (path: string) => {
    toast.error(getToastMessage('module.moduleLocked'))
    navigateTo(`${ROUTES.SUBSCRIPTION}?from=${encodeURIComponent(path)}`, { requiresAuth: true })
  }

  const renderNavItem = (item: SidebarNavItem) => {
    if (!isVisibleFor(item.visibleTo, currentRole)) return null
    if (item.requiresEnrollment && !enrollments.includes(item.requiresEnrollment)) return null

    const isLocked = Boolean(item.requiresPaid && !hasPremium && currentRole !== 'SUPERADMIN')
    const itemPathname = normalizeDashboardRoutePath(item.path.split('?')[0] ?? item.path)
    const isActive = itemPathname === '/dashboard'
      ? normalizedPathname === '/dashboard'
      : normalizedPathname === itemPathname || normalizedPathname.startsWith(itemPathname + '/')
    const isNested = (item.indentLevel ?? 0) > 0

    return (
      <button
        key={item.id}
        title={collapsed ? item.label : undefined}
        disabled={isNavigationLocked}
        onClick={() => isLocked ? handleLocked(item.path) : handleNav(item.path)}
        className={[
          'relative mb-0.5 flex w-full items-center rounded-xl transition-all duration-200',
          collapsed
            ? 'justify-center gap-0 px-0 py-2'
            : isNested
              ? 'gap-2.5 px-3 py-2 pl-7'
              : 'gap-2.5 px-3 py-2',
          isActive
            ? 'border border-transparent font-semibold text-[var(--text-primary)] underline decoration-[1px] decoration-[rgba(var(--accent-rgb),0.68)] underline-offset-[6px]'
            : isLocked
              ? 'cursor-not-allowed border border-transparent text-[var(--text-subtle)] opacity-50'
              : isNavigationLocked
                ? 'cursor-wait border border-transparent text-[var(--text-subtle)] opacity-55'
              : 'border border-transparent text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] hover:underline hover:decoration-[1px] hover:decoration-[rgba(var(--accent-rgb),0.42)] hover:underline-offset-[6px]',
        ].join(' ')}
      >
        {!collapsed && isActive ? (
          <span className="absolute left-0 top-1/2 h-[68%] w-[2px] -translate-y-1/2 rounded-r-sm bg-[rgba(var(--accent-rgb),0.92)]" />
        ) : null}

        {!collapsed && isNested ? (
          <span
            className={[
              'absolute left-3 top-1/2 h-px w-2.5 -translate-y-1/2 rounded-full',
              isActive ? 'bg-[rgba(var(--accent-rgb),0.92)]' : 'bg-[var(--border-primary)]',
            ].join(' ')}
          />
        ) : null}

        {item.icon ? (
          <span
            className={[
              'flex shrink-0 items-center justify-center',
              collapsed ? 'h-5 w-5' : 'h-4 w-4',
              isActive ? 'text-[rgb(var(--accent-rgb))]' : isLocked ? 'text-[var(--text-subtle)]' : 'text-[var(--text-muted)]',
            ].join(' ')}
            aria-hidden="true"
          >
            <item.icon className="h-full w-full stroke-[1.9]" />
          </span>
        ) : null}

        {!collapsed ? (
          <>
            <span className="flex-1 truncate text-left text-[13px]">{item.label}</span>

            {isLocked ? (
              <span className="ml-auto flex flex-shrink-0 items-center gap-1">
                <span className="text-[10px]">🔒</span>
                <span className="rounded-full bg-[rgb(var(--accent-rgb))] px-1.5 py-0.5 text-[9px] font-bold text-white">
                  Преміум
                </span>
              </span>
            ) : null}

            {!isLocked && item.badge ? (
              <span
                className={[
                  'ml-auto flex-shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold',
                  item.highlight
                    ? 'border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.15)] text-[rgb(var(--accent-rgb))]'
                    : 'border-[var(--border-primary)] bg-[var(--glass-bg)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                {item.badge}
              </span>
            ) : null}
          </>
        ) : null}
      </button>
    )
  }

  const renderSectionLabel = (label: string, accent = false) =>
    !collapsed ? (
      <div className="flex items-center gap-2 px-3 pb-1 pt-3">
        <p
          className={[
            'shrink-0 text-[10px] font-bold uppercase tracking-[.14em]',
            accent ? 'text-amber-300/85' : 'text-[rgb(var(--accent-soft-rgb))] [text-shadow:0_0_14px_rgba(var(--accent-soft-rgb),0.18)]',
          ].join(' ')}
        >
          {label}
        </p>
        <span
          className={[
            'block min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[8px] tracking-[0.22em]',
            accent ? 'text-amber-300/40' : 'text-[rgba(var(--accent-soft-rgb),0.42)]',
          ].join(' ')}
          aria-hidden="true"
        >
          ................................................................................................
        </span>
      </div>
    ) : (
      <div className="mx-1.5 my-1.5 h-px bg-[var(--border-primary)]" />
    )

  const renderSection = (section: SidebarNavSection) => {
    if (!isVisibleFor(section.visibleTo, currentRole)) return null
    const visibleItems = section.items.map(item => renderNavItem(item)).filter(Boolean)
    if (visibleItems.length === 0) return null

    return (
      <div key={section.id} className="mb-1.5">
        {section.label ? renderSectionLabel(section.label, section.accent) : null}
        {visibleItems}
      </div>
    )
  }

  const showUpgradeBanner = currentRole === 'USER' && !hasPremium && !collapsed
  return (
    <aside
      className={[
        'dashboard-sidebar relative z-20 flex h-screen flex-shrink-0 flex-col overflow-visible border-r border-[var(--border-primary)] bg-[var(--bg-secondary)]',
        'transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        collapsed ? 'w-[68px]' : 'w-[232px]',
      ].join(' ')}
    >
      <div
        className={[
          'flex-1 overflow-x-hidden overflow-y-auto pb-20',
          collapsed ? 'px-1.5 pt-16' : 'px-3 pt-3',
        ].join(' ')}
      >
        {SIDEBAR_NAV.map(renderSection)}

        {showUpgradeBanner ? (
          <div className="mx-0 my-3 rounded-xl border border-[rgba(var(--accent-rgb),0.25)] bg-[rgba(var(--accent-rgb),0.06)] p-3.5">
            <p className="mb-1 text-[11px] font-semibold text-[var(--text-secondary)]">
              ✦ ABsystem Premium
            </p>
            <p className="mb-2.5 text-[10px] leading-relaxed text-[var(--text-muted)]">
              Повний ABsystem, додаткові модулі й сесії підтримки — від 33€/міс
            </p>
            <button
              onClick={() => handleNav(ROUTES.SUBSCRIPTION)}
              className="w-full rounded-lg border border-[rgba(var(--accent-rgb),0.30)] bg-[rgba(var(--accent-rgb),0.15)] py-1.5 text-[11px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[rgba(var(--accent-rgb),0.25)]"
            >
              Переглянути плани →
            </button>
          </div>
        ) : null}
      </div>

      <button
        onClick={onToggle}
        className={[
          'absolute right-[19px] top-3 flex h-10 w-10 translate-x-1/2 items-center justify-center rounded-l-full',
          'border border-[var(--border-primary)] bg-[var(--glass-bg)] text-lg text-[var(--text-muted)]',
          'shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-all duration-200',
          'hover:border-[var(--border-accent)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]',
          'focus-visible:outline-none focus-visible:ring focus-visible:ring-[rgba(var(--accent-rgb),0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
        ].join(' ')}
        title={collapsed ? 'Розгорнути меню' : 'Згорнути меню'}
      >
        {collapsed ? '>' : '<'}
      </button>

      <UserMenu variant="sidebar" collapsed={collapsed} />
    </aside>
  )
}
)

export default Sidebar
