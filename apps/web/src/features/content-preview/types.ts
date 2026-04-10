export type PreviewStatus = 'draft' | 'generating' | 'ready' | 'published'

export type PreviewButton = {
  label: string
  tone?: 'primary' | 'secondary' | 'ghost'
}

export function normalizePreviewStatus(status?: string): PreviewStatus {
  if (status === 'published') return 'published'
  if (status === 'approved' || status === 'ready') return 'ready'
  if (status === 'generating') return 'generating'
  return 'draft'
}

export function splitTextSlides(lines: string[]): string[] {
  return lines
    .flatMap((line) => line.split('\n'))
    .map((line) => line.trim())
    .filter(Boolean)
}

export function buildDmSteps(lines: string[]): string[] {
  const steps = splitTextSlides(lines)
  return steps.length > 0 ? steps : ['Привіт! Хочу розповісти тобі про систему, яка збирає контент і продажі в один маршрут.']
}

export function buildSubtitles(lines: string[]): string[] {
  const slides = splitTextSlides(lines)
  return slides.slice(0, 4)
}
