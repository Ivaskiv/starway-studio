import type { KeyboardButton, ReplyKeyboardMarkup } from '@telegraf/types'

type ReadonlyReplyKeyboard = {
  keyboard: readonly (readonly KeyboardButton[])[]
  is_persistent?: boolean
  resize_keyboard?: boolean
  one_time_keyboard?: boolean
  input_field_placeholder?: string
  selective?: boolean
}

export function toMutableReplyKeyboard(keyboard: ReadonlyReplyKeyboard): ReplyKeyboardMarkup {
  return {
    ...keyboard,
    keyboard: keyboard.keyboard.map((row) =>
      row.map((button) => (typeof button === 'string' ? button : { ...button })),
    ),
  }
}
