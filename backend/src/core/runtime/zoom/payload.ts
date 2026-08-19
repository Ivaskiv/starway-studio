import type { Prisma } from '@starway/db/prisma-client'
import type { ZoomAudioProcessingStrategy } from '../../../modules/voice/voice.service.js'

export type ZoomAudioPayload = Prisma.JsonObject & {
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

export function parseZoomAudioPayload(
  payload: Prisma.JsonObject | null,
): ZoomAudioPayload | null {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as ZoomAudioPayload
    : null
}
