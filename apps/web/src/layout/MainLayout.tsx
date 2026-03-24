// frontend/src/layout/MainLayout.tsx
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import AuthModal from '@/features/auth/components/AuthModal'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import BottomNav from '@/components/miniapp/BottomNav'
import FloatingAIButton from '@/components/miniapp/FloatingAIButton'
import { isTelegramMiniAppContext } from '@/features/social/utils/telegramWebApp'
import SettingsBreadcrumbAction from '@/features/settings/components/SettingsBreadcrumbAction'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import Breadcrumbs from '@/layout/Breadcrumbs'
import Footer from '@/layout/Footer'
import Header from '@/layout/Header'
import Sidebar from '@/layout/Sidebar'

import type { AppView, PreviewRole } from '@/layout/types/layout.types'

interface MainLayoutProps {
  showBreadcrumbs?: boolean
  dashboard?: boolean
}

export default function MainLayout({
  showBreadcrumbs = true,
  dashboard = false,
}: MainLayoutProps) {
  const location = useLocation()

  const [collapsed,   setCollapsed]   = useState(false)
  const [view,        setView]        = useState<AppView>('navigation')
  const [previewRole, setPreviewRole] = useState<PreviewRole>('user')
  const [authMode,    setAuthMode]    = useState<'login' | 'register'>('login')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isCompactViewport, setIsCompactViewport] = useState(false)

  const { user, isAuthenticated } = useAuth()
  const { state } = useSystemState()
  const { navigateTo } = useSmartNavigation()

  const isMiniAppContext = isTelegramMiniAppContext(location.pathname)

  const toggle = () => setCollapsed(c => !c)

  const layoutControls = {
    view,
    onViewChange: setView,
    previewRole,
    onRoleChange: setPreviewRole,
  }

  // ── ВИПРАВЛЕНО: callbacks для Header ────────────────────────────────────
  const authCallbacks = {
    onLoginClick: () => {
      setAuthMode('login')
      setAuthModalOpen(true)
    },
    onRegisterClick: () => {
      setAuthMode('register')
      setAuthModalOpen(true)
    },
  }

  useEffect(() => {
    const rawRole = ((user as any)?.role ?? (state as any)?.user?.role ?? '').toLowerCase()
    if (rawRole === 'superadmin' || rawRole === 'admin') setPreviewRole('superadmin')
    else if (rawRole === 'expert' || rawRole === 'mentor') setPreviewRole('expert')
    else setPreviewRole('user')
  }, [user, state])

  useEffect(() => {
    if (isMiniAppContext) {
      setCollapsed(true)
    }
  }, [isMiniAppContext])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 1024px)')
    const syncViewport = (event?: MediaQueryListEvent) => {
      setIsCompactViewport(event?.matches ?? mediaQuery.matches)
    }

    syncViewport()
    mediaQuery.addEventListener('change', syncViewport)

    return () => {
      mediaQuery.removeEventListener('change', syncViewport)
    }
  }, [])

  const shouldUseDashboardShell = dashboard || isAuthenticated
  const shouldShowSidebar = shouldUseDashboardShell && !isMiniAppContext && !isCompactViewport
  const shouldShowMiniAppNav = shouldUseDashboardShell && isMiniAppContext && !location.pathname.startsWith('/miniapp')
  const isHomePage = location.pathname === '/'

  const activeMiniAppTab = (() => {
    if (location.pathname.startsWith('/dashboard/profile') || location.pathname.startsWith('/dashboard/settings')) {
      return 'profile' as const
    }
    if (
      location.pathname.startsWith('/dashboard/ai-mentor') ||
      location.pathname.startsWith('/dashboard/mentor/')
    ) {
      return 'ai' as const
    }
    if (location.pathname.startsWith('/dashboard/progress')) {
      return 'tracker' as const
    }
    if (
      location.pathname.startsWith('/dashboard/courses') ||
      location.pathname.startsWith('/dashboard/products') ||
      location.pathname.startsWith('/dashboard/vision') ||
      location.pathname.startsWith('/dashboard/goals') ||
      location.pathname.startsWith('/dashboard/actions')
    ) {
      return 'library' as const
    }
    return 'home' as const
  })()

  const handleMiniAppTabChange = (tab: 'home' | 'library' | 'ai' | 'tracker' | 'profile') => {
    switch (tab) {
      case 'library':
        navigateTo('/dashboard/courses', { requiresAuth: true })
        return
      case 'ai':
        navigateTo('/dashboard/ai-mentor', { requiresAuth: true })
        return
      case 'tracker':
        navigateTo('/dashboard/progress', { requiresAuth: true })
        return
      case 'profile':
        navigateTo('/dashboard/profile', { requiresAuth: true })
        return
      default:
        navigateTo('/dashboard', { requiresAuth: true })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD + LOGGED-IN LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  if (shouldUseDashboardShell) {
    return (
      <div className="flex h-screen overflow-hidden">

        {shouldShowSidebar && (
          <Sidebar
            collapsed={collapsed}
            onToggle={toggle}
            view={view}
            previewRole={previewRole}
          />
        )}

        <div className="flex flex-col flex-1 min-w-0">
          {/* ── ВИПРАВЛЕНО: передаємо authCallbacks ── */}
          <Header
            {...layoutControls}
            {...authCallbacks}
            forceBurgerMenu={isMiniAppContext || isCompactViewport}
            miniAppMode={isMiniAppContext}
          />

          <div className="flex-1 overflow-y-auto">
            {isHomePage ? (
              <>
                <main className="min-h-screen">
                  <Outlet />
                </main>
                {!isMiniAppContext && <Footer />}
              </>
            ) : (
              <div className="flex min-h-full flex-col">
                <div className="flex items-center justify-between gap-4 px-3 py-4">
                  <div className="flex-1"><Breadcrumbs /></div>
                  <SettingsBreadcrumbAction />
                </div>
                <main className={`min-h-[60vh] flex-1 px-3 ${shouldShowMiniAppNav ? 'pb-32' : 'pb-6'}`}><Outlet /></main>
                {!isMiniAppContext && <Footer />}
              </div>
            )}
          </div>

          {shouldShowMiniAppNav && (
            <>
              <FloatingAIButton
                onOpenChat={() => navigateTo('/dashboard/ai-mentor', { requiresAuth: true })}
                userName={user?.name ?? user?.firstName ?? undefined}
              />
              <BottomNav
                activeTab={activeMiniAppTab}
                onTabChange={handleMiniAppTabChange}
              />
            </>
          )}
        </div>

        {/* ── ВИПРАВЛЕНО: AuthModal є і в dashboard layout ── */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultMode={authMode}
        />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC / LANDING LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">

      {/* ── ВИПРАВЛЕНО: передаємо authCallbacks ── */}
      <Header
        {...layoutControls}
        {...authCallbacks}
        forceBurgerMenu={isMiniAppContext || isCompactViewport}
        miniAppMode={isMiniAppContext}
      />

      {!isHomePage && (
        <div className="max-w-7xl mx-auto w-full px-5 sm:px-6">
          <Breadcrumbs />
        </div>
      )}

      <main className={isHomePage ? 'flex-1' : 'flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8'}>
        <Outlet />
      </main>

      {!isMiniAppContext && <Footer />}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </div>
  )
}
