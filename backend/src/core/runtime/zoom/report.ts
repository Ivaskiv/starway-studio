import { ZoomStatus, type Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { generateZoomTranscriptInsight } from '../../../modules/zoom/audio/zoomInsight.service.js'
import type { EventSource } from '../../../modules/events/service.js'
import type { ZoomAudioPayload } from './payload.js'
import type { RuntimeOutboxProcessItem } from '../outbox.js'

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function mergeZoomPostSessionReport(existing: unknown, next: Prisma.JsonObject): Prisma.JsonObject {
  if (!isJsonObject(existing)) {
    return next
  }

  return {
    ...existing,
    ...next,
  }
}

export type MatchedZoomSession = {
  id: string
  expertId: string | null
  topic: string
  type: string
  scheduledAt: Date
  postSessionReport: Prisma.JsonValue | null
  attendees: Array<{
    user: {
      telegramUserName: string | null
      firstName: string | null
      email: string
    }
  }>
}

function sanitizeZoomUsernameCandidate(value: string | null | undefined): string | null {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^@+/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || null
}

export function resolveZoomSessionUsername(session: MatchedZoomSession | null): string | null {
  const attendee = session?.attendees[0]?.user
  if (!attendee) return null

  return sanitizeZoomUsernameCandidate(
    attendee.telegramUserName
      ?? attendee.firstName
      ?? attendee.email.split('@')[0]
      ?? null,
  )
}

export async function matchZoomSessionForAudio(observedAt: Date): Promise<{ session: MatchedZoomSession | null; matchMethod: 'scheduled_at_match' | 'heuristic_fallback' | 'not_found' }> {
  const session = await prisma.zoomSession.findFirst({
    where: {
      scheduledAt: { lte: observedAt },
      status: { not: ZoomStatus.CANCELLED },
    },
    orderBy: [{ scheduledAt: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      expertId: true,
      topic: true,
      type: true,
      scheduledAt: true,
      postSessionReport: true,
      attendees: {
        take: 1,
        select: {
          user: {
            select: {
              telegramUserName: true,
              firstName: true,
              email: true,
            },
          },
        },
      },
    },
  }).catch(() => null)

  if (session) {
    return { session, matchMethod: 'scheduled_at_match' }
  }

  const fallback = await prisma.zoomSession.findFirst({
    where: {
      status: { not: ZoomStatus.CANCELLED },
    },
    orderBy: [{ scheduledAt: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      expertId: true,
      topic: true,
      type: true,
      scheduledAt: true,
      postSessionReport: true,
      attendees: {
        take: 1,
        select: {
          user: {
            select: {
              telegramUserName: true,
              firstName: true,
              email: true,
            },
          },
        },
      },
    },
  }).catch(() => null)

  if (fallback) {
    return { session: fallback, matchMethod: 'heuristic_fallback' }
  }

  return { session: null, matchMethod: 'not_found' }
}

export async function finalizeZoomTranscriptReport(input: {
  item: RuntimeOutboxProcessItem
  payload: Prisma.JsonObject | null
  zoomAudioPayload: ZoomAudioPayload | null
  finalMatchedSession: MatchedZoomSession | null
  matchedSessionResult: {
    session: MatchedZoomSession | null
    matchMethod: 'scheduled_at_match' | 'heuristic_fallback' | 'not_found'
  }
  transcript: string
  fileId: string
}): Promise<void> {
  const {
    item,
    payload,
    zoomAudioPayload,
    finalMatchedSession,
    matchedSessionResult,
    transcript,
    fileId,
  } = input

  const fallbackSession = finalMatchedSession

    if (fallbackSession?.id) {
      console.log('[ZOOM_TRANSCRIPT] session matched', {
        sessionId: fallbackSession.id,
        matchMethod: matchedSessionResult.matchMethod,
        audioItemId: item.id,
      })

      const transcriptInsight = await generateZoomTranscriptInsight({
        sessionId: fallbackSession.id,
        expertId: fallbackSession.expertId ?? 'zoom-session',
        topic: fallbackSession.topic,
        sessionType: fallbackSession.type,
        sessionDate: fallbackSession.scheduledAt.toISOString().slice(0, 10),
        transcript,
      })

      const canonicalReport = mergeZoomPostSessionReport(fallbackSession.postSessionReport, {
        sessionDate: fallbackSession.scheduledAt.toISOString().slice(0, 10),
        sessionType: fallbackSession.type,
        audioUrl: typeof zoomAudioPayload?.cloudinaryUrl === 'string' ? zoomAudioPayload.cloudinaryUrl : null,
        audioDuration: typeof zoomAudioPayload?.duration === 'number' ? zoomAudioPayload.duration : null,
        audioFileName: typeof zoomAudioPayload?.fileName === 'string' ? zoomAudioPayload.fileName : null,
        audioFileId: typeof zoomAudioPayload?.cloudinaryAssetId === 'string'
          ? zoomAudioPayload.cloudinaryAssetId
          : typeof zoomAudioPayload?.cloudinaryPublicId === 'string'
            ? zoomAudioPayload.cloudinaryPublicId
            : fileId,
        transcript,
        transcriptLength: transcript.length,
        transcriptSource: typeof zoomAudioPayload?.source === 'string' ? zoomAudioPayload.source : 'telegram',
        transcriptStoredAt: new Date().toISOString(),
        transcribedAt: new Date().toISOString(),
        summary: transcriptInsight.summary,
        insights: transcriptInsight.insights,
        objections: transcriptInsight.objections,
        wins: transcriptInsight.wins,
        recurringThemes: transcriptInsight.recurringThemes,
        contentIdeas: transcriptInsight.contentIdeas,
        coachReport: transcriptInsight.coachReport,
        analyzedAt: new Date().toISOString(),
        transcriptMeta: {
          fileId,
          fileUniqueId: typeof zoomAudioPayload?.fileUniqueId === 'string' ? zoomAudioPayload.fileUniqueId : null,
          chatId: typeof zoomAudioPayload?.chatId === 'string' ? zoomAudioPayload.chatId : item.tenantId ?? null,
          messageId: typeof zoomAudioPayload?.messageId === 'number' ? zoomAudioPayload.messageId : null,
          mediaType: zoomAudioPayload?.mediaType ?? null,
          fileName: typeof zoomAudioPayload?.fileName === 'string' ? zoomAudioPayload.fileName : null,
          mimeType: typeof zoomAudioPayload?.mimeType === 'string' ? zoomAudioPayload.mimeType : null,
          caption: typeof zoomAudioPayload?.caption === 'string' ? zoomAudioPayload.caption : null,
          zoomType: typeof zoomAudioPayload?.zoomType === 'string' ? zoomAudioPayload.zoomType : null,
          observedAt: typeof zoomAudioPayload?.observedAt === 'string' ? zoomAudioPayload.observedAt : null,
          duration: typeof zoomAudioPayload?.duration === 'number' ? zoomAudioPayload.duration : null,
          sizeBytes: typeof zoomAudioPayload?.sizeBytes === 'number' ? zoomAudioPayload.sizeBytes : null,
          sizeMB: typeof zoomAudioPayload?.sizeMB === 'number' ? zoomAudioPayload.sizeMB : null,
          processingStrategy: zoomAudioPayload?.processingStrategy ?? null,
          downloadUrl: typeof zoomAudioPayload?.downloadUrl === 'string' ? zoomAudioPayload.downloadUrl : null,
          cloudinaryUrl: typeof zoomAudioPayload?.cloudinaryUrl === 'string' ? zoomAudioPayload.cloudinaryUrl : null,
          cloudinaryPublicId: typeof zoomAudioPayload?.cloudinaryPublicId === 'string' ? zoomAudioPayload.cloudinaryPublicId : null,
          cloudinaryAssetId: typeof zoomAudioPayload?.cloudinaryAssetId === 'string' ? zoomAudioPayload.cloudinaryAssetId : null,
          cloudinaryFolder: typeof zoomAudioPayload?.cloudinaryFolder === 'string' ? zoomAudioPayload.cloudinaryFolder : null,
          cloudinaryFormat: typeof zoomAudioPayload?.cloudinaryFormat === 'string' ? zoomAudioPayload.cloudinaryFormat : null,
          cloudinaryResourceType: typeof zoomAudioPayload?.cloudinaryResourceType === 'string' ? zoomAudioPayload.cloudinaryResourceType : null,
          outboxId: item.id,
          outboxDedupeKey: item.dedupeKey,
        },
      })

      await prisma.zoomSession.update({
        where: { id: fallbackSession.id },
        data: {
          postSessionReport: canonicalReport as Prisma.InputJsonValue,
          status: ZoomStatus.COMPLETED,
        },
      })
    } else {
      console.warn('[ZOOM_TRANSCRIPT] session NOT matched — orphan transcript', {
        audioItemId: item.id,
        payload,
      })

      await prisma.runtimeOutbox.create({
        data: {
          scope: 'zoom',
          type: 'ZOOM_TRANSCRIPT_ORPHAN',
          source: 'runtimeOutbox',
          dedupeKey: `zoom_orphan_${item.id}`,
          payload: {
            audioItemId: item.id,
            reason: 'no_session_matched',
          } as Prisma.InputJsonValue,
          runAt: new Date(),
        },
      }).catch(() => undefined)
    }

  const { trackEvent } = await import('../../../modules/events/service.js')
    const transcriptEventSource = (
      typeof zoomAudioPayload?.source === 'string' ? zoomAudioPayload.source : 'telegram'
    ) as EventSource
    await trackEvent({
      userId: item.userId ?? null,
      type: 'ZOOM_TRANSCRIPT_READY',
      source: transcriptEventSource,
      payload: {
        source: transcriptEventSource,
        sessionId: fallbackSession?.id ?? null,
        sourceEvent: {
          type: item.type,
          scope: item.scope,
          tenantId: item.tenantId ?? null,
          state: item.state ?? null,
          createdAt: item.createdAt.toISOString(),
          payload: zoomAudioPayload ?? payload ?? {},
        },
        transcript,
        transcriptLength: transcript.length,
        fileId,
        fileUniqueId: typeof zoomAudioPayload?.fileUniqueId === 'string' ? zoomAudioPayload.fileUniqueId : null,
        chatId: typeof zoomAudioPayload?.chatId === 'string' ? zoomAudioPayload.chatId : item.tenantId ?? null,
        messageId: typeof zoomAudioPayload?.messageId === 'number' ? zoomAudioPayload.messageId : null,
        mediaType: zoomAudioPayload?.mediaType ?? null,
        fileName: typeof zoomAudioPayload?.fileName === 'string' ? zoomAudioPayload.fileName : null,
        mimeType: typeof zoomAudioPayload?.mimeType === 'string' ? zoomAudioPayload.mimeType : null,
        caption: typeof zoomAudioPayload?.caption === 'string' ? zoomAudioPayload.caption : null,
        zoomType: typeof zoomAudioPayload?.zoomType === 'string' ? zoomAudioPayload.zoomType : null,
        observedAt: typeof zoomAudioPayload?.observedAt === 'string' ? zoomAudioPayload.observedAt : null,
        duration: typeof zoomAudioPayload?.duration === 'number' ? zoomAudioPayload.duration : null,
        sizeBytes: typeof zoomAudioPayload?.sizeBytes === 'number' ? zoomAudioPayload.sizeBytes : null,
        sizeMB: typeof zoomAudioPayload?.sizeMB === 'number' ? zoomAudioPayload.sizeMB : null,
        processingStrategy: zoomAudioPayload?.processingStrategy ?? null,
        downloadUrl: typeof zoomAudioPayload?.downloadUrl === 'string' ? zoomAudioPayload.downloadUrl : null,
        cloudinaryUrl: typeof zoomAudioPayload?.cloudinaryUrl === 'string' ? zoomAudioPayload.cloudinaryUrl : null,
          cloudinaryPublicId: typeof zoomAudioPayload?.cloudinaryPublicId === 'string' ? zoomAudioPayload.cloudinaryPublicId : null,
          cloudinaryAssetId: typeof zoomAudioPayload?.cloudinaryAssetId === 'string' ? zoomAudioPayload.cloudinaryAssetId : null,
          cloudinaryFolder: typeof zoomAudioPayload?.cloudinaryFolder === 'string' ? zoomAudioPayload.cloudinaryFolder : null,
          cloudinaryFormat: typeof zoomAudioPayload?.cloudinaryFormat === 'string' ? zoomAudioPayload.cloudinaryFormat : null,
          cloudinaryResourceType: typeof zoomAudioPayload?.cloudinaryResourceType === 'string' ? zoomAudioPayload.cloudinaryResourceType : null,
          runtime: {
            outboxId: item.id,
            outboxDedupeKey: item.dedupeKey,
          originalEventId: item.id,
        },
      } as Prisma.InputJsonValue,
    })
}
