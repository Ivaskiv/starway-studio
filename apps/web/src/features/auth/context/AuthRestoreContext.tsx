import { useSessionOrchestrator, type AuthRestoreStatus } from '@/features/auth/context/SessionOrchestratorContext'

export type { AuthRestoreStatus }

export function useAuthRestoreStatus(): AuthRestoreStatus {
  return useSessionOrchestrator().authRestoreStatus
}
