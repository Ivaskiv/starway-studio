import AppRouter from '@/app/router/AppRouter'
import GlobalAssistant from '@/features/assistant/components/GlobalAssistant'
import DeepLinkAuthBridge from '@/features/auth/components/DeepLinkAuthBridge'
import { SessionOrchestratorProvider } from '@/features/auth/context/SessionOrchestratorContext'
import LoadingFallback from '@/features/user/userMenu/LoadingFallback'
import { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'

export default function App() {
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
