import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import BottomNav, { type BottomNavTab, type BottomNavVariant } from '@/components/miniapp/BottomNav'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import DashboardSideRails from '@/layout/DashboardSideRails'
import type { MiniAppPageId } from '@/features/social/types/miniapp'

type MiniAppLayoutProps = {
  activeTab: MiniAppPageId
  children: ReactNode
  navVariant?: BottomNavVariant
}

const START_PARAM_ROUTE_MAP: Record<string, string> = {
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

function getTelegramStartParam() {
  const telegram = (window as {
    Telegram?: {
      WebApp?: {
        onEvent?: (event: string, handler: () => void) => void
        offEvent?: (event: string, handler: () => void) => void
        initDataUnsafe?: {
          start_param?: string
        }
      }
    }
  }).Telegram

  const runtimeStartParam = telegram?.WebApp?.initDataUnsafe?.start_param?.trim()
  if (runtimeStartParam) return runtimeStartParam

  const search = new URLSearchParams(window.location.search)
  return search.get('startapp')?.trim() ?? search.get('tgWebAppStartParam')?.trim() ?? ''
}

export default function MiniAppLayout({
  activeTab,
  children,
  navVariant = 'user',
}: MiniAppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { getModuleAccess, hasCoreAccess } = useSystemState()
  const handledRef = useRef(false)
  const lastAppliedParamRef = useRef<string | null>(null)
  const hasAiMentorAccess = !getModuleAccess('AI_MENTOR').isLocked

  useEffect(() => {
    const telegram = (window as {
      Telegram?: {
        WebApp?: {
          onEvent?: (event: string, handler: () => void) => void
          offEvent?: (event: string, handler: () => void) => void
        }
      }
    }).Telegram

    const applyStartParam = () => {
      const startParam = getTelegramStartParam()
      let targetRoute = START_PARAM_ROUTE_MAP[startParam]

      if (!startParam || !targetRoute) return
      if (navVariant === 'user') {
        if (targetRoute.startsWith('/miniapp/mentor') && !hasAiMentorAccess) {
          targetRoute = '/miniapp/zoom-calendar?zoomRole=user&panel=ai'
        }
        if (targetRoute === '/miniapp/tracker' && !hasCoreAccess) {
          targetRoute = '/miniapp/zoom-calendar?zoomRole=user&panel=progress'
        }
        if (targetRoute === '/miniapp/library') {
          targetRoute = '/miniapp/zoom-calendar?zoomRole=user&panel=materials'
        }
        if (targetRoute.startsWith('/miniapp/profile')) {
          targetRoute = '/miniapp/zoom-calendar?zoomRole=user&panel=more'
        }
      }

      const currentRoute = `${location.pathname}${location.search}`
      if (currentRoute === targetRoute) return
      if (lastAppliedParamRef.current === startParam && location.pathname !== '/miniapp') return

      lastAppliedParamRef.current = startParam
      navigate(targetRoute, { replace: true })
    }

    if (!handledRef.current) {
      handledRef.current = true
      applyStartParam()
    }

    telegram?.WebApp?.onEvent?.('activated', applyStartParam)

    return () => {
      telegram?.WebApp?.offEvent?.('activated', applyStartParam)
    }
  }, [hasAiMentorAccess, hasCoreAccess, location.pathname, location.search, navigate, navVariant])

  useEffect(() => {
    if (navVariant !== 'coach') return
    const section = location.hash.slice(1)
    if (!['participants', 'battle', 'analytics', 'more'].includes(section)) return

    document.getElementById(section)?.scrollIntoView({ block: 'start' })
  }, [location.hash, navVariant])

  const userPanel = new URLSearchParams(location.search).get('panel')
  const coachTabByHash: Record<string, BottomNavTab> = {
    '#participants': 'participants',
    '#battle': 'battle',
    '#analytics': 'analytics',
    '#more': 'more',
  }
  const resolvedActiveTab: BottomNavTab = navVariant === 'coach' && coachTabByHash[location.hash]
    ? coachTabByHash[location.hash]
    : navVariant === 'user' && location.pathname === '/miniapp/zoom-calendar' && userPanel === 'progress'
      ? 'tracker'
      : navVariant === 'user' && location.pathname === '/miniapp/zoom-calendar' && userPanel === 'materials'
        ? 'library'
        : navVariant === 'user' && location.pathname === '/miniapp/zoom-calendar' && userPanel === 'ai'
          ? 'ai'
          : navVariant === 'user' && location.pathname === '/miniapp/zoom-calendar' && userPanel === 'more'
            ? 'profile'
            : activeTab === 'mentor'
              ? 'ai'
              : activeTab === 'journal'
                ? 'home'
                : activeTab

  return (
    <div className="miniapp-page-shell mx-auto flex w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
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
        onTabChange={(tab: BottomNavTab) => {
          if (navVariant === 'coach') {
            switch (tab) {
              case 'participants':
              case 'battle':
              case 'analytics':
              case 'more':
                navigate(`/miniapp/zoom-calendar#${tab}`)
                return
              case 'home':
                navigate('/miniapp/zoom-calendar')
                return
              default:
                return
            }
          }

          switch (tab) {
            case 'library':
              navigate('/miniapp/zoom-calendar?zoomRole=user&panel=materials')
              return
            case 'ai':
              navigate(hasAiMentorAccess
                ? '/miniapp/mentor'
                : '/miniapp/zoom-calendar?zoomRole=user&panel=ai')
              return
            case 'tracker':
              navigate(hasCoreAccess
                ? '/miniapp/tracker'
                : '/miniapp/zoom-calendar?zoomRole=user&panel=progress')
              return
            case 'profile':
              navigate('/miniapp/zoom-calendar?zoomRole=user&panel=more')
              return
            default:
              navigate('/miniapp/zoom-calendar?zoomRole=user')
          }
        }}
      />
    </div>
  )
}
