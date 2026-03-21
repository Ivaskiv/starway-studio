import type { RouterContext } from './context.js'

export type Intent =
  | 'command'
  | 'callback'
  | 'lead_magnet'
  | 'progress'
  | 'resistance'
  | 'off_topic'
  | 'product_intent'
  | 'support'
  | 'general'
  | 'seo_request'
  | 'ads_request'
  | 'producer_request'

function containsAny(text: string, parts: string[]): boolean {
  return parts.some(part => text.includes(part))
}

export function resolveIntent(ctx: RouterContext): Intent {
  if (ctx.updateType === 'command') {
    return 'command'
  }

  if (ctx.updateType === 'callback') {
    return 'callback'
  }

  const text = ctx.rawText.toLowerCase()

  if (containsAny(text, ['seo', 'контент', 'ранжув', 'мета-тег', 'ключов'])) {
    return 'seo_request'
  }

  if (containsAny(text, ['реклама', 'таргет', 'банер', 'креатив', 'audience'])) {
    return 'ads_request'
  }

  if (containsAny(text, ['продукт', 'воронк', 'монетизац', 'офер', 'upsell'])) {
    return 'producer_request'
  }

  if (containsAny(text, ['що ти вмієш', 'як ти працюєш', 'що ти можеш', 'хто ти'])) {
    return 'off_topic'
  }

  if (containsAny(text, ['допом', 'не працю', 'не розум', 'застряг', 'помилка'])) {
    return 'support'
  }

  if (containsAny(text, ['ціна', 'купити', 'підписк', 'доступ', 'оплат', 'наставниц'])) {
    return 'product_intent'
  }

  if (containsAny(text, ['продовж', 'далі', 'готов', 'поїхали', 'давай'])) {
    return 'progress'
  }

  if (containsAny(text, ['не знаю', 'не можу', 'не зараз', 'потім', 'складно', 'страшно', 'сумнів'])) {
    return 'resistance'
  }

  if (ctx.userState.startsWith('lm_')) {
    return 'lead_magnet'
  }

  return 'general'
}
