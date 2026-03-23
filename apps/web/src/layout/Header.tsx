// frontend/src/layout/Header.tsx
import { NAVIGATION, type NavMenu } from '@/core/navigation/navigation.registry'
import { selectCurrentUser, selectIsAuthenticated } from '@/features/auth/services/auth.slice'
import { useGetWheelCooldownQuery } from '@/features/wheel/services/wheel.api'
import { UserMenu } from '@/features/user/userMenu/UserMenu'
import type { LayoutSharedProps } from '@/layout/types/layout.types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// ── Ролі ─────────────────────────────────────────────────────────────────────
type ViewRole = 'user' | 'expert' | 'superadmin'

const ROLE_TABS = [
  { id: 'user'       as ViewRole, icon: '👤', label: 'User'       },
  { id: 'expert'     as ViewRole, icon: '🎬', label: 'Expert'     },
  { id: 'superadmin' as ViewRole, icon: '⭐', label: 'SuperAdmin' },
] as const

const ROLE_NAV: Record<ViewRole, string[]> = {
  superadmin: NAVIGATION.map(m => m.id),
  expert:     ['platform', 'programs', 'learning'],
  user:       ['programs', 'learning'],
}

const PANEL_TABS = [
  { id: 'nav',   label: 'Навігація' },
  { id: 'pages', label: 'Сторінки'  },
] as const
type PanelTab = typeof PANEL_TABS[number]['id']

// ── ВИПРАВЛЕНО: додано onLoginClick та onRegisterClick ────────────────────────
interface HeaderProps extends LayoutSharedProps {
  onLoginClick?:    () => void
  onRegisterClick?: () => void
}

