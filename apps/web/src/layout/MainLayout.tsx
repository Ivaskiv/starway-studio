// frontend/src/layout/MainLayout.tsx
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import AuthModal from '@/features/auth/components/AuthModal'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import BottomNav from '@/components/miniapp/BottomNav'
import FloatingAIButton from '@/components/miniapp/FloatingAIButton'
import { isTelegramMiniAppContext } from '@/features/social/utils/telegramWebApp'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
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
    [/^\/dashboard\/cycle/, { title: 'Пройди чекін', subtitle: 'Відповідай на питання і рухайся до наступного кроку.', status: 'Сесія в процесі' }],
    [/^\/dashboard\/ai-mentor/, { title: 'Відкрий асистента', subtitle: 'Постав запит або пройди коротку сесію.', status: 'Асистент готовий' }],
    [/^\/dashboard\/wheel/, { title: 'Оціни свій стан', subtitle: 'Пройди колесо балансу і знайди точку фокусу.', status: 'Крок самодіагностики' }],
    [/^\/dashboard\/progress/, { title: 'Подивись прогрес', subtitle: 'Оціни динаміку і обери, що робити далі.', status: 'Аналітика доступна' }],
    [/^\/dashboard\/profile/, { title: 'Мій профіль', subtitle: 'Перевір канали доступу та основні дані акаунта.', status: 'Профіль активний' }],
    [/^\/dashboard\/subscription/, { title: 'Онови доступ', subtitle: 'Подивись план і виріши, як рухатись далі.', status: 'Доступ і плани' }],
    [/^\/dashboard\/(courses|products|vision|goals|actions)/, { title: 'Обери наступний крок', subtitle: 'Відкрий матеріал або інструмент, який рухає тебе далі.', status: 'Каталог доступний' }],
    [/^\/subscription/, { title: 'Обери доступ', subtitle: 'Подивись умови і відкрий наступний рівень системи.', status: 'Плани Starway' }],
    [/^\/profile/, { title: 'Керуй профілем', subtitle: 'Онови дані і продовжуй роботу без зайвих кроків.', status: 'Профіль відкрито' }],
  ]

  const match = contexts.find(([pattern]) => pattern.test(pathname))
  if (match) return match[1]

  if (isDashboardShell && pathname.startsWith('/dashboard/')) {
    return {
      title: 'Продовжуй роботу',
      subtitle: 'Відкрий потрібний блок і зроби наступну дію без зайвих переходів.',
      // status: 'Starway dashboard',
    }
  }

  return {
    title: 'Продовжуй далі',
    subtitle: 'На цьому екрані є все потрібне для наступної дії.',
  }
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
        <h1 className="text-lg font-bold text-[var(--text-primary)]">{context.title}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{context.subtitle}</p>
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
  const miniAppRouteTarget = useMemo(() => {
    if (!isMiniAppContext) return null

    if (location.pathname === '/dashboard') return '/miniapp'
    if (location.pathname.startsWith('/dashboard/ai-mentor')) return '/miniapp/mentor'
    if (location.pathname.startsWith('/dashboard/progress')) return '/miniapp/tracker'
    if (location.pathname.startsWith('/dashboard/journal')) return '/miniapp/journal'
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
                {pageContext ? (
                  <PageIntro
                    context={pageContext}
                    onBack={() => navigateTo('/dashboard', { requiresAuth: true })}
                  />
                ) : null}
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
  )
}
