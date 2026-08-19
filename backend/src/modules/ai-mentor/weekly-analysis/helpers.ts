import type { WeeklyRawData } from './types.js'

export const extractAnswers = (value: unknown): string[] => {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  if (!('answers' in record)) return []
  const answers = record.answers
  if (!Array.isArray(answers)) return []
  return answers.filter((answer): answer is string => typeof answer === 'string')
}

export function extractTaggedLines(transcripts: WeeklyRawData['zoomTranscripts'], prefix: string): string[] {
  return transcripts.flatMap((item) =>
    item.transcript
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith(prefix))
      .map((line) => line.slice(prefix.length).trim())
      .filter((line) => line.length > 0),
  )
}

export function getMicroTaskProgressStats(tasks: WeeklyRawData['microTasks']) {
  const taskProgress = tasks
    .map(task => task.progressPercent)
    .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))

  const partialTaskCount = taskProgress.filter(value => value > 0 && value < 100).length
  const slowProgressTaskCount = taskProgress.filter(value => value > 0 && value < 80).length
  const averageTaskProgress = taskProgress.length
    ? Math.round(taskProgress.reduce((sum, value) => sum + value, 0) / taskProgress.length)
    : null

  return {
    partialTaskCount,
    slowProgressTaskCount,
    averageTaskProgress,
  }
}

export function normalizeZoomTranscript(value: unknown): WeeklyRawData['zoomTranscripts'][number] | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const transcript = String(record.transcript ?? '').trim()
  if (!transcript) return null

  const scheduledAtValue = record.scheduledAt
  const scheduledAt = scheduledAtValue instanceof Date
    ? scheduledAtValue
    : typeof scheduledAtValue === 'string' && scheduledAtValue.trim()
      ? new Date(scheduledAtValue)
      : null

  return {
    sessionId: typeof record.sessionId === 'string' ? record.sessionId : null,
    scheduledAt: scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null,
    transcript,
    transcriptLength: typeof record.transcriptLength === 'number' ? record.transcriptLength : transcript.length,
    fileId: typeof record.fileId === 'string' ? record.fileId : null,
    fileUniqueId: typeof record.fileUniqueId === 'string' ? record.fileUniqueId : null,
    chatId: typeof record.chatId === 'string' ? record.chatId : null,
    messageId: typeof record.messageId === 'number' ? record.messageId : null,
    mediaType: typeof record.mediaType === 'string' ? record.mediaType : null,
    fileName: typeof record.fileName === 'string' ? record.fileName : null,
    mimeType: typeof record.mimeType === 'string' ? record.mimeType : null,
    caption: typeof record.caption === 'string' ? record.caption : null,
    observedAt: typeof record.observedAt === 'string' ? record.observedAt : null,
  }
}
