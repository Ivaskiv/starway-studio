export function interpolateFirstName(
  text: string,
  firstName?: string | null
): string {
  const normalizedName = String(firstName ?? '').trim()
  if (!normalizedName) {
    // Remove {firstName} plus any surrounding punctuation/spaces:
    // handles "**{firstName}, text**" → "**text**"
    // and "{firstName}, text" → "text"
    return text
      .replace(/\{firstName\}[,؛:—–\-\s]*/g, '')
      .replace(/[\s,؛:—–\-]*\{firstName\}/g, '')
      .trim()
  }

  return text.replace(/\{firstName\}/g, normalizedName)
}
