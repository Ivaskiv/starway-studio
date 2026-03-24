// frontend/src/layout/Header.tsx
import { NAVIGATION, type NavMenu } from '@/core/navigation/navigation.registry'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { selectCurrentUser, selectIsAuthenticated } from '@/features/auth/services/auth.slice'
import type { UserRole } from '@/features/user/types/user.types'
import { UserMenu } from '@/features/user/userMenu/UserMenu'
import { useGetWheelCooldownQuery } from '@/features/wheel/services/wheel.api'
import type { SidebarNavItem } from '@/layout/Sidebar'
import { SIDEBAR_NAV, isVisibleFor } from '@/layout/Sidebar'
import type { LayoutSharedProps } from '@/layout/types/layout.types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// ── Ролі ─────────────────────────────────────────────────────────────────────
type ViewRole = 'user' | 'expert' | 'superadmin'

const ROLE_NAV: Record<ViewRole, string[]> = {
  superadmin: NAVIGATION.map(m => m.id),
  expert:     ['platform', 'programs', 'learning'],
  user:       ['programs', 'learning'],
}

// ── ВИПРАВЛЕНО: додано onLoginClick та onRegisterClick ────────────────────────
interface HeaderProps extends LayoutSharedProps {
  onLoginClick?:    () => void
  onRegisterClick?: () => void
  forceBurgerMenu?: boolean
  miniAppMode?: boolean
}

