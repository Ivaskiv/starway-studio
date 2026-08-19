import type { InlineKeyboardMarkup } from 'telegraf/types'
import type { AbTestResultKey } from '../content/abTest.results.js'

export type CanonicalResultKeyboardState = {
  resultKey: AbTestResultKey
  hasFocus: boolean
  isMyBooking: boolean
  zoomCalendarUrl: string
  includeProgramDescription?: boolean
}

export type CanonicalResultActionPolicy = {
  label: string
  route: string
  nextStepText: string | null
}

export function resolveCanonicalResultActionPolicy(
  state: CanonicalResultKeyboardState,
): CanonicalResultActionPolicy | null {
  if (!state.hasFocus) {
    return null
  }

  if (state.isMyBooking) {
    return {
      label:
        state.resultKey === 'state'
          ? 'ДЕТАЛІ ZOOM-ПРАКТИКИ'
          : 'ПЕРЕГЛЯНУТИ ЗАПИС',
      nextStepText:
        state.resultKey === 'state'
          ? 'Сформулюй коротку відповідь і візьми її на найближчу Zoom-практику.'
          : null,
      route: state.zoomCalendarUrl,
    }
  }

  return {
    label: 'ВІДКРИТИ РОЗКЛАД ZOOM',
    nextStepText: null,
    route: state.zoomCalendarUrl,
  }
}

export function buildCanonicalResultKeyboard(
  state: CanonicalResultKeyboardState,
): InlineKeyboardMarkup {
  const actionPolicy = resolveCanonicalResultActionPolicy(state)
  const primaryButton = actionPolicy
    ? {
        text: actionPolicy.label,
        web_app: { url: actionPolicy.route },
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
