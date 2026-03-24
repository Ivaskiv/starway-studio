import { useEffect, useRef } from 'react'
import { useState } from 'react'

import { useAuth } from '@/features/auth/hooks/useAuth'
import type { MiniAppPageId } from '@/features/social/types/miniapp'

declare const Telegram:
  | {
      WebApp: {
        ready: () => void
        expand: () => void
        MainButton: {
          setText: (text: string) => void
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
        }
        initDataUnsafe: {
          user?: { id: number; first_name: string; username?: string }
          start_param?: string
        }
      }
    }
  | undefined

interface UseMiniAppTelegramOptions {
  onOpenMentor: () => void
  onOpenStarway: () => void
  page: MiniAppPageId
}

export function useMiniAppTelegram({
  onOpenMentor,
  onOpenStarway,
  page,
}: UseMiniAppTelegramOptions) {
  const { isAuthenticated, loginWithSocial } = useAuth()
  const autoLoginAttemptedRef = useRef(false)
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(false)

  useEffect(() => {
    if (typeof Telegram === 'undefined') return
    Telegram.WebApp.ready()
    Telegram.WebApp.expand()
  }, [])

  useEffect(() => {
    if (typeof Telegram === 'undefined') return

    Telegram.WebApp.MainButton.setText(page === 'mentor' ? 'Відкрити асистента' : 'Відкрити Starway')
    Telegram.WebApp.MainButton.onClick(() => {
      if (page === 'mentor') {
        onOpenMentor()
        return
      }

      onOpenStarway()
    })
    Telegram.WebApp.MainButton.show()

    return () => {
      Telegram.WebApp.MainButton.hide()
    }
  }, [onOpenMentor, onOpenStarway, page])

  const telegramUser = typeof Telegram === 'undefined' ? null : Telegram.WebApp.initDataUnsafe.user

  useEffect(() => {
    if (isAuthenticated) {
      setIsBootstrappingAuth(false)
      return
    }

    if (!telegramUser?.id) return
    if (autoLoginAttemptedRef.current) return

    autoLoginAttemptedRef.current = true
    setIsBootstrappingAuth(true)

    void loginWithSocial('telegram').catch((error) => {
      console.warn('[useMiniAppTelegram] Telegram auto-login failed', error)
      autoLoginAttemptedRef.current = false
      setIsBootstrappingAuth(false)
    })
  }, [isAuthenticated, loginWithSocial, telegramUser?.id])

  return {
    isBootstrappingAuth,
    telegramUser,
  }
}