export default function Header({
  view,
  onViewChange,
  previewRole,
  onRoleChange,
  onLoginClick,
  onRegisterClick,
  forceBurgerMenu = false,
  miniAppMode = false,
}: HeaderProps) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const headerRef = useRef<HTMLElement>(null)

  // ── ВИПРАВЛЕНО: isAuthenticated з Redux store ─────────────────────────────
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const { accessControl } = useSystemState()
  const shouldLoadWheelCooldown =
    isAuthenticated &&
    !!user?.id &&
    user.role === 'USER' &&
    accessControl?.hasSubscription === true &&
    accessControl?.hasRequiredContacts === true &&
    accessControl?.currentFlow !== 'lead-magnet'
  const { data: wheelCooldown } = useGetWheelCooldownQuery(
    user?.id ?? '',
    { skip: !shouldLoadWheelCooldown },
  )

  const compactShellMode = miniAppMode || forceBurgerMenu
  const viewRole = previewRole
  const [openDrop, setOpenDrop] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const normalizeRole = useCallback((value: string): UserRole => {
    const normalized = value.toUpperCase()
    if (normalized === 'SUPERADMIN') return 'SUPERADMIN'
    if (normalized === 'ADMIN')      return 'ADMIN'
    if (normalized === 'EXPERT')     return 'EXPERT'
    if (normalized === 'MENTOR')     return 'MENTOR'
    return 'USER'
  }, [])

  const currentRole = useMemo<UserRole>(() => {
    const role = user?.role ?? 'USER'
    return normalizeRole(String(role))
  }, [normalizeRole, user?.role])

  const hasPremium = Boolean(accessControl?.hasSubscription)

  const sidebarSections = useMemo(() => {
    if (!isAuthenticated) return []

    return SIDEBAR_NAV
      .filter(section => isVisibleFor(section.visibleTo, currentRole))
      .map(section => ({
        ...section,
        items: section.items.filter(item => isVisibleFor(item.visibleTo, currentRole)),
      }))
      .filter(section => section.items.length > 0)
  }, [currentRole, isAuthenticated])

  const go = useCallback((p: string) => navigate(p), [navigate])

  const filteredNav = useMemo<NavMenu[]>(() => {
    const allowed = ROLE_NAV[viewRole]
    return NAVIGATION.filter(m => allowed.includes(m.id))
  }, [viewRole])

  const desktopNav = useMemo(
    () => filteredNav.filter(menu => !['programs', 'learning'].includes(menu.id)),
    [filteredNav],
  )

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpenDrop(null)
      setMobileOpen(false)
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [])

  useEffect(() => {
    setOpenDrop(null)
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) {
        setOpenDrop(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const renderGuestAuthButtons = (onAfterClick?: () => void) => (
    <>
      <button
        className="hdr-btn-ghost"
        onClick={() => {
          onLoginClick?.()
          onAfterClick?.()
        }}
        aria-label="Увійти"
        type="button"
      >
        Увійти
      </button>
      <button
        className="hdr-btn-accent"
        onClick={() => {
          onRegisterClick?.()
          onAfterClick?.()
        }}
        aria-label="Реєстрація"
        type="button"
      >
        Реєстрація
      </button>
    </>
  )

  const AuthControls = isAuthenticated ? (
    <>
      <button className="hdr-notif" aria-label="Сповіщення">
        🔔
        <span className="hdr-notif-dot" aria-label="2 непрочитані">2</span>
      </button>
      <UserMenu variant="header" />
    </>
  ) : (
    renderGuestAuthButtons()
  )

  return (
    <header
      ref={headerRef}
      className={`hdr${miniAppMode ? ' hdr--miniapp' : ''}`}
      role="banner"
    >

      {/* ══ РЯДОК 2: Main row ════════════════════════════════════════════════ */}
      <div className="hdr-container">
        <div className="hdr-left">
          <button
            className="hdr-logo"
            onClick={() => go('/')}
            aria-label="Перейти на головну сторінку"
            type="button"
          >
            <span className="hdr-logo-gem" aria-hidden="true">⭐</span>
            <span>Starway</span>
          </button>
        </div>

        <div className="hdr-center">
          {!compactShellMode && (
            <nav className="hdr-nav" aria-label="Головна навігація">
              {desktopNav.map(menu => {
                if (menu.path) {
                  return (
                    <Link key={menu.id} className="hdr-nb" to={menu.path}>
                      {menu.label}
                    </Link>
                  )
                }
                const isOpen = openDrop === menu.id
                return (
                  <div key={menu.id} className="hdr-drop-wrap">
                    <button
                      className={`hdr-nb${isOpen ? ' hdr-nb--open' : ''}`}
                      onClick={() => setOpenDrop(isOpen ? null : menu.id)}
                      type="button"
                      ref={el => {
                        if (el) el.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
                      }}
                    >
                      {menu.label}
                      <span className={`hdr-chev${isOpen ? ' hdr-chev--flip' : ''}`} aria-hidden="true">▾</span>
                    </button>
                    {isOpen && (
                      <div className="hdr-drop" role="dialog" aria-label={menu.label}>
                        <span className="hdr-drop-ridge" aria-hidden="true" />
                        {menu.groups?.map(group => (
                          <div key={group.id} className="hdr-drop-group">
                            <span className="hdr-drop-gtitle">{group.title}</span>
                            {group.pages.map(page => (
                              <Link
                                key={page.id}
                                className={`hdr-drop-item${location.pathname === page.path ? ' hdr-drop-item--on' : ''}`}
                                to={page.path}
                                onClick={() => setOpenDrop(null)}
                              >
                                {page.icon && (
                                  <span className="hdr-drop-icon" aria-hidden="true">{page.icon}</span>
                                )}
                                <span className="hdr-drop-body">
                                  <span className="hdr-drop-label">{page.label}</span>
                                  {page.description && (
                                    <span className="hdr-drop-desc">{page.description}</span>
                                  )}
                                </span>
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          )}
        </div>

        <div className="hdr-right">
          <div className="hdr-controls">
            {!compactShellMode && (
              <label className="hdr-search" aria-label="Пошук">
                <span className="hdr-search-ico" aria-hidden="true">🔍</span>
                <input
                  className="hdr-search-input"
                  type="search"
                  placeholder="Пошук"
                  aria-label="Поле пошуку"
                />
              </label>
            )}

            {AuthControls}

            <button
              className={`hdr-burger${mobileOpen ? ' hdr-burger--open' : ''}${forceBurgerMenu ? ' hdr-burger--force' : ''}`}
              aria-label={mobileOpen ? 'Закрити меню' : 'Відкрити меню'}
              aria-controls="hdr-bmenu"
              type="button"
              ref={el => {
                if (el) el.setAttribute('aria-expanded', mobileOpen ? 'true' : 'false')
              }}
              onClick={() => setMobileOpen(v => !v)}
            >
              <span className="hdr-bline" aria-hidden="true" />
              <span className="hdr-bline" aria-hidden="true" />
              <span className="hdr-bline" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ══ БУРГЕР МЕНЮ ══════════════════════════════════════════════════════ */}
      <div
        id="hdr-bmenu"
        className={`hdr-bmenu${mobileOpen ? ' hdr-bmenu--open' : ''}${forceBurgerMenu ? ' hdr-bmenu--force' : ''}`}
        ref={el => {
          if (el) el.setAttribute('aria-hidden', mobileOpen ? 'false' : 'true')
        }}
      >
        <div className="hdr-bmenu-inner">
          {forceBurgerMenu ? (
            isAuthenticated ? (
            sidebarSections.map(section => (
              <div key={section.id} className="hdr-bmenu-sec">
                {section.label && (
                  <span className="hdr-bmenu-sec-title">{section.label}</span>
                )}
                {section.items.map((item: SidebarNavItem) => {
                  const isLocked = Boolean(item.requiresPaid && !hasPremium && currentRole !== 'SUPERADMIN')
                  const isActive = item.path === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname === item.path || location.pathname.startsWith(item.path + '/')

                  return (
                    <button
                      key={item.id}
                      className={`hdr-bmenu-link${isActive ? ' hdr-bmenu-link--on' : ''}${isLocked ? ' hdr-bmenu-link--locked' : ''}`}
                      onClick={() => {
                        if (isLocked) return
                        go(item.path)
                        setMobileOpen(false)
                      }}
                    >
                      <span className="hdr-bmenu-link-body">
                        <span className="hdr-bmenu-link-label">{item.label}</span>
                        {isLocked && (
                          <span className="hdr-bmenu-link-desc">Потрібен Premium</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
            ) : null
          ) : (
            filteredNav.map(menu =>
              menu.groups?.map(group => (
                <div key={group.id} className="hdr-bmenu-sec">
                  <span className="hdr-bmenu-sec-title">{group.title}</span>
                  {group.pages.map(page => (
                    <button
                      key={page.id}
                      className={`hdr-bmenu-link${location.pathname === page.path ? ' hdr-bmenu-link--on' : ''}`}
                      onClick={() => { go(page.path); setMobileOpen(false) }}
                    >
                      {page.icon && (
                        <span className="hdr-bmenu-link-ico" aria-hidden="true">{page.icon}</span>
                      )}
                      <span className="hdr-bmenu-link-body">
                        <span className="hdr-bmenu-link-label">{page.label}</span>
                        {page.description && (
                          <span className="hdr-bmenu-link-desc">{page.description}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )
          )}

          {/* Гостьові кнопки в бургері */}
          {!isAuthenticated && (
            <div className="hdr-bmenu-auth">
              {renderGuestAuthButtons(() => setMobileOpen(false))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
