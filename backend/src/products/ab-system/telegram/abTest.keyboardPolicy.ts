import type { InlineKeyboardMarkup } from 'telegraf/types'
import type { AbTestResultKey } from '../content/abTest.results.js'

export type CanonicalResultKeyboardState = {
  resultKey: AbTestResultKey
  hasFocus: boolean
  isMyBooking: boolean
  zoomCalendarUrl: string
  includeProgramDescription?: boolean
}

export function buildCanonicalResultKeyboard(
  state: CanonicalResultKeyboardState,
): InlineKeyboardMarkup {
  const primaryButton = state.hasFocus
    ? {
        text: state.isMyBooking ? 'ПЕРЕГЛЯНУТИ ЗАПИС' : 'ВІДКРИТИ РОЗКЛАД ZOOM',
        web_app: { url: state.zoomCalendarUrl },
      }
    : {
        text: 'ОБРАТИ ФОРМАТ У ФОКУСІ',
        callback_data: 'open_focus_payment',
      }

  return {
    inline_keyboard: [
      [primaryButton],
      ...(state.includeProgramDescription === false
        ? []
        : [[{
            text: 'ПРО ПРОГРАМУ',
            callback_data: `show_inside_${state.resultKey.toUpperCase()}`,
          }]]),
    ],
  }
}
