import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import BottomNav, {
  type BottomNavTab,
  type BottomNavVariant,
} from '@/components/miniapp/BottomNav'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import type { MiniAppPageId } from '@/features/social/types/miniapp'
import DashboardSideRails from '@/layout/DashboardSideRails'

type MiniAppLayoutProps = {
  activeTab: MiniAppPageId
  children: ReactNode
  navVariant?: BottomNavVariant
}

type TelegramWebApp = {
  onEvent?: (event: string, handler: () => void) => void
  offEvent?: (event: string, handler: () => void) => void
  initDataUnsafe?: {
    start_param?: string
  }
}

const USER_ZOOM_ROUTE = '/miniapp/zoom-calendar?zoomRole=user'
const COACH_ZOOM_ROUTE = '/miniapp/zoom-calendar?zoomRole=coach'

const START_PARAM_ROUTE_MAP: Readonly<Record<string, string>> = {
  home: '/miniapp/zoom-calendar',
  ai: '/miniapp/mentor',
  ai_morning: '/miniapp/mentor?context=morning',
  ai_evening: '/miniapp/mentor?context=evening',
  task: '/miniapp/mentor?section=tasks',
  tasks: '/miniapp/mentor?section=tasks',
  planner: '/miniapp/mentor?section=tasks',
  assistant: '/miniapp/mentor',
  tracker: '/miniapp/tracker',
  journal: '/miniapp/journal',
  library: '/miniapp/library',
  content: '/miniapp/library',
  zoom: '/miniapp/zoom-calendar',
  zoom_booking: '/miniapp/zoom-calendar?intent=booking',
  profile: '/miniapp/profile',
  subscription: '/miniapp/profile?panel=subscription',
  level_up: '/miniapp/profile?panel=level_up',
}

const COACH_TAB_BY_HASH: Readonly<
  Partial<Record<string, BottomNavTab>>
> = {
  '#participants': 'participants',
  '#battle': 'battle',
  '#analytics': 'analytics',
  '#more': 'more',
}

function getTelegramWebApp(): TelegramWebApp | undefined {
  return (
    window as typeof window & {
      Telegram?: {
        WebApp?: TelegramWebApp
      }
    }
  ).Telegram?.WebApp
}

function getTelegramStartParam(webApp: TelegramWebApp | undefined): string {
  const runtimeStartParam = webApp?.initDataUnsafe?.start_param?.trim()

  if (runtimeStartParam) {
    return runtimeStartParam
  }

  const search = new URLSearchParams(window.location.search)

  return (
    search.get('startapp')?.trim() ??
    search.get('tgWebAppStartParam')?.trim() ??
    ''
  )
}

function resolveUserStartRoute(
  route: string,
  hasAiMentorAccess: boolean,
  hasCoreAccess: boolean,
): string {
  if (route.startsWith('/miniapp/mentor') && !hasAiMentorAccess) {
    return `${USER_ZOOM_ROUTE}&panel=ai`
  }

  if (route === '/miniapp/tracker' && !hasCoreAccess) {
    return `${USER_ZOOM_ROUTE}&panel=progress`
  }

  if (route === '/miniapp/library') {
    return `${USER_ZOOM_ROUTE}&panel=materials`
  }

  if (route.startsWith('/miniapp/profile')) {
    return `${USER_ZOOM_ROUTE}&panel=more`
  }

  return withZoomRole(route, 'user')
}

