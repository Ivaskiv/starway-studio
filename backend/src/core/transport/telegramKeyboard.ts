import type { TelegramButton } from '../flow-builder/flowTemplates.js'
import { renderInlineKeyboard } from '../rendering/buttonRenderer.js'

export function buildTelegramKeyboard(buttons: TelegramButton[][]) {
  return renderInlineKeyboard(buttons)
}

