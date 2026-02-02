// backend/src/modules/mentor/services/buildSessionContext.ts

/* це ключовий файл, бо:
** Telegram
** RTK Query
** AI
** mini-apps
** ВСІ сюди дивляться
*/

import { getMentorConfig } from '../repos/mentor.repo.js'
import { SessionContext } from '../types/mentor.types.js'

export async function buildSessionContext(userId: string): Promise<SessionContext> {
  const config = await getMentorConfig(userId)

  return {
    goals: config?.goals ?? [],
    tone: config?.tone ?? 'friendly',
    morningQuestions: config?.morningQuestions ?? [],
    eveningQuestions: config?.eveningQuestions ?? [],
  }
}
