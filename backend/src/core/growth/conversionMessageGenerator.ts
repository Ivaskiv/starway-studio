import type { ConversionOfferType } from './conversionTimingEngine.js'

type ConversionAction = 'trial_start' | 'show_paywall' | 'offer_discount'

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}.`
}

export function generateConversionMessage(
  offerType: ConversionOfferType,
  action: ConversionAction,
) {
  const raw = offerType === 'trial'
    ? 'Почни безкоштовно зараз. Натисни і отримай доступ одразу.'
    : offerType === 'discount'
      ? 'Отримай доступ зі знижкою зараз. Натисни і зафіксуй результат.'
      : 'Ти вже отримуєш результат. Натисни і отримай повний доступ зараз.'

  return truncate(raw, 120)
}
