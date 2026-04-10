import type { Context } from 'telegraf'

import { openAppKeyboard } from '../keyboards.js'

export async function sendProduct(ctx: Context) {
  await ctx.reply(
    [
      'ABsystem готовий.',
      '',
      'Відкрий Starway і продовжуй у своєму робочому просторі.',
    ].join('\n'),
    {
      reply_markup: openAppKeyboard('/miniapp?startapp=ai', '🌐 Відкрити Starway').reply_markup,
    },
  )
}
