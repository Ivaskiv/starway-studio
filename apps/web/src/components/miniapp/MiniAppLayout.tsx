import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import BottomNav from '@/components/miniapp/BottomNav'
import type { AppDispatch } from '@/app/store'
import { useTelegramMiniAppAuthMutation } from '@/features/auth/services/auth.api'
import { selectAuthStatus, setLoading } from '@/features/auth/services/auth.slice'
import DashboardSideRails from '@/layout/DashboardSideRails'
import type { MiniAppPageId } from '@/features/social/types/miniapp'

type MiniAppLayoutProps = {
  activeTab: MiniAppPageId
  children: ReactNode
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
}: MiniAppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const handledRef = useRef(false)
  const lastAppliedParamRef = useRef<string | null>(null)
  const dispatch = useDispatch<AppDispatch>()
  const authStatus = useSelector(selectAuthStatus)
  const [telegramMiniAppAuth] = useTelegramMiniAppAuthMutation()
  const authBootstrapRef = useRef(false)

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
      const targetRoute = START_PARAM_ROUTE_MAP[startParam]

      if (!startParam || !targetRoute) return

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
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    if (authBootstrapRef.current) return
    if (authStatus === 'authenticated' || authStatus === 'loading') return

    const initData = (window as {
      Telegram?: { WebApp?: { initData?: string } }
    }).Telegram?.WebApp?.initData?.trim() ?? ''

    if (!initData) return

    authBootstrapRef.current = true
    dispatch(setLoading())
    void telegramMiniAppAuth({ initData })
  }, [authStatus, dispatch, telegramMiniAppAuth])

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
        activeTab={activeTab === 'mentor' ? 'ai' : activeTab === 'journal' ? 'home' : activeTab}
        onTabChange={(tab) => {
          switch (tab) {
            case 'library':
              navigate('/miniapp/library')
              return
            case 'ai':
              navigate('/miniapp/mentor')
              return
            case 'tracker':
              navigate('/miniapp/tracker')
              return
            case 'profile':
              navigate('/miniapp/profile')
              return
            default:
              navigate('/miniapp/zoom-calendar')
          }
        }}
      />
    </div>
  )
}
