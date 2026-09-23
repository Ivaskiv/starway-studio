export interface ZoomPostSessionReport {
  transcript?: string
  highlights?: string[]
  quotes?: string[]
  summary?: string
  actionItems?: string[]
  nextFocus?: string
  transcribedAt?: string
  audioFileId?: string
  audioUrl?: string
  audioDuration?: number
  sessionDate?: string
  sessionType?: string
  audioFileName?: string
  coachReport?: string
  insights?: string[]
  objections?: string[]
  wins?: string[]
  recurringThemes?: string[]
  contentIdeas?: string[]
  analyzedAt?: string
  source?: 'manual' | 'zoom'
  completedAt?: string
  actualAttendeeCount?: number
  actualParticipantUserIds?: string[]
  actualStartedAt?: string | null
  actualEndedAt?: string | null
  topic?: string
  recordingAvailable?: boolean
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
    actionItems: isStringArray(r.actionItems) ? r.actionItems : undefined,
    nextFocus: typeof r.nextFocus === 'string' ? r.nextFocus : undefined,
    transcribedAt: typeof r.transcribedAt === 'string' ? r.transcribedAt : undefined,
    audioFileId: typeof r.audioFileId === 'string' ? r.audioFileId : undefined,
    audioUrl: typeof r.audioUrl === 'string' ? r.audioUrl : undefined,
    audioDuration: typeof r.audioDuration === 'number' ? r.audioDuration : undefined,
    sessionDate: typeof r.sessionDate === 'string' ? r.sessionDate : undefined,
    sessionType: typeof r.sessionType === 'string' ? r.sessionType : undefined,
    audioFileName: typeof r.audioFileName === 'string' ? r.audioFileName : undefined,
    coachReport: typeof r.coachReport === 'string' ? r.coachReport : undefined,
    insights: isStringArray(r.insights) ? r.insights : undefined,
    objections: isStringArray(r.objections) ? r.objections : undefined,
    wins: isStringArray(r.wins) ? r.wins : undefined,
    recurringThemes: isStringArray(r.recurringThemes) ? r.recurringThemes : undefined,
    contentIdeas: isStringArray(r.contentIdeas) ? r.contentIdeas : undefined,
    analyzedAt: typeof r.analyzedAt === 'string' ? r.analyzedAt : undefined,
    source: r.source === 'manual' || r.source === 'zoom' ? r.source : undefined,
    completedAt: typeof r.completedAt === 'string' ? r.completedAt : undefined,
    actualAttendeeCount: typeof r.actualAttendeeCount === 'number' ? r.actualAttendeeCount : undefined,
    actualParticipantUserIds: isStringArray(r.actualParticipantUserIds) ? r.actualParticipantUserIds : undefined,
    actualStartedAt: typeof r.actualStartedAt === 'string' ? r.actualStartedAt : null,
    actualEndedAt: typeof r.actualEndedAt === 'string' ? r.actualEndedAt : null,
    topic: typeof r.topic === 'string' ? r.topic : undefined,
    recordingAvailable: typeof r.recordingAvailable === 'boolean' ? r.recordingAvailable : undefined,
  }
}
