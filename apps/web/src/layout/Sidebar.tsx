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
      { id: 'dashboard', label: 'Дашборд', icon: '⬛', path: '/dashboard', visibleTo: [] },
      { id: 'wheel', label: 'Колесо балансу', icon: '⚖️', path: '/dashboard/wheel', visibleTo: [] },
      { id: 'cycle', label: 'Щоденний цикл', icon: '🔄', path: '/dashboard/cycle', visibleTo: [] },
      { id: 'progress', label: 'Прогрес', icon: '↗', path: '/dashboard/progress', visibleTo: [] },
    ],
  },

  {
    id: 'ai',
    label: 'AI система',
    visibleTo: [],
    items: [
      { id: 'ai-mentor', label: 'AI Ментор', icon: '🤖', path: '/dashboard/ai-mentor', visibleTo: [] },
      { id: 'ai-funnel', label: 'AI Воронка', icon: '🚀', path: ROUTES.AI_FUNNEL_BUILDER, visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'ai-producer', label: 'AI Producer', icon: '🎬', path: '/dashboard/ai-producer', visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'ai-seo', label: 'AI SEO', icon: '📊', path: '/dashboard/ai-seo', visibleTo: ['EXPERT', 'SUPERADMIN'] },
    ],
  },

  {
    id: 'programs',
    label: 'Програми',
    visibleTo: [],
    items: [
      { id: 'programs', label: 'Мої програми', icon: '📦', path: '/dashboard/programs', visibleTo: [] },
      { id: 'leadmagnet', label: 'Лідмагніти', icon: '🎁', path: '/dashboard/leadmagnet', visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'tg', label: 'Telegram', icon: '✈️', path: '/dashboard/telegram', visibleTo: ['EXPERT', 'SUPERADMIN'] },
      { id: 'zoom', label: 'Zoom сесії', icon: '📹', path: '/dashboard/zoom', visibleTo: ['USER'] },
      { id: 'miniapps', label: 'Мініапки', icon: '📱', path: '/dashboard/miniapps', visibleTo: ['EXPERT', 'SUPERADMIN'] },
    ],
  },

  {
    id: 'account',
    label: 'Акаунт',
    visibleTo: [],
    items: [
      { id: 'subscription', label: 'Підписка', icon: '💎', path: ROUTES.SUBSCRIPTION, visibleTo: [] },
      { id: 'settings', label: 'Налаштування', icon: '⚙️', path: '/dashboard/settings', visibleTo: [] },
    ],
  },

  {
    id: 'admin',
    label: 'SuperAdmin',
    visibleTo: ['SUPERADMIN'],
    accent: true,
    items: [
      { id: 'users', label: 'Користувачі', icon: '👥', path: '/dashboard/admin/users', visibleTo: ['SUPERADMIN'] },
      { id: 'products', label: 'Продукти', icon: '📦', path: '/dashboard/admin/products', visibleTo: ['SUPERADMIN'] },
      { id: 'funnels', label: 'Воронки', icon: '🚀', path: '/dashboard/admin/funnels', visibleTo: ['SUPERADMIN'] },
      { id: 'revenue', label: 'Revenue', icon: '💰', path: '/dashboard/admin/revenue', visibleTo: ['SUPERADMIN'] },
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
  const { state, getModuleAccess } = useSystemState()
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

    const isLocked = Boolean(item.requiresPaid && !hasPremium)
    const isActive = item.path === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.path || pathname.startsWith(item.path + '/')

    return (
      <button
        key={item.id}
        title={collapsed ? item.label : undefined}
        onClick={() => isLocked ? handleLocked(item.path) : handleNav(item.path)}
        className={[
          'w-full flex items-center rounded-xl mb-1 transition-all duration-200 relative',
          collapsed ? 'gap-0 justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5',
          isActive
            ? 'bg-[var(--glass-bg-hover)] border border-[var(--border-accent)] font-semibold text-[var(--text-primary)] shadow-[var(--shadow-glow)]'
            : isLocked
              ? 'text-[var(--text-subtle)] opacity-50 cursor-not-allowed border border-transparent'
              : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] border border-transparent',
        ].join(' ')}
      >
        {!collapsed && isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-sm bg-gradient-to-b from-[rgb(var(--accent-soft-rgb))] to-[rgb(var(--accent-rgb))] shadow-[var(--shadow-glow)]" />
        )}

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
      <p className={[
        'text-[9px] font-bold tracking-widest uppercase px-3 pt-4 pb-2',
        accent ? 'text-amber-400/60' : 'text-[var(--text-subtle)]',
      ].join(' ')}>
        {label}
      </p>
    ) : (
      <div className="h-px bg-[var(--border-primary)] mx-1.5 my-2" />
    )

  const renderSection = (section: SidebarNavSection) => {
    if (!isVisibleFor(section.visibleTo, currentRole)) return null
    const visibleItems = section.items.map(item => renderNavItem(item)).filter(Boolean)
    if (visibleItems.length === 0) return null
    return (
      <div key={section.id} className="mb-2">
        {section.label && renderSectionLabel(section.label, section.accent)}
        {visibleItems}
      </div>
    )
  }

  // ── ВИПРАВЛЕНО: lowercase → UPPERCASE (рядки 324 і 327 оригіналу) ─────────
  const showUpgradeBanner = currentRole === 'USER' && !hasPremium && !collapsed
  const showCreateProduct = (currentRole === 'EXPERT' || currentRole === 'SUPERADMIN') && !collapsed

  return (
    <aside
      className={[
        'relative flex flex-col flex-shrink-0 bg-[var(--bg-secondary)] h-screen border-r border-[var(--border-primary)]',
        'dashboard-sidebar',
        'transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-visible',
        collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]',
      ].join(' ')}
    >
      <div
        className={[
          'flex-1 overflow-y-auto overflow-x-hidden pb-20',
          collapsed ? 'pt-16 px-1.5' : 'pt-3 px-3',
        ].join(' ')}
      >
        {SIDEBAR_NAV.map(renderSection)}

        {showCreateProduct && (
          <div className="px-0 pb-3 border-t border-[var(--border-primary)] mt-2 pt-3">
            <button
              onClick={() => handleNav(ROUTES.PRODUCT_CREATION)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium border bg-[rgba(var(--accent-rgb),0.08)] border-[rgba(var(--accent-rgb),0.20)] text-[var(--text-primary)] hover:bg-[rgba(var(--accent-rgb),0.15)] hover:border-[rgba(var(--accent-rgb),0.35)] transition-all"
            >
              <span className="text-[rgb(var(--accent-rgb))] text-[16px] leading-none">+</span>
              <span className="truncate">Створити продукт</span>
            </button>

            {['ai-generator', 'ai-funnel'].map(key => {
              const cfg = key === 'ai-generator'
                ? { label: 'AI Генератор', path: ROUTES.AI_GENERATOR,      moduleKey: 'AI_GENERATOR' }
                : { label: 'AI Воронка',   path: ROUTES.AI_FUNNEL_BUILDER,  moduleKey: 'AI_FUNNEL'   }
              const access = getModuleAccess(cfg.moduleKey as any)
              const locked = access?.isLocked ?? false
              return (
                <button
                  key={key}
                  onClick={() => locked ? handleLocked(cfg.path) : handleNav(cfg.path)}
                  className={[
                    'w-full flex items-center gap-2 px-3 py-2 mt-1.5 rounded-xl text-[12px] font-medium transition-all border',
                    locked
                      ? 'bg-[var(--glass-bg)] border-[var(--border-primary)] text-[var(--text-subtle)]'
                      : 'bg-[rgba(var(--accent-rgb),0.06)] border-[rgba(var(--accent-rgb),0.15)] text-[var(--text-secondary)] hover:bg-[rgba(var(--accent-rgb),0.12)] hover:border-[rgba(var(--accent-rgb),0.25)]',
                  ].join(' ')}
                >
                  <span className={locked ? 'text-[var(--text-subtle)]' : 'text-[rgb(var(--accent-rgb))]'}>✦</span>
                  <span className="truncate">{cfg.label}</span>
                  {locked && <span className="ml-auto text-[10px]">🔒</span>}
                </button>
              )
            })}
          </div>
        )}

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
