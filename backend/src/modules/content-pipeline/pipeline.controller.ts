import type { Context, Telegraf } from 'telegraf'

import { prisma } from '../../db/client.js'
import { pipelineContent } from './pipeline.content.js'
import { cancelPipeline, handlePublish, handleVariantSelection, startPipeline } from './pipeline.service.js'

function isTextMessage(ctx: Context): ctx is Context & { message: { text: string } } {
  return 'message' in ctx && Boolean(ctx.message) && 'text' in (ctx.message as { text?: unknown })
}

async function checkCoachRole(ctx: Context): Promise<boolean> {
  const tgId = String(ctx.from?.id ?? '').trim()
  const coachTelegramId = String(process.env.COACH_TELEGRAM_ID ?? '').trim()

  if (coachTelegramId && tgId === coachTelegramId) {
    return true
  }

  if (!tgId) return false

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ telegramUserId: tgId }, { telegramChatId: tgId }],
    },
    select: { role: true },
  })

  return user?.role === 'EXPERT' || user?.role === 'SUPERADMIN'
}

export function registerPipelineCommands(bot: Telegraf): void {
  bot.command('reels', async (ctx) => {
    if (!(await checkCoachRole(ctx))) return
    if (!isTextMessage(ctx)) return

    const topic = ctx.message.text.replace('/reels', '').trim()
    if (!topic) {
      await ctx.reply(pipelineContent.commandUsage)
      return
    }

    await startPipeline(bot, Number(ctx.chat?.id ?? 0), topic, 'command')
  })
}

export async function dispatchPipelineCallback(
  bot: Telegraf,
  ctx: Context,
  action: string,
): Promise<boolean> {
  if (!action.startsWith('pipeline:')) return false

  if (!(await checkCoachRole(ctx))) {
    await ctx.answerCbQuery().catch(() => undefined)
    return true
  }

  const selectMatch = action.match(/^pipeline:select:([^:]+):([ABC])$/)
  if (selectMatch) {
    const pipelineId = selectMatch[1]
    const variantId = selectMatch[2] as 'A' | 'B' | 'C'
    await ctx.answerCbQuery(`Варіант ${variantId} обрано`).catch(() => undefined)
    await handleVariantSelection(bot, pipelineId, variantId, Number(ctx.chat?.id ?? 0))
    return true
  }

  const publishMatch = action.match(/^pipeline:publish:([^:]+)$/)
  if (publishMatch) {
    await ctx.answerCbQuery('Публікуємо...').catch(() => undefined)
    await handlePublish(bot, publishMatch[1], Number(ctx.chat?.id ?? 0))
    return true
  }

  const cancelMatch = action.match(/^pipeline:cancel:([^:]+)$/)
  if (cancelMatch) {
    await ctx.answerCbQuery('Скасовано').catch(() => undefined)
    await cancelPipeline(cancelMatch[1])
    await ctx.reply(pipelineContent.cancelled)
    return true
  }

  const editHookMatch = action.match(/^pipeline:edit_hook:([^:]+)$/)
  if (editHookMatch) {
    await ctx.answerCbQuery('У MVP редагування хуку ще в роботі').catch(() => undefined)
    return true
  }

  return false
}
