import { createContext, ReactNode, useContext } from 'react'
import { useAIGeneratorManager } from '../hooks/useAIGeneratorManager'

const AIGeneratorContext = createContext<ReturnType<typeof useAIGeneratorManager> | null>(null)

export function AIGeneratorProvider({ children }: { children: ReactNode }) {
  const value = useAIGeneratorManager()
  return <AIGeneratorContext.Provider value={value}>{children}</AIGeneratorContext.Provider>
}

export function useAIGenerator() {
  const ctx = useContext(AIGeneratorContext)
  if (!ctx) throw new Error('useAIGenerator must be used inside provider')
  return ctx
}
