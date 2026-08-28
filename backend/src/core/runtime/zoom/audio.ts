import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { coachBot } from '../../../lib/telegram.js'
import { readCoachBotName, readCoachBotToken } from '../../../modules/telegram-mentor/runtime/botConfig.js'
import { compressZoomAudioFile, downloadTelegramAudioSourceToTempFile, formatZoomAudioSizeMB, normalizeZoomAudioFile, OPENAI_AUDIO_TRANSCRIPTION_MAX_BYTES, probeZoomAudioFileSizeBytes, resolveZoomAudioStrategy, splitZoomAudioFile, transcribeTelegramAudio } from '../../../modules/voice/voice.service.js'
import { resolveZoomAudioStorageType, uploadZoomAudioToCloudinary } from '../../../modules/zoom/audio/zoomAudioStorage.service.js'
import { finalizeZoomTranscriptReport, matchZoomSessionForAudio, resolveZoomSessionUsername } from './report.js'
import { parseZoomAudioPayload } from './payload.js'
import { buildZoomCoachStatusText, editZoomCoachStatusMessage, sendZoomCoachStatusMessage, type CoachInlineKeyboardMarkup, type CoachStatusMessageRef } from './status.js'
import type { RuntimeOutboxProcessItem } from '../outbox.js'

function maskTelegramToken(token: string | null | undefined): string | null {
  const normalized = String(token ?? '').trim()
  if (!normalized) return null
  if (normalized.length <= 8) return normalized
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`
}

export async function processZoomAudioOutboxItem(
  item: RuntimeOutboxProcessItem,
  payload: Prisma.JsonObject | null,
): Promise<'success' | 'failed'> {
  let zoomAudioPayload = parseZoomAudioPayload(payload)

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
    return 'failed'
  }

  const audioPayload = zoomAudioPayload as NonNullable<typeof zoomAudioPayload>

  const mediaType = audioPayload.mediaType === 'voice'
    ? 'TELEGRAM_VOICE'
    : 'TELEGRAM_AUDIO'
  const telegramRuntime = coachBot
  const telegramRuntimeName = 'coachBot'
  const telegramBotToken = readCoachBotToken()
  const telegramBotUsername = readCoachBotName() || null
  const telegramBotId = telegramBotToken.split(':')[0] || null
  const opsChatId = (typeof audioPayload.chatId === 'string' && audioPayload.chatId.trim())
    || process.env.STARWAY_OPS_CHAT_ID?.trim()
    || process.env.OPS_TELEGRAM_CHAT_ID?.trim()
  const statusRuntime = typeof audioPayload.chatId === 'string' && audioPayload.chatId.trim()
    ? 'coachBot'
    : 'bot'
  const cleanupTasks: Array<() => Promise<void>> = []
  let transcript = ''

  try {
    if (!telegramBotToken) {
      console.error('[ZOOM_AUDIO_TELEGRAM] missing runtime token', {
        botInstance: telegramRuntimeName,
        botUsername: telegramBotUsername,
        botId: telegramBotId,
        tokenHash: maskTelegramToken(telegramBotToken),
        fileId,
        fileUniqueId: typeof audioPayload.fileUniqueId === 'string' ? audioPayload.fileUniqueId : null,
        messageId: typeof audioPayload.messageId === 'number' ? audioPayload.messageId : null,
        chatId: typeof audioPayload.chatId === 'string' ? audioPayload.chatId : null,
      })
      throw new Error('zoom_audio_runtime_token_missing')
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
      console.info('[ZOOM_AUDIO_TELEGRAM] getFile:start', {
        botInstance: telegramRuntimeName,
        botUsername: telegramBotUsername,
        botId: telegramBotId,
        tokenHash: maskTelegramToken(telegramBotToken),
        fileId,
        fileUniqueId: typeof audioPayload.fileUniqueId === 'string' ? audioPayload.fileUniqueId : null,
        messageId: typeof audioPayload.messageId === 'number' ? audioPayload.messageId : null,
        chatId: typeof audioPayload.chatId === 'string' ? audioPayload.chatId : null,
      })
      const telegramFile = await telegramRuntime.telegram.getFile(fileId)
      console.info('[ZOOM_AUDIO_TELEGRAM] getFile:ok', {
        botInstance: telegramRuntimeName,
        botUsername: telegramBotUsername,
        botId: telegramBotId,
        tokenHash: maskTelegramToken(telegramBotToken),
        fileId,
        fileUniqueId: typeof audioPayload.fileUniqueId === 'string' ? audioPayload.fileUniqueId : null,
        messageId: typeof audioPayload.messageId === 'number' ? audioPayload.messageId : null,
        chatId: typeof audioPayload.chatId === 'string' ? audioPayload.chatId : null,
      })
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
        console.info('[ZOOM_AUDIO_TELEGRAM] getFileLink:start', {
          botInstance: telegramRuntimeName,
          botUsername: telegramBotUsername,
          botId: telegramBotId,
          tokenHash: maskTelegramToken(telegramBotToken),
          fileId,
          fileUniqueId: typeof audioPayload.fileUniqueId === 'string' ? audioPayload.fileUniqueId : null,
          messageId: typeof audioPayload.messageId === 'number' ? audioPayload.messageId : null,
          chatId: typeof audioPayload.chatId === 'string' ? audioPayload.chatId : null,
        })
        const fileLink = await telegramRuntime.telegram.getFileLink(fileId)
        downloadUrl = fileLink.href ?? String(fileLink)
        console.info('[ZOOM_AUDIO_TELEGRAM] getFileLink:ok', {
          botInstance: telegramRuntimeName,
          botUsername: telegramBotUsername,
          botId: telegramBotId,
          tokenHash: maskTelegramToken(telegramBotToken),
          fileId,
          fileUniqueId: typeof audioPayload.fileUniqueId === 'string' ? audioPayload.fileUniqueId : null,
          messageId: typeof audioPayload.messageId === 'number' ? audioPayload.messageId : null,
          chatId: typeof audioPayload.chatId === 'string' ? audioPayload.chatId : null,
          downloadUrl: `${downloadUrl.substring(0, 60)}...`,
        })
      } catch (err) {
        console.error('[ZOOM_AUDIO_TELEGRAM] getFileLink:failed', {
          botInstance: telegramRuntimeName,
          botUsername: telegramBotUsername,
          botId: telegramBotId,
          tokenHash: maskTelegramToken(telegramBotToken),
          fileId,
          fileUniqueId: typeof audioPayload.fileUniqueId === 'string' ? audioPayload.fileUniqueId : null,
          messageId: typeof audioPayload.messageId === 'number' ? audioPayload.messageId : null,
          chatId: typeof audioPayload.chatId === 'string' ? audioPayload.chatId : null,
          error: err instanceof Error ? err.message : String(err),
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
    console.info('[ZOOM_AUDIO_TELEGRAM] download:start', {
      botInstance: telegramRuntimeName,
      botUsername: telegramBotUsername,
      botId: telegramBotId,
      tokenHash: maskTelegramToken(telegramBotToken),
      fileId,
      fileUniqueId: typeof audioPayload.fileUniqueId === 'string' ? audioPayload.fileUniqueId : null,
      messageId: typeof audioPayload.messageId === 'number' ? audioPayload.messageId : null,
      chatId: typeof audioPayload.chatId === 'string' ? audioPayload.chatId : null,
      viaDirectUrl: Boolean(directDownloadUrl),
    })
    const rawFile = needsLocalFile
      ? await downloadTelegramAudioSourceToTempFile(downloadUrl, fileName)
      : null
    console.info('[ZOOM_AUDIO_TELEGRAM] download:ok', {
      botInstance: telegramRuntimeName,
      botUsername: telegramBotUsername,
      botId: telegramBotId,
      tokenHash: maskTelegramToken(telegramBotToken),
      fileId,
      fileUniqueId: typeof audioPayload.fileUniqueId === 'string' ? audioPayload.fileUniqueId : null,
      messageId: typeof audioPayload.messageId === 'number' ? audioPayload.messageId : null,
      chatId: typeof audioPayload.chatId === 'string' ? audioPayload.chatId : null,
      localFileReady: Boolean(rawFile),
    })
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
      console.info('[ZOOM_AUDIO_CLOUDINARY] upload:start', {
        botInstance: telegramRuntimeName,
        botUsername: telegramBotUsername,
        botId: telegramBotId,
        tokenHash: maskTelegramToken(telegramBotToken),
        fileId,
        fileUniqueId: typeof audioPayload.fileUniqueId === 'string' ? audioPayload.fileUniqueId : null,
        messageId: typeof audioPayload.messageId === 'number' ? audioPayload.messageId : null,
        chatId: typeof audioPayload.chatId === 'string' ? audioPayload.chatId : null,
      })
      const uploadedAsset = await uploadZoomAudioToCloudinary({
        localFilePath: rawFile.filePath,
        sessionDate: matchedSession?.scheduledAt ?? observedAt,
        sessionType: storageType,
        username: storageType === 'INDIVIDUAL' ? resolveZoomSessionUsername(matchedSession) : null,
      })
      console.info('[ZOOM_AUDIO_CLOUDINARY] upload:ok', {
        botInstance: telegramRuntimeName,
        botUsername: telegramBotUsername,
        botId: telegramBotId,
        tokenHash: maskTelegramToken(telegramBotToken),
        fileId,
        fileUniqueId: typeof audioPayload.fileUniqueId === 'string' ? audioPayload.fileUniqueId : null,
        messageId: typeof audioPayload.messageId === 'number' ? audioPayload.messageId : null,
        chatId: typeof audioPayload.chatId === 'string' ? audioPayload.chatId : null,
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

  

    const finalReplyMarkup: CoachInlineKeyboardMarkup = {
      inline_keyboard: [[
        {
          text: 'Планувати контент',
          callback_data: 'content_os:start_planning',
        },
      ]],
    }

    await finalizeZoomTranscriptReport({
    item,
    payload,
    zoomAudioPayload,
    finalMatchedSession,
    matchedSessionResult,
    transcript,
    fileId,
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
    return 'failed'
  } finally {
    for (const cleanup of cleanupTasks.reverse()) {
      await cleanup().catch(() => undefined)
    }
  }

  return 'success'
}
