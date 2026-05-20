import type { Context } from 'telegraf'

import { openAppKeyboard } from '../keyboards.js'
import { getTelegramProductContext } from '@/content/telegram.product-context.js'

export async function sendProduct(ctx: Context) {
  const context = getTelegramProductContext('stankey')
  await ctx.reply(
    context.copy.welcome.join('\n'),
    {
      reply_markup: openAppKeyboard(context.route.miniApp ?? '/miniapp?startapp=ai', context.cta.openRoom).reply_markup,
    },
  )
}
