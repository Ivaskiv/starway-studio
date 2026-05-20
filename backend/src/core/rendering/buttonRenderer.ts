import type { TelegramButton } from '../flow-builder/flowTemplates.js'

export function renderInlineKeyboard(buttons: readonly TelegramButton[][]) {
  return {
    inline_keyboard: buttons,
  }
}
