// packages/backend/src/services/ai-usage.ts
import { sql } from '../db/client'

export async function getTodayUsage(user_id: string) {
  const [row] = await sql`
    SELECT COUNT(*)::int as count
    FROM ai_usage
    WHERE user_id = ${user_id}
      AND created_at::date = CURRENT_DATE
  `
  return row?.count || 0
}

export async function saveUsage(
  user_id: string,
  intent: string,
  tokens: number
) {
  await sql`
    INSERT INTO ai_usage (user_id, intent, tokens_used)
    VALUES (${user_id}, ${intent}, ${tokens})
  `
}
