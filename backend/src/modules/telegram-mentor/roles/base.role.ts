export interface RoleConfig {
  systemPrompt: string
  temperature: number
  maxTokens: number
}

export interface RoleResult {
  reply: string
  nextState?: string
  buttons?: Array<{ text: string; callback_data: string }>
  action?: 'UPDATE_STATE' | 'TRIGGER_SENDPULSE' | 'NONE'
}
