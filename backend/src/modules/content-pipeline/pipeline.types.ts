export interface ReelsVariant {
  id: 'A' | 'B' | 'C'
  position: 'TRUTH' | 'ARCHITECT' | 'PSYCHOLOGY'
  hook: string
  scenes: ReelsScene[]
  voiceScript: string
  cta: string
}

export interface ReelsScene {
  order: number
  timeFrom: number
  timeTo: number
  screenText: string
  visualDescription: string
  klingPrompt: string
  mood: string
}

export interface PipelineContext {
  pipelineId: string
  topic: string
  selectedVariant: ReelsVariant
  chatId: number
}

export interface MediaAssets {
  scenes: string[]
  audio: string
  finalVideo?: string
}
