export type AgentCategory = 'marketing' | 'sales' | 'ops'
export type AgentStatus = 'active' | 'running' | 'pending'

export interface AgentCardDef {
  key: string
  promptId: string
  name: string
  icon: string
  category: AgentCategory
  desc: string
  status: AgentStatus
  isSystem: boolean
  sourceFiles: string[]
}

export interface AgentEdge {
  from: string
  to: string
  label?: string
}
