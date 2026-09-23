import { prisma } from '../../../db/client.js'
import { parseZoomPostReport } from './zoomPostReport.types.js'

export type ZoomCompletionDraftUnavailableReason =
  | 'session_not_found'
  | 'forbidden'
  | 'recording_missing'
  | 'transcript_missing'

export type ZoomCompletionDraftResult =
  | {
      available: true
      topic: string | null
      summary: string | null
      keyPoints: string[]
      recordingUrl: string | null
    }
  | {
      available: false
      reason: ZoomCompletionDraftUnavailableReason
    }

export type ZoomCompletionDraftActor = {
  userId: string
  role?: string | null
  expertId?: string | null
}

function isCoachAuthorized(actor: ZoomCompletionDraftActor, session: { expertId: string | null }) {
  const role = String(actor.role ?? '').toUpperCase()
  if (role === 'ADMIN' || role === 'SUPERADMIN') return true
  return Boolean(actor.expertId && actor.expertId === session.expertId)
}

function normalizeText(value: unknown): string | null {
  const normalized = String(value ?? '').trim()
  return normalized.length > 0 ? normalized : null
}

export async function getZoomCompletionDraft(input: {
  sessionId: string
  actor: ZoomCompletionDraftActor
}): Promise<ZoomCompletionDraftResult> {
  const session = await prisma.zoomSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      expertId: true,
      topic: true,
      type: true,
      scheduledAt: true,
      postSessionReport: true,
    },
  })

  if (!session) {
    return { available: false, reason: 'session_not_found' }
  }

  if (!isCoachAuthorized(input.actor, session)) {
    return { available: false, reason: 'forbidden' }
  }

  const report = parseZoomPostReport(session.postSessionReport)
  const transcript = normalizeText(report?.transcript)
  if (!transcript) {
    return {
      available: false,
      reason: report?.audioUrl || report?.audioFileId ? 'transcript_missing' : 'recording_missing',
    }
  }

  return {
    available: true,
    topic: normalizeText(report?.topic) ?? session.topic,
    summary: normalizeText(report?.summary),
    keyPoints: report?.insights ?? [],
    recordingUrl: normalizeText(report?.audioUrl),
  }
}
