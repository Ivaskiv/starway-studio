// frontend/src/layout/MainLayout.tsx
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import BottomNav from '@/components/miniapp/BottomNav'
import AuthModal from '@/features/auth/components/AuthModal'
import DeepLinkAuthBridge from '@/features/auth/components/DeepLinkAuthBridge'
import { useAppSelector } from '@/app/hooks'
import { resolvePreferredAuthMode } from '@/features/auth/services/token'
import { selectIsAuthenticated } from '@/features/auth/services/auth.slice'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { isTelegramMiniAppContext } from '@/features/social/utils/telegramWebApp'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import Breadcrumb from '@/layout/Breadcrumb'
import Footer from '@/layout/Footer'
import Header from '@/layout/Header'
import Sidebar from '@/layout/Sidebar'

import type { AppView, PreviewRole } from '@/layout/types/layout.types'

interface MainLayoutProps {
  dashboard?: boolean
}

type PageContext = {
  title: string
  subtitle: string
  status?: string
}

function getPageContext(pathname: string, isDashboardShell: boolean): PageContext | null {
  if (pathname === '/' || pathname === '/dashboard' || pathname === '/miniapp') return null

  const contexts: Array<[RegExp, PageContext]> = [
    [/^\/dashboard\/cycle/, { title: '', subtitle: '', status: 'Сесія в процесі' }],
    [/^\/dashboard\/ai-mentor/, { title: 'Відкрий асистента', subtitle: 'Постав запит або пройди коротку сесію.', status: 'Асистент готовий' }],
    [/^\/dashboard\/wheel/, { title: 'Оціни свій стан', subtitle: 'Пройди колесо балансу і знайди точку фокусу.', status: 'Крок самодіагностики' }],
    [/^\/dashboard\/progress/, { title: 'Шлях', subtitle: 'Подивись ритм дня, події та наступний крок в одному просторі.', status: 'Журнал і прогрес' }],
    [/^\/dashboard\/journal/, { title: 'Шлях', subtitle: 'Подивись ритм дня, події та наступний крок в одному просторі.', status: 'Журнал і прогрес' }],
    [/^\/dashboard\/profile/, { title: 'Мій профіль', subtitle: 'Перевір канали доступу та основні дані акаунта.', status: 'Профіль активний' }],
    [/^\/dashboard\/notifications/, { title: 'Сценарії повідомлень', subtitle: 'Перевір логіку Telegram, trial, win-back і renewal в одному місці.', }],
    [/^\/dashboard\/subscription/, { title: 'Онови доступ', subtitle: 'Подивись план і виріши, як рухатись далі.', status: 'Доступ і плани' }],
    [/^\/dashboard\/(courses|products|vision|goals|actions)/, { title: 'Обери наступний крок', subtitle: '', status: 'Крок самодіагностики' }],
    [/^\/subscription/, { title: 'Обери доступ', subtitle: 'Подивись умови і відкрий наступний рівень системи.', status: 'Плани Starway' }],
    [/^\/profile/, { title: 'Керуй профілем', subtitle: 'Онови дані і продовжуй роботу без зайвих кроків.', status: 'Профіль відкрито' }],
  ]

  const match = contexts.find(([pattern]) => pattern.test(pathname))
  if (match) return match[1]
  return null
}

function PageIntro({
  context,
  onBack,
}: {
  context: PageContext
  onBack: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-4">
      <div className="min-w-0">
        {context.title?.trim() ? (
          <h1 className="text-lg font-bold text-[var(--text-primary)]">{context.title}</h1>
        ) : null}
        {context.subtitle?.trim() ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{context.subtitle}</p>
        ) : null}
        {context.status ? (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-soft-rgb))]">
            {context.status}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onBack}
        className="hero-cta-secondary whitespace-nowrap px-3 py-1.5 text-xs font-semibold"
      >
        ← Назад
      </button>
    </div>
  )
}

