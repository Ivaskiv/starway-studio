import { useEffect, useRef } from 'react'
import { useState } from 'react'

import { useAuthRestoreStatus } from '@/features/auth/context/AuthRestoreContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { MiniAppPageId } from '@/features/social/types/miniapp'

const MINI_APP_AUTH_TIMEOUT_MS = 3_000

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
          offClick?: (callback: () => void) => void
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
  const authRestoreStatus = useAuthRestoreStatus()
  const autoLoginAttemptedRef = useRef(false)
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(false)

  useEffect(() => {
    if (typeof Telegram === 'undefined') return
    Telegram.WebApp.ready()
    Telegram.WebApp.expand()
  }, [])

  useEffect(() => {
    if (typeof Telegram === 'undefined') return

    const handleMainButtonClick = () => {
      if (page === 'mentor') {
        onOpenMentor()
        return
      }

      onOpenStarway()
    }

    // Telegram.WebApp.MainButton.setText(page === 'mentor' ? 'Відкрити асистента' : 'Відкрити Starway')
    // Telegram.WebApp.MainButton.offClick?.(handleMainButtonClick)
    Telegram.WebApp.MainButton.onClick(handleMainButtonClick)
    Telegram.WebApp.MainButton.show()

    return () => {
      Telegram.WebApp.MainButton.offClick?.(handleMainButtonClick)
      Telegram.WebApp.MainButton.hide()
    }
  }, [onOpenMentor, onOpenStarway, page])

  const telegramInitData = typeof Telegram === 'undefined' ? '' : Telegram.WebApp.initData
  const telegramUser = typeof Telegram === 'undefined' ? null : Telegram.WebApp.initDataUnsafe.user
  const allowDevFallback =
    import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const isAwaitingRestore = !isAuthenticated && (authRestoreStatus === 'idle' || authRestoreStatus === 'restoring')

  const withBootstrapTimeout = <T,>(promise: Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error('Mini App authentication timed out'))
      }, MINI_APP_AUTH_TIMEOUT_MS)

      promise.then(resolve, reject).finally(() => {
        window.clearTimeout(timeoutId)
      })
    })

  useEffect(() => {
    if (isAwaitingRestore) {
      setIsBootstrappingAuth(true)
      const timeoutId = window.setTimeout(() => {
        setIsBootstrappingAuth(false)
      }, MINI_APP_AUTH_TIMEOUT_MS)

      return () => {
        window.clearTimeout(timeoutId)
      }
    }

    setIsBootstrappingAuth(false)
  }, [isAwaitingRestore])

  useEffect(() => {
    if (isAuthenticated) {
      if (import.meta.env.DEV) {
        console.info('[miniapp/auth] authenticated in Telegram runtime', {
          telegramUserId: telegramUser?.id ?? null,
        })
      }
      setIsBootstrappingAuth(false)
      return
    }

    if (isAwaitingRestore) return
    if (!telegramUser?.id) return
    if (autoLoginAttemptedRef.current) return

    autoLoginAttemptedRef.current = true
    setIsBootstrappingAuth(true)

    if (import.meta.env.DEV) {
      console.info('[miniapp/auth] starting Telegram auto-login', {
        telegramUserId: telegramUser.id,
        hasInitData: Boolean(telegramInitData),
        allowDevFallback,
      })
    }

    const loginPromise = telegramInitData
      ? loginWithTelegramMiniApp(telegramInitData)
      : allowDevFallback
        ? loginWithSocial('telegram')
        : Promise.reject(new Error('Telegram initData is missing'))

    void withBootstrapTimeout(loginPromise)
      .then((result) => {
        if (import.meta.env.DEV) {
          console.info('[miniapp/auth] Telegram auto-login success', {
            email: result.email ?? null,
            isNewUser: result.isNewUser,
            needsCompletion: result.needsCompletion,
          })
        }
      })
      .catch((error) => {
        console.warn('[useMiniAppTelegram] Telegram auto-login failed', error)
      })
      .finally(() => {
        setIsBootstrappingAuth(false)
      })
  }, [allowDevFallback, isAuthenticated, isAwaitingRestore, loginWithSocial, loginWithTelegramMiniApp, telegramInitData, telegramUser?.id])

  return {
    isBootstrappingAuth,
    telegramUser,
  }
}
