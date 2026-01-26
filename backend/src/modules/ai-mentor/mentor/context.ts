// /backend/src/services/mentor/context.ts

import { sql } from '../../../db/client';
import type { MentorMessage } from '../../../types/mentor';

export async function getUserContext(user_id: string) {
  const rows = await sql`
    SELECT role, text, state, context, created_at
    FROM mentor_context
    WHERE user_id = ${user_id}
    ORDER BY created_at ASC
  `;

  return rows.map(r => ({
    role: r.role,
    text: r.text,
    state: r.state || 'welcome',
    context: r.context || {},
    timestamp: r.created_at,
  })) as Array<MentorMessage & { state: string; context: Record<string, any> }>;
}

export async function saveUserMessage(
  user_id: string,
  role: 'user' | 'mentor',
  text: string,
  state: string = 'welcome',
  context: Record<string, any> = {},
) {
  await sql`
    INSERT INTO mentor_context (user_id, role, text, state, context, created_at)
    VALUES (${user_id}, ${role}, ${text}, ${state}, ${JSON.stringify(context)}, NOW())
  `;
}
