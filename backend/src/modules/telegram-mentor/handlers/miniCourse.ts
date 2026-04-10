import type { Context } from 'telegraf'
import { continueToMentorKeyboard } from '../keyboards.js'
import { getSession } from '../session.js'
import {
  getMentorReturnDeeplink,
  sendMiniCourseViaSendPulse,
} from '../../integrations/sendpulse/sendpulse.service.js'
import { sendEntryOffer, sendStateMenu } from './start.js'

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

    await ctx.reply(
      `🎁 Практикум активовано! Перевір свою пошту або чат — скоро отримаєш міні-курс.\n${getMentorReturnDeeplink()}`,
      { reply_markup: continueToMentorKeyboard().reply_markup },
    )
  } catch (error) {
    console.error('[TelegramMentor] mini-course error:', error)
    await sendStateMenu(ctx, session.userId)
  }
}