export default function Header({
  view,
  onViewChange,
  previewRole,
  onRoleChange,
  onLoginClick,
  onRegisterClick,
}: HeaderProps) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const headerRef = useRef<HTMLElement>(null)

  // ── ВИПРАВЛЕНО: isAuthenticated з Redux store ─────────────────────────────
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const { data: wheelCooldown } = useGetWheelCooldownQuery(
    user?.id ?? '',
    { skip: !isAuthenticated || !user?.id },
  )

  const viewRole = previewRole
  const [openDrop,    setOpenDrop]    = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<PanelTab | null>(null)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  const go = useCallback((p: string) => navigate(p), [navigate])

  const filteredNav = useMemo<NavMenu[]>(() => {
    const allowed = ROLE_NAV[viewRole]
    return NAVIGATION.filter(m => allowed.includes(m.id))
  }, [viewRole])

  const allPages = useMemo(
    () => filteredNav.flatMap(m => m.groups?.flatMap(g => g.pages) ?? []),
    [filteredNav],
  )

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpenDrop(null)
      setActivePanel(null)
      setMobileOpen(false)
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [])

  useEffect(() => {
    setOpenDrop(null)
    setActivePanel(null)
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) {
        setOpenDrop(null)
        setActivePanel(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const togglePanel = (tab: PanelTab) =>
    setActivePanel(prev => {
      const next = prev === tab ? null : tab
      onViewChange(next === 'pages' ? 'pages' : 'navigation')
      return next
    })

  useEffect(() => {
    if (view === 'pages' && activePanel !== 'pages') {
      setActivePanel('pages')
      return
    }
    if (view === 'navigation' && activePanel === 'pages') {
      setActivePanel(null)
    }
  }, [view, activePanel])

  return (
    <header ref={headerRef} className="hdr" role="banner">

      {/* ══ РЯДОК 1: Role switcher ════════════════════════════════════════════ */}
      <div className="hdr-split-row hdr-split-row--roles">
        <span className="hdr-split-line" aria-hidden="true" />
        <div className="hdr-role-group" role="tablist" aria-label="Перемикання ролей">
          {ROLE_TABS.map((tab, i) => (
            <button
              key={tab.id}
              role="tab"
              id={`hdr-tab-${tab.id}`}
              tabIndex={viewRole === tab.id ? 0 : -1}
              className={`hdr-role-btn${viewRole === tab.id ? ' hdr-role-btn--on' : ''}`}
              onClick={() => onRoleChange(tab.id)}
              onKeyDown={e => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                e.preventDefault()
                const tabs = headerRef.current?.querySelectorAll<HTMLButtonElement>('.hdr-role-btn')
                if (!tabs?.length) return
                const next = e.key === 'ArrowRight'
                  ? (i + 1) % tabs.length
                  : (i - 1 + tabs.length) % tabs.length
                tabs[next]?.focus()
              }}
              ref={el => {
                if (el) el.setAttribute('aria-selected', viewRole === tab.id ? 'true' : 'false')
              }}
            >
              <span className="hdr-role-icon" aria-hidden="true">{tab.icon}</span>
              <span className="hdr-role-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ РЯДОК 2: Main row ════════════════════════════════════════════════ */}
      <div className="hdr-main">

        {/* Логотип */}
        <button
          className="hdr-logo"
          onClick={() => go('/')}
          aria-label="Перейти на головну сторінку"
        >
          <span className="hdr-logo-gem" aria-hidden="true">⭐</span>
          <span >Starway</span>
        </button>

        {/* Desktop nav */}
        <nav className="hdr-nav" aria-label="Головна навігація">
          {filteredNav.map(menu => {
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

        {/* Controls */}
        <div className="hdr-controls">
          {/* Search */}
          <div className="hdr-search">
            <span className="hdr-search-ico" aria-hidden="true">🔍</span>
            <input
              className="hdr-search-input"
              type="search"
              placeholder="Пошук"
              aria-label="Поле пошуку"
            />
          </div>

          {/* ── ВИПРАВЛЕНО: умовний рендер залогінений/гість ─────────────── */}
          {isAuthenticated ? (
            <>
              {wheelCooldown && !wheelCooldown.canFill && (
                <div className="relative flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                    <span className="text-xs font-bold text-[#4d7fe8]">
                      {wheelCooldown.regenLeft}/3
                    </span>
                  </div>
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-[var(--text-muted)]">
                    колесо
                  </span>
                </div>
              )}
              <button className="hdr-notif" aria-label="Сповіщення">
                🔔
                <span className="hdr-notif-dot" aria-label="2 непрочитані">2</span>
              </button>
              <UserMenu variant="header" />
            </>
          ) : (
            <>
              <button
                className="hdr-btn-ghost"
                onClick={onLoginClick}
                aria-label="Увійти"
              >
                Увійти
              </button>
              <button
                className="hdr-btn-accent"
                onClick={onRegisterClick}
                aria-label="Реєстрація"
              >
                Старт →
              </button>
            </>
          )}

          {/* Burger */}
          <button
            className={`hdr-burger${mobileOpen ? ' hdr-burger--open' : ''}`}
            aria-label={mobileOpen ? 'Закрити меню' : 'Відкрити меню'}
            aria-controls="hdr-bmenu"
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

      {/* ══ БУРГЕР МЕНЮ ══════════════════════════════════════════════════════ */}
      <div
        id="hdr-bmenu"
        className={`hdr-bmenu${mobileOpen ? ' hdr-bmenu--open' : ''}`}
        ref={el => {
          if (el) el.setAttribute('aria-hidden', mobileOpen ? 'false' : 'true')
        }}
      >
        <div className="hdr-bmenu-inner">
          <div className="hdr-bmenu-search">
            <span aria-hidden="true">🔍</span>
            <input type="search" placeholder="Пошук" aria-label="Пошук у меню" />
          </div>
          {filteredNav.map(menu =>
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
          )}

          {/* Гостьові кнопки в бургері */}
          {!isAuthenticated && (
            <div className="hdr-bmenu-auth">
              <button
                className="hdr-btn-ghost"
                onClick={() => { onLoginClick?.(); setMobileOpen(false) }}
              >
                Увійти
              </button>
              <button
                className="hdr-btn-accent"
                onClick={() => { onRegisterClick?.(); setMobileOpen(false) }}
              >
                Старт →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabpanels для role-tabs (WAI-ARIA вимога) */}
      {ROLE_TABS.map(tab => (
        <div
          key={`tabpanel-${tab.id}`}
          id={`hdr-tabpanel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`hdr-tab-${tab.id}`}
          hidden={viewRole !== tab.id}
          className="hdr-tabpanel"
        />
      ))}

    </header>
  )
}
