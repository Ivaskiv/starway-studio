import { useEffect } from 'react'

import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'

// Legacy compatibility hook.
// Session restore listeners now live exclusively inside SessionOrchestratorContext.
export function useAuthSessionSync(enabled: boolean) {
  const { restoreSession } = useSessionOrchestrator()

  useEffect(() => {
    if (!enabled) return
    void restoreSession('manual')
  }, [enabled, restoreSession])
}
