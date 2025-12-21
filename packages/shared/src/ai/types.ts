export type AIGenerateRequest = {
  prompt: string
  context?: {
    name?: string
    audience?: string
    niche?: string
    goal?: string
    steps?: unknown[]
  }
}
