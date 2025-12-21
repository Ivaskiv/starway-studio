import { AIGenerateField } from '../types/AIGenerateField'
import { SYSTEM_PROMPT, FIELD_PROMPTS } from './prompts'

export function buildMessages(
  field: AIGenerateField,
  prompt: string,
  context?: Record<string, any>
) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'developer', content: FIELD_PROMPTS[field] },
    {
      role: 'user',
      content: `
User input:
${prompt}

Context:
${JSON.stringify(context || {}, null, 2)}
`
    }
  ]
}
