import { registerMentorBot } from '@/modules/telegram-mentor/bot/register.js'

import { FOCUS_PRODUCT_CODE } from '../config/focus.constants.js'

export async function registerFocusBot() {
  return registerMentorBot({
    product: FOCUS_PRODUCT_CODE,
  })
}
