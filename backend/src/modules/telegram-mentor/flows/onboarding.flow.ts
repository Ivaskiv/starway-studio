import type { Context } from 'telegraf'

import { getTelegramProductContext } from '@/content/telegram.product-context.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'

export async function sendWaitlist(ctx: Context) {
  const context = getTelegramProductContext('stankey')
  await planMessage(
    ctx,
    'ctx.reply',
    'flow_waitlist',
    context.copy.onboarding.join('\n'),
    {
      inline_keyboard: [
        [{ text: context.cta.waitlist, callback_data: 'waitlist_early_access' }],
      ],
    },
  )
}
