import type { Context } from 'telegraf'
import { continueToMentorKeyboard } from '../keyboards.js'
import { getSession } from '../session.js'
import {
  getMentorReturnDeeplink,
  sendMiniCourseViaSendPulse,
} from '../../integrations/sendpulse/sendpulse.service.js'
import { sendEntryOffer, sendStateMenu } from './start.js'
import { buildRecoveryCopy, resolveConversationProfile } from '../../../core/state-machine/conversationPresentation.js'
import { resolveRelationshipMemory } from '../../../core/memory/relationshipMemory.js'

export async function handleMiniCourse(ctx: Context) {
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : null
  if (!chatId) return

  const session = await getSession(chatId)
  if (!session) {
    await sendEntryOffer(ctx)
    return
  }

  try {
    await sendMiniCourseViaSendPulse({
      chatId,
      flowKey: 'mini_course_intro',
      variables: { userId: session.userId },
    })

    const relationship = await resolveRelationshipMemory(session.userId, 'stankey').catch(() => null)
    const copy = buildRecoveryCopy('question_missing', resolveConversationProfile('stankey'), {
      relationship,
    })
    await ctx.reply(
      `${copy.title}\n${copy.body}\n\n🎁 Практикум активовано. Перевір пошту або чат — скоро отримаєш міні-курс.\n${getMentorReturnDeeplink()}`,
      { reply_markup: continueToMentorKeyboard().reply_markup },
    )
  } catch (error) {
    console.error('[TelegramMentor] mini-course error:', error)
    await sendStateMenu(ctx, session.userId)
  }
}
