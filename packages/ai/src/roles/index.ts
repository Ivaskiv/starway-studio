export interface AiRoleConfig {
  id: string
  name: string
  description: string
  requiredRoles: string[]
  promptFiles: {
    claude?: string
    gpt?: string
    gemini?: string
  }
}

export const AI_ROLES: Record<string, AiRoleConfig> = {
  sales_psychologist: {
    id:           'sales_psychologist',
    name:         'AI Асистент продажів',
    description:  '5-кроковий алгоритм Хоменко · ДНК STARWAY',
    requiredRoles: ['EXPERT', 'ADMIN', 'SUPERADMIN'],
    promptFiles: {
      claude: 'salesPsychologist.claude.prompt',
      gpt:    'salesPsychologist.gpt.prompt',
      gemini: 'salesPsychologist.gemini.prompt',
    },
  },
}
