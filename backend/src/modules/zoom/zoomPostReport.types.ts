export interface ZoomPostSessionReport {
  transcript?: string
  highlights?: string[]
  quotes?: string[]
  summary?: string
  transcribedAt?: string
  audioFileId?: string
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function parseZoomPostReport(v: unknown): ZoomPostSessionReport | null {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null

  const r = v as Record<string, unknown>

  return {
    transcript: typeof r.transcript === 'string' ? r.transcript : undefined,
    highlights: isStringArray(r.highlights) ? r.highlights : undefined,
    quotes: isStringArray(r.quotes) ? r.quotes : undefined,
    summary: typeof r.summary === 'string' ? r.summary : undefined,
    transcribedAt: typeof r.transcribedAt === 'string' ? r.transcribedAt : undefined,
    audioFileId: typeof r.audioFileId === 'string' ? r.audioFileId : undefined,
  }
}
