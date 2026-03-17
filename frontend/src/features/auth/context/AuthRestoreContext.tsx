import { createContext, useContext } from 'react'

export type AuthRestoreStatus = 'idle' | 'restoring' | 'ready' | 'failed'

const AuthRestoreContext = createContext<AuthRestoreStatus>('idle')

export const AuthRestoreProvider = AuthRestoreContext.Provider

export function useAuthRestoreStatus() {
  return useContext(AuthRestoreContext)
}
