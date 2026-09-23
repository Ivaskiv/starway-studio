export const ALLOWED_TELEGRAM_TAG_PATTERN =
  /<\/?(?:b|strong|i|em|code|pre|blockquote)(?:\s+[^>]*)?>|<a\s+href="[^"]+">|<\/a>/gi

export function decodeBasicEntities(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

export function escapeTelegramHtml(value: string): string {
  return decodeBasicEntities(String(value ?? ''))
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function bold(value: string): string {
  const normalized = String(value ?? '').trim()
  return normalized
    ? `<b>${escapeTelegramHtml(normalized)}</b>`
    : ''
}

export function italic(value: string): string {
  const normalized = String(value ?? '').trim()
  return normalized
    ? `<i>${escapeTelegramHtml(normalized)}</i>`
    : ''
}

export function code(value: string): string {
  const normalized = String(value ?? '').trim()
  return normalized
    ? `<code>${escapeTelegramHtml(normalized)}</code>`
    : ''
}

export function blockquote(value: string): string {
  const normalized = String(value ?? '').trim()
  return normalized
    ? `<blockquote>${escapeTelegramHtml(normalized)}</blockquote>`
    : ''
}

export function link(label: string, url: string): string {
  const normalizedLabel = String(label ?? '').trim()
  const normalizedUrl = String(url ?? '').trim()

  if (!normalizedLabel || !normalizedUrl) return ''

  return `<a href="${escapeTelegramHtml(normalizedUrl)}">${escapeTelegramHtml(normalizedLabel)}</a>`
}

export function stripTelegramHtml(value: string): string {
  return decodeBasicEntities(
    String(value ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/blockquote>\s*<blockquote>/gi, '\n\n')
      .replace(/<\/?(?:b|strong|i|em|code|pre|blockquote|a)(?:\s+[^>]*)?>/gi, '')
      .replace(/<[^>]+>/g, ''),
  ).trim()
}
