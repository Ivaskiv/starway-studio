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
        initData: string
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
  const { isAuthenticated, loginWithSocial, loginWithTelegramMiniApp } = useAuth()
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

  const telegramInitData = typeof Telegram === 'undefined' ? '' : Telegram.WebApp.initData
  const telegramUser = typeof Telegram === 'undefined' ? null : Telegram.WebApp.initDataUnsafe.user
  const allowDevFallback =
    import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  useEffect(() => {
    if (isAuthenticated) {
      setIsBootstrappingAuth(false)
      return
    }

    if (!telegramUser?.id) return
    if (autoLoginAttemptedRef.current) return

    autoLoginAttemptedRef.current = true
    setIsBootstrappingAuth(true)

    const loginPromise = telegramInitData
      ? loginWithTelegramMiniApp(telegramInitData)
      : allowDevFallback
        ? loginWithSocial('telegram')
        : Promise.reject(new Error('Telegram initData is missing'))

    void loginPromise.catch((error) => {
      console.warn('[useMiniAppTelegram] Telegram auto-login failed', error)
      autoLoginAttemptedRef.current = false
      setIsBootstrappingAuth(false)
    })
  }, [allowDevFallback, isAuthenticated, loginWithSocial, loginWithTelegramMiniApp, telegramInitData, telegramUser?.id])

  return {
    isBootstrappingAuth,
    telegramUser,
  }
}