export default function MainLayout({
  dashboard = false,
}: MainLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const isEmbeddedFrame = useMemo(
    () => new URLSearchParams(location.search).get('embedded') === '1',
    [location.search],
  )

  const [collapsed,   setCollapsed]   = useState(false)
  const [view,        setView]        = useState<AppView>('navigation')
  const [previewRole, setPreviewRole] = useState<PreviewRole>('user')
  const [authMode,    setAuthMode]    = useState<'login' | 'register'>(resolvePreferredAuthMode('login'))
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isCompactViewport, setIsCompactViewport] = useState(false)

  const user = useAppSelector((state) => state.auth.user)
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { state } = useSystemState()
  const { navigateTo } = useSmartNavigation()

  const isMiniAppContext = isTelegramMiniAppContext(location.pathname)
  const isStandaloneMiniAppRoute = location.pathname.startsWith('/miniapp')
  const miniAppRouteTarget = useMemo(() => {
    if (!isMiniAppContext) return null

    if (location.pathname === '/dashboard') return '/miniapp'
    if (location.pathname.startsWith('/dashboard/cycle')) {
      const search = new URLSearchParams(location.search)
      const session = search.get('session')
      if (session === 'evening') return '/miniapp/mentor?context=evening'
      if (session === 'morning') return '/miniapp/mentor?context=morning'
      return '/miniapp/mentor'
    }
    if (location.pathname.startsWith('/dashboard/ai-mentor')) return '/miniapp/mentor'
    if (location.pathname.startsWith('/dashboard/progress') || location.pathname.startsWith('/dashboard/journal')) return '/miniapp/tracker'
    if (location.pathname.startsWith('/dashboard/profile') || location.pathname.startsWith('/dashboard/settings')) return '/miniapp/profile'
    if (
      location.pathname.startsWith('/dashboard/courses') ||
      location.pathname.startsWith('/dashboard/products') ||
      location.pathname.startsWith('/dashboard/vision') ||
      location.pathname.startsWith('/dashboard/goals') ||
      location.pathname.startsWith('/dashboard/actions')
    ) {
      return '/miniapp/library'
    }

    return null
  }, [isMiniAppContext, location.pathname])
  const pageContext = getPageContext(location.pathname, dashboard || isAuthenticated)

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
      setAuthMode(resolvePreferredAuthMode('login'))
      setAuthModalOpen(true)
    },
    onRegisterClick: () => {
      setAuthMode(resolvePreferredAuthMode('register'))
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
    if (!miniAppRouteTarget) return
    if (`${location.pathname}${location.search}` === miniAppRouteTarget) return
    navigate(miniAppRouteTarget, { replace: true })
  }, [location.pathname, location.search, miniAppRouteTarget, navigate])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 768px)')
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
  const shouldShowSidebar = shouldUseDashboardShell && !isEmbeddedFrame && !isMiniAppContext && !isCompactViewport
  const shouldShowMiniAppNav = shouldUseDashboardShell && !isEmbeddedFrame && isMiniAppContext && !location.pathname.startsWith('/miniapp')
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
    if (location.pathname.startsWith('/dashboard/progress') || location.pathname.startsWith('/dashboard/journal')) {
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
        navigateTo('/dashboard/journal', { requiresAuth: true })
        return
      case 'profile':
        navigateTo('/dashboard/profile', { requiresAuth: true })
        return
      default:
        navigateTo('/dashboard', { requiresAuth: true })
    }
  }

  if (isStandaloneMiniAppRoute) {
    return (
      <>
        <DeepLinkAuthBridge />
        <Outlet />
      </>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD + LOGGED-IN LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  if (shouldUseDashboardShell) {
    return (
      <>
        <DeepLinkAuthBridge />
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
          {!isEmbeddedFrame ? (
            <Header
              {...layoutControls}
              {...authCallbacks}
              forceBurgerMenu={isMiniAppContext || isCompactViewport}
              miniAppMode={isMiniAppContext}
            />
          ) : null}

          <div className={`flex-1 ${isEmbeddedFrame ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {isHomePage ? (
              <>
                <main className={isEmbeddedFrame ? 'h-full' : 'min-h-screen'}>
                  <Outlet />
                </main>
                {!isMiniAppContext && !isEmbeddedFrame ? <Footer /> : null}
              </>
            ) : (
              <div className="flex min-h-full flex-col">
                {!isEmbeddedFrame ? <Breadcrumb /> : null}
                {pageContext && !isEmbeddedFrame ? (
                  <PageIntro
                    context={pageContext}
                    onBack={() => navigateTo('/dashboard', { requiresAuth: true })}
                  />
                ) : null}
                <main className={isEmbeddedFrame ? 'h-full flex-1' : `min-h-[60vh] flex-1 px-3 ${shouldShowMiniAppNav ? 'pb-32' : 'pb-6'}`}><Outlet /></main>
                {!isMiniAppContext && !isEmbeddedFrame ? <Footer /> : null}
              </div>
            )}
          </div>

          {shouldShowMiniAppNav && (
            <>
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
      </>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC / LANDING LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <DeepLinkAuthBridge />
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">

      {/* ── ВИПРАВЛЕНО: передаємо authCallbacks ── */}
      <Header
        {...layoutControls}
        {...authCallbacks}
        forceBurgerMenu={isMiniAppContext || isCompactViewport}
        miniAppMode={isMiniAppContext}
      />

      {!isHomePage ? <Breadcrumb /> : null}

      {!isHomePage && pageContext ? (
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6">
          <PageIntro
            context={pageContext}
            onBack={() => navigateTo('/', { requiresAuth: false })}
          />
        </div>
      ) : null}

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
    </>
  )
}
