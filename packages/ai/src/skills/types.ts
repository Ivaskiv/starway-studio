export interface SkillInput {
  userId: string
  message: string
}

export interface SkillResult {
  text: string
  toolCalls: string[]
}

export interface Skill {
  id: string
  description: string
  systemPrompt: string
  allowedTools: string[]
  run(input: SkillInput): Promise<SkillResult>
}
