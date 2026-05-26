import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type PipelineState = 'idle' | 'running' | 'done'

type GenerationStats = {
  wordCount: number
  hookCount: number
  ctaCount: number
  score: 'LOW' | 'MID' | 'HIGH'
  tokens: number
  cost: string
}

type GenerationContextValue = {
  systemAnchor: string
  mustTags: string[]
  banTags: string[]
  selectedModel: string
  selectedAgents: string[]
  selectedArtifacts: string[]
  commsStyle: string
  stats: GenerationStats
  pipelineStatus: Record<string, PipelineState>
  setPipelineStatus: (next: Record<string, PipelineState>) => void
  callOrchestrator: (profileKey: string) => Promise<void>
}

const GenerationContext = createContext<GenerationContextValue | null>(null)

const DEFAULT_PIPELINE: Record<string, PipelineState> = {
  Parsing: 'idle',
  'Pain Mapping': 'idle',
  Triggers: 'idle',
  Structure: 'idle',
  Generation: 'idle',
}

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [pipelineStatus, setPipelineStatus] = useState<Record<string, PipelineState>>(DEFAULT_PIPELINE)

  const callOrchestrator = useCallback(async (profileKey: string) => {
    const steps = Object.keys(DEFAULT_PIPELINE)
    for (const step of steps) setPipelineStatus((prev) => ({ ...prev, [step]: 'running' }))
    try {
      await fetch('/api/ai-assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileKey }),
      })
      for (const step of steps) setPipelineStatus((prev) => ({ ...prev, [step]: 'done' }))
    } catch {
      setPipelineStatus(DEFAULT_PIPELINE)
    }
  }, [])

  const value = useMemo<GenerationContextValue>(() => ({
    systemAnchor: '',
    mustTags: [],
    banTags: [],
    selectedModel: 'gpt',
    selectedAgents: [],
    selectedArtifacts: [],
    commsStyle: 'expert',
    stats: { wordCount: 0, hookCount: 0, ctaCount: 0, score: 'LOW', tokens: 0, cost: '0.0000' },
    pipelineStatus,
    setPipelineStatus,
    callOrchestrator,
  }), [pipelineStatus, callOrchestrator])

  return <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>
}

export function useGenerationContext() {
  const ctx = useContext(GenerationContext)
  if (!ctx) throw new Error('useGenerationContext must be used within GenerationProvider')
  return ctx
}
