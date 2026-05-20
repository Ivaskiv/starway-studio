import type { Context } from 'telegraf'

import { getTelegramProductContext } from '@/content/telegram.product-context.js'

export async function sendWaitlist(ctx: Context) {
  const context = getTelegramProductContext('stankey')
  await ctx.reply(
    context.copy.onboarding.join('\n'),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: context.cta.waitlist, callback_data: 'waitlist_early_access' }],
        ],
      },
    },
  )
}
