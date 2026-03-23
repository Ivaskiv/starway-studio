// frontend/src/layout/Sidebar.tsx
// ─── ВИПРАВЛЕНО: рядки 324 і 327 — lowercase → UPPERCASE ролі ────────────────
// Всі інші рядки — БЕЗ ЗМІН
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useLocation } from 'react-router-dom'

import { ROUTES } from '@/config/routes'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import type { UserRole } from '@/features/user/types/user.types'
import { UserMenu } from '@/features/user/userMenu/UserMenu'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import type { AppView, PreviewRole } from '@/layout/types/layout.types'
import { getToastMessage } from '@/features/notifications/i18n/toast'
import { useMediaQuery } from '@/features/media/services/media.api'

// ─────────────────────────────────────────────────────────────────────────────
// ТИПИ
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarNavItem {
  id:                  string
  label:               string
  icon:                string
  path:                string
  visibleTo:           UserRole[]
  requiresPaid?:       boolean
  requiresEnrollment?: string
  badge?:              string
  highlight?:          boolean
}

interface SidebarNavSection {
  id:        string
  label:     string | null
  visibleTo: UserRole[]
  items:     SidebarNavItem[]
  accent?:   boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// ЄДИНА КОНФІГУРАЦІЯ НАВІГАЦІЇ
// ─────────────────────────────────────────────────────────────────────────────

const SIDEBAR_NAV: SidebarNavSection[] = [
  {
    id: 'main',
    label: null,
    visibleTo: [],
    items: [
      { id: 'dashboard', label: 'Кабінет', icon: '', path: '/dashboard', visibleTo: [] },
      { id: 'ai-mentor', label: 'AI Ментор', icon: '', path: '/dashboard/ai-mentor', visibleTo: [] },
      { id: 'progress', label: 'Прогрес', icon: '', path: '/dashboard/progress', visibleTo: [] },
    ],
  },

  {
    id: 'user-programs',
    label: 'Мій розвиток',
    visibleTo: ['USER'],
    items: [
      { id: 'cycle', label: 'Щоденний цикл', icon: '', path: '/dashboard/cycle', visibleTo: ['USER'] },
      { id: 'wheel', label: 'Колесо балансу', icon: '', path: '/dashboard/wheel', visibleTo: ['USER'] },
      { id: 'courses', label: 'Практики', icon: '', path: '/dashboard/courses', visibleTo: ['USER'] },
      { id: 'products', label: 'Продукти', icon: '', path: '/dashboard/products', visibleTo: ['USER'] },
      { id: 'vision', label: 'Бачення', icon: '', path: '/dashboard/vision', visibleTo: ['USER'] },
      { id: 'zoom', label: 'Zoom-сесії', icon: '', path: '/dashboard/zoom', visibleTo: ['USER'] },
      { id: 'subscription', label: 'Підписка', icon: '', path: '/dashboard/subscription', visibleTo: ['USER'] },
    ],
  },

  {
    id: 'expert-ai',
    label: 'AI Система',
    visibleTo: ['EXPERT', 'SUPERADMIN'],
    items: [
      { id: 'ai-funnel', label: 'AI Воронка', icon: '', path: '/dashboard/ai-funnel', visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'ai-producer', label: 'AI Producer', icon: '', path: '/dashboard/ai-producer-console', visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'ai-seo', label: 'AI SEO', icon: '', path: '/dashboard/ai-seo', visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'ads', label: 'Реклама', icon: '', path: '/dashboard/ads', visibleTo: ['EXPERT', 'SUPERADMIN'] },
    ],
  },

  {
    id: 'expert-products',
    label: 'Продукти',
    visibleTo: ['EXPERT', 'SUPERADMIN'],
    items: [
      { id: 'my-products', label: 'Мої продукти', icon: '', path: '/dashboard/products', visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'leadmagnet', label: 'Лідмагніти', icon: '', path: '/dashboard/leadmagnet', visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'telegram', label: 'Telegram', icon: '', path: '/dashboard/telegram', visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'students', label: 'Учні', icon: '', path: '/dashboard/students', visibleTo: ['EXPERT', 'SUPERADMIN'] },
    ],
  },

  {
    id: 'account',
    label: 'Акаунт',
    visibleTo: [],
    items: [
      { id: 'profile', label: 'Профіль', icon: '👤', path: '/dashboard/profile', visibleTo: [] },
      { id: 'settings', label: 'Налаштування', icon: '⚙️', path: '/dashboard/settings', visibleTo: [] },
    ],
  },

  {
    id: 'admin',
    label: 'SuperAdmin',
    visibleTo: ['SUPERADMIN'],
    accent: true,
    items: [
      { id: 'users', label: 'Всі користувачі', icon: '', path: '/dashboard/admin/users', visibleTo: ['SUPERADMIN'] },
      { id: 'revenue', label: 'Revenue', icon: '', path: '/dashboard/admin/revenue', visibleTo: ['SUPERADMIN'] },
      { id: 'roles', label: 'Ролі юзерів', icon: '', path: '/dashboard/admin/roles', visibleTo: ['SUPERADMIN'] },
      { id: 'transfer', label: 'Transfer', icon: '', path: '/dashboard/admin/transfer-ownership', visibleTo: ['SUPERADMIN'] },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed:    boolean
  onToggle:     () => void
  view?:        AppView
  previewRole?: PreviewRole
}

// ─────────────────────────────────────────────────────────────────────────────
// ХЕЛПЕРИ
// ─────────────────────────────────────────────────────────────────────────────

function isVisibleFor(visibleTo: UserRole[], role: UserRole): boolean {
  return visibleTo.length === 0 || visibleTo.includes(role)
}

// ─────────────────────────────────────────────────────────────────────────────
// КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────────────────────

export default function Sidebar({ collapsed, onToggle, previewRole }: SidebarProps) {
  const { state } = useSystemState()
  const { navigateTo }             = useSmartNavigation()
  const { pathname }               = useLocation()
  const isMobile                   = useMediaQuery('(max-width:768px)')

  const hasPremium = Boolean(state?.subscription?.isActive)

  const enrollments = useMemo<string[]>(() => {
    const owned: string[] = (state as any)?.enrollments ?? []
    return owned
  }, [state])

  const normalizeRole = (value: string): UserRole => {
    const normalized = value.toUpperCase()
    if (normalized === 'SUPERADMIN') return 'SUPERADMIN'
    if (normalized === 'ADMIN')      return 'ADMIN'
    if (normalized === 'EXPERT')     return 'EXPERT'
    if (normalized === 'MENTOR')     return 'MENTOR'
    return 'USER'
  }

  // PreviewRole (lowercase) → UserRole (UPPERCASE) — type-safe, no cast
  const PREVIEW_ROLE_MAP: Record<PreviewRole, UserRole> = {
    superadmin: 'SUPERADMIN',
    expert:     'EXPERT',
    user:       'USER',
  }

  const currentRole = useMemo<UserRole>(() => {
    if (previewRole) return PREVIEW_ROLE_MAP[previewRole]
    const role = ((state as any)?.permissions?.role ?? '') as string
    return normalizeRole(role)
  }, [previewRole, state])

  const handleNav = (path: string) => {
    navigateTo(path, { requiresAuth: true })
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
    const isActive = item.path === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.path || pathname.startsWith(item.path + '/')

    return (
      <button
        key={item.id}
        title={collapsed ? item.label : undefined}
        onClick={() => isLocked ? handleLocked(item.path) : handleNav(item.path)}
        className={[
          'w-full flex items-center rounded-xl mb-0.5 transition-all duration-200 relative',
          collapsed ? 'gap-0 justify-center px-0 py-2' : 'gap-2.5 px-3 py-2',
          isActive
            ? 'border border-transparent font-semibold text-[var(--text-primary)] underline underline-offset-[6px] decoration-[1px] decoration-[rgba(var(--accent-rgb),0.5)]'
            : isLocked
              ? 'text-[var(--text-subtle)] opacity-50 cursor-not-allowed border border-transparent'
              : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] hover:underline hover:underline-offset-[6px] hover:decoration-[1px] hover:decoration-[rgba(var(--accent-rgb),0.28)] border border-transparent',
        ].join(' ')}
      >
        {!collapsed && isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[62%] rounded-r-sm bg-[rgba(var(--accent-rgb),0.82)]" />
        )}

        {item.icon && (
          <span
            className={[
              'flex-shrink-0 text-center leading-none select-none',
              collapsed ? 'text-[20px]' : 'text-[14px]',
              isActive  ? 'text-[rgb(var(--accent-rgb))]'  :
              isLocked  ? 'text-[var(--text-subtle)]'       :
                          'text-[var(--text-muted)]',
            ].join(' ')}
          >
            {item.icon}
          </span>
        )}

        {!collapsed && (
          <>
            <span className="flex-1 text-left text-[13px] truncate">{item.label}</span>

            {isLocked && (
              <span className="ml-auto flex items-center gap-1 flex-shrink-0">
                <span className="text-[10px]">🔒</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[rgb(var(--accent-rgb))] text-white">
                  Преміум
                </span>
              </span>
            )}

            {!isLocked && item.badge && (
              <span
                className={[
                  'ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0',
                  item.highlight
                    ? 'bg-[rgba(var(--accent-rgb),0.15)] text-[rgb(var(--accent-rgb))] border-[rgba(var(--accent-rgb),0.3)]'
                    : 'bg-[var(--glass-bg)] text-[var(--text-muted)] border-[var(--border-primary)]',
                ].join(' ')}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    )
  }

  const renderSectionLabel = (label: string, accent = false) =>
    !collapsed ? (
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <p className={[
          'shrink-0 text-[9px] font-bold tracking-widest uppercase',
          accent ? 'text-amber-400/60' : 'text-[var(--text-subtle)]',
        ].join(' ')}>
          {label}
        </p>
        <span
          className={[
            'block min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[8px] tracking-[0.22em]',
            accent ? 'text-amber-400/30' : 'text-[rgba(var(--accent-rgb),0.26)]',
          ].join(' ')}
          aria-hidden="true"
        >
          ................................................................................................
        </span>
      </div>
    ) : (
      <div className="h-px bg-[var(--border-primary)] mx-1.5 my-1.5" />
    )

  const renderSection = (section: SidebarNavSection) => {
    if (!isVisibleFor(section.visibleTo, currentRole)) return null
    const visibleItems = section.items.map(item => renderNavItem(item)).filter(Boolean)
    if (visibleItems.length === 0) return null
    return (
      <div key={section.id} className="mb-1.5">
        {section.label && renderSectionLabel(section.label, section.accent)}
        {visibleItems}
      </div>
    )
  }

  // ── ВИПРАВЛЕНО: lowercase → UPPERCASE (рядки 324 і 327 оригіналу) ─────────
  const showUpgradeBanner = currentRole === 'USER' && !hasPremium && !collapsed

  return (
    <aside
      className={[
        'relative flex flex-col flex-shrink-0 bg-[var(--bg-secondary)] h-screen border-r border-[var(--border-primary)]',
        'dashboard-sidebar',
        'transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-visible',
        collapsed ? 'w-[68px]' : 'w-[232px]',
      ].join(' ')}
    >
      <div
        className={[
          'flex-1 overflow-y-auto overflow-x-hidden pb-20',
          collapsed ? 'pt-16 px-1.5' : 'pt-3 px-3',
        ].join(' ')}
      >
        {SIDEBAR_NAV.map(renderSection)}

        {showUpgradeBanner && (
          <div className="mx-0 my-3 p-3.5 rounded-xl border border-[rgba(var(--accent-rgb),0.25)] bg-[rgba(var(--accent-rgb),0.06)]">
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              ✦ AI-Ментор Premium
            </p>
            <p className="text-[10px] leading-relaxed text-[var(--text-muted)] mb-2.5">
              Цілі, Zoom сесії, повний AI-Ментор — від 33€/міс
            </p>
            <button
              onClick={() => handleNav(ROUTES.SUBSCRIPTION)}
              className="w-full py-1.5 rounded-lg bg-[rgba(var(--accent-rgb),0.15)] border border-[rgba(var(--accent-rgb),0.30)] text-[var(--text-primary)] text-[11px] font-semibold hover:bg-[rgba(var(--accent-rgb),0.25)] transition-colors"
            >
              Переглянути плани →
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onToggle}
        className={[
          'absolute top-3 right-[19px] translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-l-full',
          'border border-[var(--border-primary)] bg-[var(--glass-bg)] text-[var(--text-muted)] text-lg',
          'transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.35)]',
          'hover:border-[var(--border-accent)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]',
          'focus-visible:outline-none focus-visible:ring focus-visible:ring-[rgba(var(--accent-rgb),0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
        ].join(' ')}
        title={collapsed ? 'Розгорнути меню' : 'Згорнути меню'}
      >
        {collapsed ? '>' : '<'}
      </button>

      <UserMenu variant="sidebar" />
    </aside>
  )
}
