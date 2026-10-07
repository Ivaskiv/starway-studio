import AppRouter from '@/app/router/AppRouter'
import GlobalAssistant from '@/features/assistant/components/GlobalAssistant'
import DeepLinkAuthBridge from '@/features/auth/components/DeepLinkAuthBridge'
import { SessionOrchestratorProvider } from '@/features/auth/context/SessionOrchestratorContext'
import LoadingFallback from '@/features/user/userMenu/LoadingFallback'
import { signalTelegramWebAppReady } from '@/features/social/utils/telegramWebApp'
import { Suspense, useLayoutEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'

export default function App() {
  /*
   * Telegram Mini App readiness is shared by every route. It must happen
   * after the React shell commits, but before child auth effects begin.
   */
  useLayoutEffect(() => {
    signalTelegramWebAppReady()
  }, [])

  return (
    <BrowserRouter>
      <SessionOrchestratorProvider>
        <Suspense fallback={<LoadingFallback />}>
          <DeepLinkAuthBridge />
          <AppRouter />
          <GlobalAssistant />
        </Suspense>
      </SessionOrchestratorProvider>
    </BrowserRouter>
  )
}
