export type AgentCategory = 'marketing' | 'sales' | 'ops'
export type AgentStatus = 'active' | 'running' | 'pending'
export type AgentCapabilityType = 'LIVE_AGENT' | 'PROMPT_ONLY' | 'KNOWLEDGE_TOOL' | 'PLANNED'

export interface AgentPresentationDef {
  key: string
  promptId: string
  name: string
  icon: string
  category: AgentCategory
  desc: string
  isSystem: boolean
  sourceFiles: string[]
}

export interface AgentCardDef extends AgentPresentationDef {
  runtimeAgentId?: string
  capability?: string
  objective?: string
  runtimeRegistered: boolean
  runtimeStatus: AgentStatus | null
  capabilityType: AgentCapabilityType
  statusLabel: 'Підключений' | 'У роботі' | 'Ще не підключений' | 'Інструмент'
}

export interface AgentEdge {
  from: string
  to: string
  label?: string
}
