// packages/backend/src/services/ai-engine.ts
import type { AIRequest } from '../types/ai'
import type { User } from '../types/user'
import { getDailyLimit } from './ai-limits'
import { getTodayUsage, saveUsage } from './ai-usage'
import { generateCompletion } from './openai-client'

export async function runAI(
  user: User & { plan?: string },
  input: AIRequest
) {
  const usedToday = await getTodayUsage(user.id)
  const limit = getDailyLimit(user)

  if (usedToday >= limit) {
    throw new Error('AI_LIMIT_REACHED')
  }

  const result = await generateCompletion(input.prompt)

  await saveUsage(user.id, input.intent, result.tokens_used)

  return result
}