function withZoomRole(route: string, zoomRole: 'user' | 'coach'): string {
  const [pathAndSearch, hash = ''] = route.split('#', 2)
  const [pathname, search = ''] = pathAndSearch.split('?', 2)

  if (pathname !== '/miniapp/zoom-calendar') return route

  const params = new URLSearchParams(search)
  params.set('zoomRole', zoomRole)
  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ''}`
}

function resolveActiveTab({
  activeTab,
  navVariant,
  pathname,
  search,
  hash,
}: {
  activeTab: MiniAppPageId
  navVariant: BottomNavVariant
  pathname: string
  search: string
  hash: string
}): BottomNavTab {
  if (navVariant === 'coach') {
    return COACH_TAB_BY_HASH[hash] ?? 'home'
  }

  if (pathname === '/miniapp/zoom-calendar') {
    const panel = new URLSearchParams(search).get('panel')

    switch (panel) {
      case 'progress':
        return 'tracker'
      case 'materials':
        return 'library'
      case 'ai':
        return 'ai'
      case 'more':
        return 'profile'
      default:
        break
    }
  }

  switch (activeTab) {
    case 'mentor':
      return 'ai'
    case 'journal':
      return 'home'
    default:
      return activeTab
  }
}

export default function MiniAppLayout({
  activeTab,
  children,
  navVariant = 'user',
}: MiniAppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { getModuleAccess, hasCoreAccess } = useSystemState()

  const lastAppliedParamRef = useRef<string | null>(null)

  const hasAiMentorAccess = !getModuleAccess('AI_MENTOR').isLocked

  const applyStartParam = useCallback(() => {
    const webApp = getTelegramWebApp()
    const startParam = getTelegramStartParam(webApp)

    if (!startParam) {
      return
    }

    const mappedRoute = START_PARAM_ROUTE_MAP[startParam]

    if (!mappedRoute) {
      return
    }

    const targetRoute =
      navVariant === 'user'
        ? resolveUserStartRoute(
            mappedRoute,
            hasAiMentorAccess,
            hasCoreAccess,
          )
        : withZoomRole(mappedRoute, 'coach')

    const currentRoute = `${location.pathname}${location.search}`

    if (currentRoute === targetRoute) {
      lastAppliedParamRef.current = startParam
      return
    }

    if (
      lastAppliedParamRef.current === startParam &&
      location.pathname !== '/miniapp'
    ) {
      return
    }

    lastAppliedParamRef.current = startParam
    navigate(targetRoute, { replace: true })
  }, [
    hasAiMentorAccess,
    hasCoreAccess,
    location.pathname,
    location.search,
    navigate,
    navVariant,
  ])

  useEffect(() => {
    const webApp = getTelegramWebApp()

    applyStartParam()
    webApp?.onEvent?.('activated', applyStartParam)

    return () => {
      webApp?.offEvent?.('activated', applyStartParam)
    }
  }, [applyStartParam])

  const resolvedActiveTab = useMemo(
    () =>
      resolveActiveTab({
        activeTab,
        navVariant,
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      }),
    [
      activeTab,
      location.hash,
      location.pathname,
      location.search,
      navVariant,
    ],
  )

  const handleTabChange = useCallback(
    (tab: BottomNavTab) => {
      if (navVariant === 'coach') {
        switch (tab) {
          case 'participants':
          case 'battle':
          case 'analytics':
          case 'more':
            navigate(`${COACH_ZOOM_ROUTE}#${tab}`)
            return

          case 'home':
            navigate(COACH_ZOOM_ROUTE)
            return

          default:
            return
        }
      }

      switch (tab) {
        case 'library':
          navigate(`${USER_ZOOM_ROUTE}&panel=materials`)
          return

        case 'ai':
          navigate(
            hasAiMentorAccess
              ? '/miniapp/mentor'
              : `${USER_ZOOM_ROUTE}&panel=ai`,
          )
          return

        case 'tracker':
          navigate(
            hasCoreAccess
              ? '/miniapp/tracker'
              : `${USER_ZOOM_ROUTE}&panel=progress`,
          )
          return

        case 'profile':
          navigate(`${USER_ZOOM_ROUTE}&panel=more`)
          return

        default:
          navigate(USER_ZOOM_ROUTE)
      }
    },
    [hasAiMentorAccess, hasCoreAccess, navigate, navVariant],
  )

  return (
    <div className="miniapp-page-shell mx-auto flex min-h-[100dvh] w-full flex-col bg-[#07111f] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-[980px] min-w-0 items-start gap-3">
        <div className="hidden md:block md:pt-4">
          <DashboardSideRails />
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto pb-32">
          {children}
        </div>
      </div>

      <BottomNav
        activeTab={resolvedActiveTab}
        variant={navVariant}
        onTabChange={handleTabChange}
      />
    </div>
  )
}
