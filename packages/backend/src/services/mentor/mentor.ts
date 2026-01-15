// backend/src/services/mentor/mentor.ts
import type { MentorRequest } from '../../types/mentor'
import { generateMentorChatResponse } from './prompts'
import { getUserContext, saveUserMessage } from './context'

export async function chatMentor(
  user: { id: string; first_name?: string },
  input: MentorRequest
) {
  const user_id = user.id

  // 1️⃣ історія діалогу
  const history = await getUserContext(user_id)

  const chat_history: Array<{ role: 'user' | 'assistant'; content: string }> =
    history
      .filter(h => h.text)
      .map(h => ({
        role: h.role === 'mentor' ? 'assistant' : 'user',
        content: h.text,
      }))

  // 2️⃣ зберігаємо повідомлення користувача
  await saveUserMessage(user_id, 'user', input.prompt)

  // 3️⃣ динамічний AI context з БД
  const dynamicContext = await getUserContext(user_id)

  const context = {
    user_name: user.first_name || 'Друже',
    ...dynamicContext,
  }

  // 4️⃣ AI відповідь
  const aiText = await generateMentorChatResponse(
    input.prompt,
    chat_history,
    context
  )

  // 5️⃣ зберігаємо відповідь AI
  await saveUserMessage(user_id, 'mentor', aiText)

  return { text: aiText }
}
