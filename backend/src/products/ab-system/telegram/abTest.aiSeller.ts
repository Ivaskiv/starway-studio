import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { getUiSettings } from './abTest.progress.js'
import { resolveUserLifecycle } from '../../../modules/users/runtime/resolveUserLifecycle.js'
import {
  aiSellerContent,
  type AiSellerMode,
} from '../content/abTest.aiSeller.js'
import { planAck, planMessage } from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'

export function resolveAiSellerMode(user: {
  lifecycle: string
  testResultType: string | null
  zoomCount: number
  daysToExpiry: number | null
  platformDays: number
}): AiSellerMode {
  if (user.daysToExpiry !== null && user.daysToExpiry <= 7) {
    return 'RETENTION'
  }
  if (user.lifecycle === 'platform_active') {
    return 'PLATFORM'
  }
  if (user.lifecycle === 'focus_active' && user.zoomCount >= 1) {
    return 'FOCUS'
  }
  if (user.testResultType && user.lifecycle !== 'focus_active') {
    return 'LEAD'
  }
  return 'LEAD'
}

export async function handleAiSellerCallback(
  ctx: Context,
  action: string,
): Promise<boolean> {
  const userId = (ctx.state as { userId?: string | null }).userId ?? null
  if (!userId) return false

  if (action === aiSellerContent.LEAD.softCtaCallback) {
    await planMessage(ctx, 'ctx.reply', 'ai_seller_lead_soft_cta', aiSellerContent.LEAD.msg3, {
      inline_keyboard: [
        [{ text: aiSellerContent.LEAD.cta_1m, callback_data: aiSellerContent.LEAD.callback_1m }],
        [{ text: aiSellerContent.LEAD.cta_3m, callback_data: aiSellerContent.LEAD.callback_3m }],
      ],
    }, 'HTML')
    await planAck(ctx, 'ctx.answerCbQuery', 'ai_seller_lead_soft_cta_ack').catch(() => undefined)
    return true
  }

  if (action === aiSellerContent.FOCUS.callback_learn_more) {
    await planMessage(ctx, 'ctx.reply', 'ai_seller_focus_learn_more', aiSellerContent.FOCUS.platform_details, {
      inline_keyboard: [[{ text: aiSellerContent.FOCUS.cta_upgrade, callback_data: aiSellerContent.FOCUS.callback_upgrade }]],
    }, 'HTML')
    await planAck(ctx, 'ctx.answerCbQuery', 'ai_seller_focus_learn_more_ack').catch(() => undefined)
    return true
  }

  if (!action.startsWith('ai_seller:objection:')) {
    return false
  }

  const objectionKey = action.replace('ai_seller:objection:', '').trim()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentState: true,
      currentStep: true,
      funnelStage: true,
      testResultType: true,
      settings: true,
      subscriptions: {
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        orderBy: { currentPeriodEnd: 'asc' },
        take: 1,
        select: { currentPeriodEnd: true },
      },
    },
  })
  if (!user) return false

  const daysToExpiry = user.subscriptions[0]?.currentPeriodEnd
    ? Math.max(0, Math.ceil((user.subscriptions[0].currentPeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null
  const zoomCount = await prisma.zoomSessionAttendee.count({
    where: { userId, attended: true },
  }).catch(() => 0)
  const mode = resolveAiSellerMode({
    lifecycle: resolveUserLifecycle(user).value,
    testResultType: user.testResultType,
    zoomCount,
    daysToExpiry,
    platformDays: 0,
  })

  let replyText: string | null = null
  if (mode === 'LEAD' && objectionKey in aiSellerContent.LEAD.objections) {
    replyText = aiSellerContent.LEAD.objections[objectionKey as keyof typeof aiSellerContent.LEAD.objections]
    if (objectionKey === 'not_now' || objectionKey === 'need_to_think') {
      const settings = getUiSettings(user.settings)
      const pauseUntil = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      await prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...settings,
            aiSellerPauseUntil: pauseUntil,
          },
        },
      }).catch(() => undefined)
    }
  } else if (mode === 'FOCUS' && objectionKey in aiSellerContent.FOCUS.objections) {
    replyText = aiSellerContent.FOCUS.objections[objectionKey as keyof typeof aiSellerContent.FOCUS.objections]
  } else if (mode === 'PLATFORM' && objectionKey in aiSellerContent.PLATFORM.objections) {
    const value = aiSellerContent.PLATFORM.objections[objectionKey as keyof typeof aiSellerContent.PLATFORM.objections]
    replyText = typeof value === 'function' ? value('course') : value
  } else if (mode === 'RETENTION' && objectionKey in aiSellerContent.RETENTION.objections) {
    const value = aiSellerContent.RETENTION.objections[objectionKey as keyof typeof aiSellerContent.RETENTION.objections]
    replyText = typeof value === 'function'
      ? value(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      : value
  }

  if (!replyText) {
    await planAck(ctx, 'ctx.answerCbQuery', 'ai_seller_objection_no_reply').catch(() => undefined)
    return true
  }

  await planMessage(ctx, 'ctx.reply', 'ai_seller_objection_reply', replyText, undefined, 'HTML')
  await planAck(ctx, 'ctx.answerCbQuery', 'ai_seller_objection_reply_ack').catch(() => undefined)
  return true
}
