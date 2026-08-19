import { logger } from '@/utils/logger.js'
import type { Context } from 'telegraf'
import { trackEvent } from '../../../../events/service.js'
import { planAck,planMessage } from '../../../conversation/delivery/planDelivery.js'
import { getAccessAwareAppReplyMarkupForContext,handleStart,sendStateMenu } from '../../../handlers/start.js'
import { handleStatus } from '../../../handlers/status.js'
import { getSession } from '../../../session.js'
import { renderDecisionForContext } from './render.js'

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label}_timeout`))
    }, timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeout)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeout)
        reject(error)
      })
  })
}

export async function handleRoomAction(ctx: Context, userId: string | null, action: string) {
  const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)

  if (action === 'restart_flow') {
    await handleStart(ctx)
    return true
  }

  if (action === 'start_wheel') {
    await planAck(ctx, 'ctx.answerCbQuery', 'room_start_wheel_ack', 'Показую діагностику стану').catch(() => undefined)
    try {
      await withTimeout(
        planMessage(
          ctx,
          'ctx.reply',
          'room_start_wheel',
          'Відкрий Starway і запусти діагностику стану в MiniApp.',
          replyMarkup,
        ),
        15_000,
        'room_start_wheel',
      )
    } catch (error) {
      if (error instanceof Error && error.message === 'room_start_wheel_timeout') {
        logger.warn('[telegram-thin-client:start_wheel_timeout]', {
          userId,
          error: error.message,
        })
        return true
      }
      throw error
    }
    return true
  }

  if (action === 'open_focus_portal') {
    if (userId) {
      const { sendStateMenu } = await import('../../../handlers/start.menu.js')
      await sendStateMenu(ctx, userId)
      return true
    }

    await handleStart(ctx)
    return true
  }

  if (action === 'open_course') {
    await planMessage(ctx, 'ctx.reply', 'room_open_course', 'Відкриваю курс у Starway.', replyMarkup)
    return true
  }

  if (action === 'open_practices') {
    await planMessage(ctx, 'ctx.reply', 'room_open_practices', 'Відкриваю практики у Starway.', replyMarkup)
    return true
  }

  if (action === 'open_platform') {
    await handleStatus(ctx)
    if (userId) {
      await trackEvent({
        userId,
        type: 'PLATFORM_OPENED',
        source: 'telegram',
        state: (ctx.state as { userState?: string | null }).userState ?? null,
        payload: {
          action,
          target: 'platform',
        },
      })
    }
    return true
  }

  if (action === 'return_main_menu') {
    const chatId = String(ctx.chat?.id ?? '')
    const session = chatId ? await getSession(chatId) : null
    const targetUserId = session?.userId ?? userId
    if (targetUserId) {
      if (!(await renderDecisionForContext(ctx, targetUserId, 'menu_open'))) {
        await sendStateMenu(ctx, targetUserId)
      }
    } else {
      await planMessage(
        ctx,
        'ctx.reply',
        'room_return_main_menu_guest',
        'Starway підключено. Відкрий Mini App для продовження.',
        replyMarkup,
      )
    }
    return true
  }

  return false
}
