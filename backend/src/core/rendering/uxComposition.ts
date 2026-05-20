import type { TelegramFlow } from '../flow-builder/flowTemplates.js'
import { renderTelegramText } from './textRenderer.js'
import { renderInlineKeyboard } from './buttonRenderer.js'

export function composeTelegramUx(flow: TelegramFlow) {
  return {
    text: renderTelegramText(flow),
    reply_markup: renderInlineKeyboard(flow.buttons),
    blocks: flow.blocks,
  }
}
