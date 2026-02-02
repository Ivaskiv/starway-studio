// backend/src/modules/mentor/services/mentor.service.ts
/* 
** mentor.service.ts = мозок
** сервис для работи з менторами
*/
import { buildSessionContext } from './buildSessionContext.js'
import { getMentorContext, saveMentorMessage } from '../repos/mentor.repo.js'
import { generateMentorChatResponse } from './mentor.prompts.js'

export async function chatMentor(
  user: { id: string; first_name?: string },
  prompt: string
) {
  const history = await getMentorContext(user.id)

  await saveMentorMessage(user.id, 'user', prompt)

  const session = await buildSessionContext(user.id)

  const aiText = await generateMentorChatResponse(
    prompt,
    history.map(h => ({
      role: h.role === 'mentor' ? 'assistant' : 'user',
      content: h.text,
    })),
    { user_name: user.first_name ?? 'Друг', ...session }
  )

  await saveMentorMessage(user.id, 'mentor', aiText)

  return { text: aiText }
}
