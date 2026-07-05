import { ZoomStatus, type Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { bot, coachBot, contentBot } from '../../lib/telegram.js'
import {
  compressZoomAudioFile,
  downloadTelegramAudioSourceToTempFile,
  formatZoomAudioSizeMB,
  normalizeZoomAudioFile,
  OPENAI_AUDIO_TRANSCRIPTION_MAX_BYTES,
  probeZoomAudioFileSizeBytes,
  resolveZoomAudioStrategy,
  splitZoomAudioFile,
  transcribeTelegramAudio,
  type ZoomAudioProcessingStrategy,
} from '../../modules/voice/voice.service.js'
import { uploadZoomAudioToCloudinary, resolveZoomAudioStorageType } from '../../modules/zoom/zoomAudioStorage.service.js'
import { generateZoomTranscriptInsight } from '../../modules/zoom/zoomInsight.service.js'
import type { EventSource } from '../../modules/events/service.js'
import { buildRuntimeTelemetry, claimRuntimeEventReplay, withRuntimeAdvisoryLock, type RuntimeIdempotencyInput } from './runtimeIdempotency.js'

export type RuntimeOutboxItem = {
  scope: string
  type: string
  source: string
  userId?: string | null
  state?: string | null
  tenantId?: string | null
  payload?: Prisma.InputJsonValue
  runAt?: Date
  runtime?: Partial<RuntimeIdempotencyInput>
}

const OUTBOX_TTL_MS = 15 * 60_000
const OUTBOX_LOCK_SCOPE = 'runtime_outbox'
const RUNTIME_OUTBOX_POLL_INTERVAL_MS = 5_000
let runtimeOutboxPollTimer: NodeJS.Timeout | null = null

type CoachStatusMessageRef = {
  chatId: string
  messageId: number
}

type CoachInlineKeyboardMarkup = {
  inline_keyboard: Array<Array<{
    text: string
    callback_data: string
  }>>
}

function buildZoomCoachStatusText(lines: string[], fileName?: string | null, zoomType?: string | null): string {
  const body = lines.filter(Boolean).join('\n')
  const fileLine = fileName ? `\n\n📁 ${fileName}` : ''
  const zoomTypeLine = zoomType ? `\n🎯 Тип: ${zoomType}` : ''
  return `${body}${fileLine}${zoomTypeLine}`
}

async function sendZoomCoachStatusMessage(chatId: string, text: string, runtime: 'bot' | 'coachBot' = 'bot') {
  const client = runtime === 'coachBot' ? coachBot : bot
  const message = await client.telegram.sendMessage(chatId, text)
  return { chatId, messageId: message.message_id }
}

async function editZoomCoachStatusMessage(
  ref: CoachStatusMessageRef | null,
  text: string,
  runtime: 'bot' | 'coachBot' = 'bot',
  replyMarkup?: CoachInlineKeyboardMarkup,
) {
  if (!ref) return null
  const client = runtime === 'coachBot' ? coachBot : bot
  const options = replyMarkup
    ? ({ reply_markup: replyMarkup } as Parameters<typeof client.telegram.editMessageText>[4])
    : undefined
  await client.telegram.editMessageText(ref.chatId, ref.messageId, undefined, text, options)
  return ref
}

function buildOutboxDedupeKey(input: RuntimeOutboxItem) {
  const runtime = buildRuntimeTelemetry({
    scope: input.scope,
    type: input.type,
    source: input.source,
    userId: input.userId ?? null,
    state: input.state ?? null,
    tenantId: input.tenantId ?? null,
    payload: (input.payload ?? null) as Prisma.JsonValue,
    requestFingerprint: input.runtime?.requestFingerprint ?? null,
    correlationId: input.runtime?.correlationId ?? null,
    requestId: input.runtime?.requestId ?? null,
    flowExecutionId: input.runtime?.flowExecutionId ?? null,
    replayTraceId: input.runtime?.replayTraceId ?? null,
    runtimeStage: input.runtime?.runtimeStage ?? input.state ?? input.type,
    orchestrationPath: input.runtime?.orchestrationPath,
    retryAttempt: input.runtime?.retryAttempt ?? 0,
    replayReason: input.runtime?.replayReason ?? null,
    executionLatencyMs: input.runtime?.executionLatencyMs ?? null,
    queueLatencyMs: input.runtime?.queueLatencyMs ?? null,
    deliveryLatencyMs: input.runtime?.deliveryLatencyMs ?? null,
    handlerDurationMs: input.runtime?.handlerDurationMs ?? null,
    failureClassification: input.runtime?.failureClassification ?? null,
  })

  return runtime.idempotency_key
}

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

type MatchedZoomSession = {
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

function resolveZoomSessionUsername(session: MatchedZoomSession | null): string | null {
  const attendee = session?.attendees[0]?.user
  if (!attendee) return null

  return sanitizeZoomUsernameCandidate(
    attendee.telegramUserName
      ?? attendee.firstName
      ?? attendee.email.split('@')[0]
      ?? null,
  )
}

async function matchZoomSessionForAudio(observedAt: Date): Promise<{ session: MatchedZoomSession | null; matchMethod: 'scheduled_at_match' | 'heuristic_fallback' | 'not_found' }> {
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

export async function enqueueRuntimeOutboxItem(input: RuntimeOutboxItem): Promise<{ duplicate: boolean; dedupeKey: string }> {
  const dedupeKey = buildOutboxDedupeKey(input)
  const runAt = input.runAt ?? new Date()
  const payload = {
    ...(typeof input.payload === 'object' && input.payload !== null && !Array.isArray(input.payload)
      ? input.payload as Prisma.JsonObject
      : {}),
    runtime: {
      scope: input.scope,
      type: input.type,
      source: input.source,
      userId: input.userId ?? null,
      state: input.state ?? null,
      tenantId: input.tenantId ?? null,
      idempotency_key: dedupeKey,
      request_id: input.runtime?.requestId ?? null,
      correlation_id: input.runtime?.correlationId ?? null,
      flow_execution_id: input.runtime?.flowExecutionId ?? null,
      replay_trace_id: input.runtime?.replayTraceId ?? null,
      runtime_stage: input.runtime?.runtimeStage ?? input.state ?? input.type,
      orchestration_path: input.runtime?.orchestrationPath ?? [input.scope, input.type],
      retry_attempt: input.runtime?.retryAttempt ?? 0,
      replay_reason: input.runtime?.replayReason ?? null,
    },
  } satisfies Prisma.JsonObject

  const existing = await prisma.runtimeOutbox.findUnique({
    where: { dedupeKey },
    select: { id: true, createdAt: true, status: true },
  }).catch(() => null)

  if (existing) {
    return { duplicate: true, dedupeKey }
  }

  await prisma.runtimeOutbox.create({
    data: {
      scope: input.scope,
      type: input.type,
      source: input.source,
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.state ? { state: input.state } : {}),
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      payload: payload as Prisma.InputJsonValue,
      runAt,
      dedupeKey,
    },
  })

  return { duplicate: false, dedupeKey }
}

export async function processRuntimeOutbox(limit = 100): Promise<number> {
  return withRuntimeAdvisoryLock({
    scope: OUTBOX_LOCK_SCOPE,
    type: 'process',
    source: 'internal',
    requestFingerprint: 'runtime-outbox',
    runtimeStage: 'outbox',
  }, async () => {
    const due = await prisma.runtimeOutbox.findMany({
      where: {
        status: 'PENDING',
        runAt: { lte: new Date() },
      },
      orderBy: [{ runAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    })

    let processed = 0
    for (const item of due) {
      const payload = item.payload as Prisma.JsonObject | null
      const runtime = payload?.runtime && typeof payload.runtime === 'object' && !Array.isArray(payload.runtime)
        ? payload.runtime as Record<string, unknown>
        : {}
      let zoomAudioPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
          ? payload as Prisma.JsonObject & {
            fileId?: string
            fileUniqueId?: string | null
            chatId?: string
            messageId?: number | null
            mediaType?: 'voice' | 'audio' | 'document_audio'
            fileName?: string | null
            mimeType?: string | null
            caption?: string | null
            source?: string
            zoomType?: string | null
            observedAt?: string
            uploadedAt?: string
            duration?: number | null
            sizeBytes?: number | null
            sizeMB?: number | null
            processingStrategy?: ZoomAudioProcessingStrategy | null
            downloadUrl?: string | null
            cloudinaryUrl?: string | null
            cloudinaryPublicId?: string | null
            cloudinaryAssetId?: string | null
            cloudinaryFolder?: string | null
            cloudinaryFormat?: string | null
            cloudinaryResourceType?: string | null
          }
        : null

      const replay = await claimRuntimeEventReplay({
        scope: item.scope,
        type: item.type,
        source: item.source,
        userId: item.userId ?? null,
        state: item.state ?? null,
        tenantId: item.tenantId ?? null,
        requestFingerprint: typeof runtime.request_id === 'string' ? runtime.request_id : item.dedupeKey,
        payload,
        ttlMs: OUTBOX_TTL_MS,
      })

      if (replay.duplicate) {
        await prisma.runtimeOutbox.update({
          where: { id: item.id },
          data: {
            status: 'DONE',
            processedAt: new Date(),
            attempts: { increment: 1 },
            lastError: null,
          },
        }).catch(() => undefined)
        continue
      }

      await prisma.event.create({
        data: {
          ...(item.userId ? { userId: item.userId } : {}),
          type: item.type,
          source: item.source,
          ...(item.state ? { state: item.state } : {}),
          payload: payload as Prisma.InputJsonValue,
        },
      })

      if (item.type === 'ZOOM_AUDIO_UPLOADED') {
        let coachStatusRef: CoachStatusMessageRef | null = null
        const fileId = typeof zoomAudioPayload?.fileId === 'string' ? zoomAudioPayload.fileId.trim() : ''
        console.log('[ZOOM_DEBUG] step 1 — payload received', {
          fileId: zoomAudioPayload?.fileId ?? null,
          fileName: zoomAudioPayload?.fileName ?? null,
          zoomType: zoomAudioPayload?.zoomType ?? null,
          source: zoomAudioPayload?.source ?? null,
        })
        if (!fileId) {
          await prisma.runtimeOutbox.update({
            where: { id: item.id },
            data: {
              status: 'FAILED',
              processedAt: new Date(),
              attempts: { increment: 1 },
              lastError: 'missing_zoom_audio_file_id',
            },
          }).catch(() => undefined)
          continue
        }

        const audioPayload = zoomAudioPayload as NonNullable<typeof zoomAudioPayload>

        const mediaType = audioPayload.mediaType === 'voice'
          ? 'TELEGRAM_VOICE'
          : 'TELEGRAM_AUDIO'
        const opsChatId = (typeof audioPayload.chatId === 'string' && audioPayload.chatId.trim())
          || process.env.STARWAY_OPS_CHAT_ID?.trim()
          || process.env.OPS_TELEGRAM_CHAT_ID?.trim()
        const statusRuntime = typeof audioPayload.chatId === 'string' && audioPayload.chatId.trim()
          ? 'coachBot'
          : 'bot'
        const cleanupTasks: Array<() => Promise<void>> = []
        let transcript = ''

        try {
          if (!contentBot) {
            console.error('[ZOOM_DEBUG] contentBot is undefined — check CONTENT_BOT_TOKEN')
            throw new Error('contentBot not initialized')
          }

          const uploadedAt = typeof audioPayload.uploadedAt === 'string' ? new Date(audioPayload.uploadedAt) : null
          if (uploadedAt && !Number.isNaN(uploadedAt.getTime()) && audioPayload?.source !== 'cloudinary') {
            console.error('[ZOOM_DEBUG] NOTE: Telegram fileId expires after ~1 hour', {
              fileId,
              uploadedAt: audioPayload.uploadedAt ?? null,
              ageMinutes: Math.round((Date.now() - uploadedAt.getTime()) / 60000),
            })
          }

          let telegramFileSizeBytes = typeof audioPayload.sizeBytes === 'number' && Number.isFinite(audioPayload.sizeBytes) && audioPayload.sizeBytes > 0
            ? audioPayload.sizeBytes
            : null
          let telegramDurationSeconds = typeof audioPayload.duration === 'number' && Number.isFinite(audioPayload.duration) && audioPayload.duration > 0
            ? audioPayload.duration
            : null

          if (!telegramFileSizeBytes) {
            const telegramFile = await contentBot.telegram.getFile(fileId)
            telegramFileSizeBytes = typeof telegramFile.file_size === 'number' && Number.isFinite(telegramFile.file_size) && telegramFile.file_size > 0
              ? telegramFile.file_size
              : null
          }

          const sizeMB = formatZoomAudioSizeMB(telegramFileSizeBytes)
          const processingStrategy = resolveZoomAudioStrategy(telegramFileSizeBytes)
          zoomAudioPayload = {
            ...audioPayload,
            duration: telegramDurationSeconds,
            sizeBytes: telegramFileSizeBytes,
            sizeMB,
            processingStrategy,
          }

          await prisma.runtimeOutbox.update({
            where: { id: item.id },
            data: {
              payload: zoomAudioPayload as Prisma.InputJsonValue,
            },
          }).catch(() => undefined)

          const coachStatusText = buildZoomCoachStatusText([
            '🎙 Аудіо отримано',
            '',
            '📦 Аналізуємо розмір',
            `📁 ${audioPayload.fileName ?? 'zoom audio'}`,
            `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
            `⚙️ Стратегія: ${processingStrategy}`,
            '',
            '🟡 Статус: аналізуємо та починаємо обробку',
          ], audioPayload.fileName ?? null, audioPayload.zoomType ?? null)

          if (opsChatId) {
            try {
              coachStatusRef = await sendZoomCoachStatusMessage(opsChatId, coachStatusText, statusRuntime)
            } catch (error) {
              console.error('[ZOOM_TRANSCRIPT] intake notify failed', error)
            }
          }

          const updateCoachStatus = async (lines: string[], options?: { replyMarkup?: CoachInlineKeyboardMarkup }) => {
            if (!opsChatId || !coachStatusRef) return
            const text = buildZoomCoachStatusText(lines, audioPayload.fileName ?? null, audioPayload.zoomType ?? null)
            try {
              await editZoomCoachStatusMessage(coachStatusRef, text, statusRuntime, options?.replyMarkup)
            } catch (error) {
              console.error('[ZOOM_TRANSCRIPT] coach status update failed', error)
            }
          }

          await updateCoachStatus([
            '🎙 Аудіо отримано',
            '',
            '📦 Аналізуємо розмір',
            `📁 ${audioPayload.fileName ?? 'zoom audio'}`,
            `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
            `⚙️ Стратегія: ${processingStrategy}`,
            '',
            '⬇️ Завантаження...',
          ])

          const directDownloadUrl = typeof audioPayload.downloadUrl === 'string' && audioPayload.downloadUrl.trim()
            ? audioPayload.downloadUrl.trim()
            : typeof audioPayload.cloudinaryUrl === 'string' && audioPayload.cloudinaryUrl.trim()
              ? audioPayload.cloudinaryUrl.trim()
              : null

          let downloadUrl: string
          if (directDownloadUrl) {
            downloadUrl = directDownloadUrl
            console.log('[ZOOM_DEBUG] step 2 — direct download url ok', {
              downloadUrl: `${downloadUrl.substring(0, 60)}...`,
              source: audioPayload.source ?? null,
              fileId,
            })
          } else {
            try {
              const fileLink = await contentBot.telegram.getFileLink(fileId)
              downloadUrl = fileLink.href ?? String(fileLink)
              console.log('[ZOOM_DEBUG] step 2 — getFileLink ok', {
                downloadUrl: `${downloadUrl.substring(0, 60)}...`,
                fileId,
              })
            } catch (err) {
              console.error('[ZOOM_DEBUG] step 2 FAILED — getFileLink error', {
                fileId,
                error: err instanceof Error ? err.message : String(err),
                botToken: process.env.CONTENT_BOT_TOKEN
                  ? 'CONTENT_BOT_TOKEN set'
                  : 'CONTENT_BOT_TOKEN missing — falling back to TELEGRAM_BOT_TOKEN',
              })
              throw err
            }
          }

          const fileName = typeof zoomAudioPayload?.fileName === 'string' && zoomAudioPayload.fileName.trim()
            ? zoomAudioPayload.fileName
            : 'zoom_audio'
          const mimeType = typeof zoomAudioPayload?.mimeType === 'string' ? zoomAudioPayload.mimeType : null
          const observedAt = typeof zoomAudioPayload?.observedAt === 'string'
            ? new Date(zoomAudioPayload.observedAt)
            : item.createdAt

          const needsLocalFile = audioPayload.source !== 'cloudinary' || processingStrategy !== 'DIRECT_TRANSCRIPT'
          const rawFile = needsLocalFile
            ? await downloadTelegramAudioSourceToTempFile(downloadUrl, fileName)
            : null
          if (rawFile) {
            cleanupTasks.push(rawFile.cleanup)
          }

          const matchedSessionResult = await matchZoomSessionForAudio(observedAt)
          const matchedSession = matchedSessionResult.session
          let finalMatchedSession = matchedSession

          if (audioPayload.source !== 'cloudinary') {
            if (!rawFile) {
              throw new Error('zoom_audio_local_file_missing')
            }
            const storageType = resolveZoomAudioStorageType(
              matchedSession?.type ?? (typeof zoomAudioPayload.zoomType === 'string' ? zoomAudioPayload.zoomType : null),
            )
            const uploadedAsset = await uploadZoomAudioToCloudinary({
              localFilePath: rawFile.filePath,
              sessionDate: matchedSession?.scheduledAt ?? observedAt,
              sessionType: storageType,
              username: storageType === 'INDIVIDUAL' ? resolveZoomSessionUsername(matchedSession) : null,
            })

            telegramFileSizeBytes = uploadedAsset.bytes ?? telegramFileSizeBytes
            telegramDurationSeconds = uploadedAsset.duration ?? telegramDurationSeconds
            const uploadedSizeMB = formatZoomAudioSizeMB(telegramFileSizeBytes)

            zoomAudioPayload = {
              ...zoomAudioPayload,
              zoomType: storageType,
              duration: telegramDurationSeconds,
              sizeBytes: telegramFileSizeBytes,
              sizeMB: uploadedSizeMB,
              downloadUrl: uploadedAsset.secureUrl,
              cloudinaryUrl: uploadedAsset.secureUrl,
              cloudinaryPublicId: uploadedAsset.publicId,
              cloudinaryAssetId: uploadedAsset.assetId,
              cloudinaryFolder: uploadedAsset.folder,
              cloudinaryFormat: uploadedAsset.format,
              cloudinaryResourceType: uploadedAsset.resourceType,
            }

            await prisma.runtimeOutbox.update({
              where: { id: item.id },
              data: {
                payload: zoomAudioPayload as Prisma.InputJsonValue,
              },
            }).catch(() => undefined)

            downloadUrl = uploadedAsset.secureUrl

            console.log('[ZOOM_DEBUG] step 2.5 — cloudinary upload ok', {
              sessionId: matchedSession?.id ?? null,
              matchMethod: matchedSessionResult.matchMethod,
              publicId: uploadedAsset.publicId,
              assetId: uploadedAsset.assetId,
              folder: uploadedAsset.folder,
              secureUrl: `${uploadedAsset.secureUrl.substring(0, 60)}...`,
            })
          }

          let chunkPaths: string[] = []
          const transcribeChunkedAudio = async (sourcePath: string, sourceLabel: string) => {
            const chunks = await splitZoomAudioFile(sourcePath, 240)
            chunkPaths = chunks.filePaths
            cleanupTasks.push(chunks.cleanup)

            const chunkTranscripts: string[] = []
            for (const [index, chunkPath] of chunkPaths.entries()) {
              await updateCoachStatus([
                '🎙 Аудіо отримано',
                '',
                '📦 Аналізуємо розмір',
                `📁 ${audioPayload.fileName ?? 'zoom audio'}`,
                `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
                `⚙️ Стратегія: ${processingStrategy}`,
                '',
                '🔤 Транскрипція',
                `🔤 Частина ${index + 1} з ${chunkPaths.length}`,
              ])
              const chunkTranscript = await transcribeTelegramAudio(
                fileId,
                mediaType,
                mimeType,
                chunkPath,
              )
              if (chunkTranscript.trim()) {
                chunkTranscripts.push(chunkTranscript.trim())
              }
            }

            transcript = chunkTranscripts.join('\n\n').trim()
            console.log('[ZOOM_DEBUG] chunk transcription complete', {
              sourceLabel,
              chunks: chunkPaths.length,
              transcriptLength: transcript.length,
            })
          }

          if (processingStrategy === 'DIRECT_TRANSCRIPT') {
            console.log('[ZOOM_DEBUG] step 3 — starting transcription', {
              downloadUrl: `${downloadUrl.substring(0, 60)}...`,
              fileName,
            })
            await updateCoachStatus([
              '🎙 Аудіо отримано',
              '',
              '📦 Аналізуємо розмір',
              `📁 ${audioPayload.fileName ?? 'zoom audio'}`,
              `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
              `⚙️ Стратегія: ${processingStrategy}`,
              '',
              '🔤 Транскрипція',
              '🔤 Частина 1 з 1',
            ])
            transcript = await transcribeTelegramAudio(
              fileId,
              mediaType,
              mimeType,
              downloadUrl,
            )
          } else {
            await updateCoachStatus([
              '🎙 Аудіо отримано',
              '',
              '📦 Аналізуємо розмір',
              `📁 ${audioPayload.fileName ?? 'zoom audio'}`,
              `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
              `⚙️ Стратегія: ${processingStrategy}`,
              '',
              '⬇️ Завантаження...',
            ])

            if (processingStrategy === 'NORMALIZE_TRANSCRIPT') {
              if (!rawFile) {
                throw new Error('zoom_audio_local_file_missing')
              }
              await updateCoachStatus([
                '🎙 Аудіо отримано',
                '',
                '📦 Аналізуємо розмір',
                `📁 ${zoomAudioPayload.fileName ?? 'zoom audio'}`,
                `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
                `⚙️ Стратегія: ${processingStrategy}`,
                '',
                '⚙️ Оптимізація...',
              ])
              const normalized = await normalizeZoomAudioFile(rawFile.filePath)
              cleanupTasks.push(normalized.cleanup)

              const normalizedSizeBytes = await probeZoomAudioFileSizeBytes(normalized.filePath)
              if (normalizedSizeBytes && normalizedSizeBytes <= OPENAI_AUDIO_TRANSCRIPTION_MAX_BYTES) {
                await updateCoachStatus([
                  '🎙 Аудіо отримано',
                  '',
                  '📦 Аналізуємо розмір',
                  `📁 ${audioPayload.fileName ?? 'zoom audio'}`,
                  `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
                  `⚙️ Стратегія: ${processingStrategy}`,
                  '',
                  '🔤 Транскрипція',
                  '🔤 Частина 1 з 1',
                ])
                transcript = await transcribeTelegramAudio(
                  fileId,
                  mediaType,
                  mimeType,
                  normalized.filePath,
                )
              } else {
                console.log('[ZOOM_DEBUG] normalized file still too large for direct transcription, chunking', {
                  normalizedSizeBytes,
                  limitBytes: OPENAI_AUDIO_TRANSCRIPTION_MAX_BYTES,
                })
                await updateCoachStatus([
                  '🎙 Аудіо отримано',
                  '',
                  '📦 Аналізуємо розмір',
                  `📁 ${audioPayload.fileName ?? 'zoom audio'}`,
                  `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
                  `⚙️ Стратегія: ${processingStrategy}`,
                  '',
                  '✂️ Розбиття на частини...',
                ])
                await transcribeChunkedAudio(normalized.filePath, 'normalized')
              }
            } else {
              if (!rawFile) {
                throw new Error('zoom_audio_local_file_missing')
              }
              let chunkSourcePath = rawFile.filePath
              if (processingStrategy === 'COMPRESS_CHUNK_TRANSCRIPT') {
                await updateCoachStatus([
                  '🎙 Аудіо отримано',
                  '',
                  '📦 Аналізуємо розмір',
                  `📁 ${audioPayload.fileName ?? 'zoom audio'}`,
                  `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
                  `⚙️ Стратегія: ${processingStrategy}`,
                  '',
                  '⚙️ Оптимізація...',
                ])
                const compressed = await compressZoomAudioFile(rawFile.filePath)
                cleanupTasks.push(compressed.cleanup)
                chunkSourcePath = compressed.filePath
              }

              await updateCoachStatus([
                '🎙 Аудіо отримано',
                '',
                '📦 Аналізуємо розмір',
                `📁 ${audioPayload.fileName ?? 'zoom audio'}`,
                `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
                `⚙️ Стратегія: ${processingStrategy}`,
                '',
                '✂️ Розбиття на частини...',
              ])
              await transcribeChunkedAudio(chunkSourcePath, processingStrategy === 'COMPRESS_CHUNK_TRANSCRIPT' ? 'compressed' : 'raw')
            }
          }

          if (!transcript) {
            throw new Error('zoom_audio_transcription_empty')
          }

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

          const finalReplyMarkup: CoachInlineKeyboardMarkup = {
            inline_keyboard: [[
              {
                text: '📝 Планувати контент',
                callback_data: 'content_os:start_planning',
              },
            ]],
          }

          const { trackEvent } = await import('../../modules/events/service.js')
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

          if (opsChatId) {
            await updateCoachStatus([
              '🎙 Аудіо отримано',
              '',
              '📦 Аналізуємо розмір',
              `📁 ${audioPayload.fileName ?? 'zoom audio'}`,
              `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
              `⚙️ Стратегія: ${processingStrategy}`,
              '',
              '💾 Збереження...',
            ])
            await updateCoachStatus([
              '🎙 Аудіо отримано',
              '',
              '📦 Аналізуємо розмір',
              `📁 ${audioPayload.fileName ?? 'zoom audio'}`,
              `📦 Розмір: ${sizeMB !== null ? `${sizeMB} MB` : 'невідомо'}`,
              `⚙️ Стратегія: ${processingStrategy}`,
              '',
              '✅ Транскрипт готовий',
              '',
              'Тепер можна аналізувати контент 👇',
            ], { replyMarkup: finalReplyMarkup })
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'zoom_audio_transcription_failed'
          if (opsChatId) {
            const recoveryLines = [
              '❌ Транскрипцію зупинено',
              '',
              `Причина: ${message}`,
              '',
              message.toLowerCase().includes('quota') || message.toLowerCase().includes('limit')
                ? 'Дія: перевірте баланс OpenAI'
                : 'Дія: перевірте Cloudinary файл і повторіть ingest',
            ]
            if (coachStatusRef) {
              await editZoomCoachStatusMessage(coachStatusRef, buildZoomCoachStatusText(recoveryLines, audioPayload.fileName ?? null, audioPayload.zoomType ?? null), statusRuntime)
                .catch((error) => console.error('[ZOOM_TRANSCRIPT] coach failure status update failed', error))
            } else {
              await sendZoomCoachStatusMessage(opsChatId, buildZoomCoachStatusText(recoveryLines, audioPayload.fileName ?? null, audioPayload.zoomType ?? null), statusRuntime)
                .catch((error) => console.error('[ZOOM_TRANSCRIPT] coach failure notify failed', error))
            }
          }
          await prisma.runtimeOutbox.update({
            where: { id: item.id },
            data: {
              status: 'FAILED',
              processedAt: new Date(),
              attempts: { increment: 1 },
              lastError: message,
            },
          }).catch(() => undefined)
          continue
        } finally {
          for (const cleanup of cleanupTasks.reverse()) {
            await cleanup().catch(() => undefined)
          }
        }
      }

      await prisma.runtimeOutbox.update({
        where: { id: item.id },
        data: {
          status: 'DONE',
          processedAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      }).catch(() => undefined)

      processed += 1
    }

    return processed
  }).then(result => result.acquired ? result.value : 0)
}

export function startRuntimeOutboxAutoProcessor(limit = 100): void {
  if (process.env.SCHEDULER_AUTO_START !== 'true') return
  if (runtimeOutboxPollTimer) return

  runtimeOutboxPollTimer = setInterval(() => {
    void processRuntimeOutbox(limit).catch((error) => {
      console.error('[RuntimeOutbox] auto process failed', error)
    })
  }, RUNTIME_OUTBOX_POLL_INTERVAL_MS)
  runtimeOutboxPollTimer.unref()
}

export function stopRuntimeOutboxAutoProcessor(): void {
  if (!runtimeOutboxPollTimer) return
  clearInterval(runtimeOutboxPollTimer)
  runtimeOutboxPollTimer = null
}

export function validateRuntimeOutboxFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const dedupeKey = buildOutboxDedupeKey({
    scope: 'validation',
    type: 'runtime_outbox',
    source: 'internal',
    userId: 'validation-user',
    state: 'validation',
    tenantId: 'validation-tenant',
    payload: { ok: true },
  })

  if (!dedupeKey) {
    errors.push('missing_outbox_dedupe_key')
  }

  return { ok: errors.length === 0, errors }
}
