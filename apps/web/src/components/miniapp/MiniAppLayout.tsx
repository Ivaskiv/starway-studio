import { useAuth } from '@/features/auth/hooks/useAuth'
import { selectIsAuthenticated } from '@/features/auth/services/auth.slice'
import { useEffect, useRef, type ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'

import BottomNav from '@/components/miniapp/BottomNav'
import FloatingAIButton from '@/components/miniapp/FloatingAIButton'
import { isTelegramMiniAppContext } from '@/features/social/utils/telegramWebApp'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        initDataUnsafe?: {
          user?: { id?: number; first_name?: string }
        }
      }
    }
  }
}

type MiniTab = 'home' | 'library' | 'ai' | 'tracker' | 'profile'

interface MiniAppLayoutProps {
  children: ReactNode
  activeTab: MiniTab
  onTabChange: (tab: MiniTab) => void
  onOpenChat: () => void
  userName?: string
}

export default function MiniAppLayout({
  children,
  activeTab,
  onTabChange,
  onOpenChat,
  userName,
}: MiniAppLayoutProps) {
  const location = useLocation()
  const { loginWithSocial } = useAuth()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const telegramAuthAttemptedRef = useRef(false)
  const isTelegramWebApp = isTelegramMiniAppContext(location.pathname)
  const shouldUseMiniAppShell = isTelegramWebApp || location.pathname.startsWith('/miniapp')

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return
    if (window.Telegram?.WebApp) return

    const existing = document.querySelector<HTMLScriptElement>('script[data-telegram-webapp-sdk="true"]')
    if (existing) return

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-web-app.js'
    script.async = true
    script.dataset.telegramWebappSdk = 'true'
    document.head.appendChild(script)

    return () => {
      if (!window.Telegram?.WebApp) {
        script.remove()
      }
    }
  }, [])

  useEffect(() => {
    if (!window.Telegram?.WebApp) return
    window.Telegram.WebApp.ready()
    window.Telegram.WebApp.expand()
  }, [])

  useEffect(() => {
    if (!window.Telegram?.WebApp?.initDataUnsafe?.user) return
    if (isAuthenticated) return
    if (telegramAuthAttemptedRef.current) return

    telegramAuthAttemptedRef.current = true

    void loginWithSocial('telegram').catch(error => {
      console.warn('[MiniAppLayout] Telegram auto-login failed', error)
      telegramAuthAttemptedRef.current = false
    })
  }, [isAuthenticated, loginWithSocial])

  if (!shouldUseMiniAppShell) {
    return <>{children}</>
  }

  return (
    <div className="miniapp-layout">
      <div className="miniapp-layout__content">
        {children}
      </div>
      <FloatingAIButton onOpenChat={onOpenChat} userName={userName} />
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  )
}
