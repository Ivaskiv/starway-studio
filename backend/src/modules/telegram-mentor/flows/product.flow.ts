import type { Context } from 'telegraf'

import { openAppKeyboard } from '../keyboards.js'
import { getTelegramProductContext } from '@/content/telegram.product-context.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'

export async function sendProduct(ctx: Context) {
  const context = getTelegramProductContext('stankey')
  await planMessage(
    ctx,
    'ctx.reply',
    'flow_product_welcome',
    context.copy.welcome.join('\n'),
    openAppKeyboard(context.route.miniApp ?? '/miniapp?startapp=ai', context.cta.openRoom).reply_markup,
  )
}
