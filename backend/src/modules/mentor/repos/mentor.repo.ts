// mentor.repo.ts
import sql from '../../../db/client.js'
import { MentorMessage } from '../types/mentor.types.js'

export async function getMentorConfig(userId: string) {
  const res = await sql`
    SELECT config FROM mentor_configs WHERE user_id = ${userId}
  `
  return res[0]?.config ?? null
}

export async function saveMentorConfig(userId: string, config: unknown) {
  return sql`
    INSERT INTO mentor_configs (user_id, config)
    VALUES (${userId}, ${config})
    ON CONFLICT (user_id)
    DO UPDATE SET config = ${config}, updated_at = now()
  `
}

export async function getMentorContext(userId: string): Promise<MentorMessage[]> {
  return sql`
    SELECT role, text, created_at
    FROM mentor_context
    WHERE user_id = ${userId}
    ORDER BY created_at ASC
  `
}

export async function saveMentorMessage(
  userId: string,
  role: 'user' | 'mentor',
  text: string
) {
  return sql`
    INSERT INTO mentor_context (user_id, role, text)
    VALUES (${userId}, ${role}, ${text})
  `
}
