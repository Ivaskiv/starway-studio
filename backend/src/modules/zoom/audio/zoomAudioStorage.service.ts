import type { UploadApiOptions, UploadApiResponse } from 'cloudinary'

import { getCloudinaryClient } from '../../../lib/cloudinary.js'

type ZoomAudioStorageType = 'GROUP' | 'INDIVIDUAL'

export type StoredZoomAudioAsset = {
  assetId: string
  publicId: string
  secureUrl: string
  folder: string
  resourceType: string
  format: string | null
  bytes: number | null
  duration: number | null
  canonicalName: string
}

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/@/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function resolveZoomAudioStorageType(value: string | null | undefined): ZoomAudioStorageType {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'INDIVIDUAL' || normalized === 'PRIVATE') {
    return 'INDIVIDUAL'
  }
  return 'GROUP'
}

export function buildCanonicalZoomAudioName(input: {
  sessionDate: Date
  sessionType: ZoomAudioStorageType
  username?: string | null
}): string {
  const isoDate = input.sessionDate.toISOString().slice(0, 10)
  if (input.sessionType === 'GROUP') {
    return `${isoDate}_group`
  }

  const username = sanitizeSegment(String(input.username ?? ''))
  return username
    ? `${isoDate}_individual_${username}`
    : `${isoDate}_individual`
}

function resolveCloudinaryFolder(sessionType: ZoomAudioStorageType): string {
  return sessionType === 'GROUP'
    ? 'starway/zoom/group'
    : 'starway/zoom/individual'
}

async function uploadLarge(localFilePath: string, options: UploadApiOptions): Promise<UploadApiResponse> {
  const cloudinary = getCloudinaryClient()

  return new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader.upload_large(
      localFilePath,
      options,
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        if (!result) {
          reject(new Error('cloudinary_upload_missing_result'))
          return
        }

        resolve(result)
      },
    )
  })
}

export async function uploadZoomAudioToCloudinary(input: {
  localFilePath: string
  sessionDate: Date
  sessionType: ZoomAudioStorageType
  username?: string | null
}): Promise<StoredZoomAudioAsset> {
  const sessionType = input.sessionType
  const canonicalName = buildCanonicalZoomAudioName({
    sessionDate: input.sessionDate,
    sessionType,
    username: input.username,
  })
  const folder = resolveCloudinaryFolder(sessionType)

  const result = await uploadLarge(input.localFilePath, {
    folder,
    public_id: canonicalName,
    resource_type: 'video',
    overwrite: false,
    unique_filename: true,
    use_filename: false,
    chunk_size: 6 * 1024 * 1024,
  })

  const assetId = String(result.asset_id ?? '').trim()
  const publicId = String(result.public_id ?? '').trim()
  const secureUrl = String(result.secure_url ?? '').trim()

  if (!assetId || !publicId || !secureUrl) {
    throw new Error('cloudinary_upload_incomplete_response')
  }

  return {
    assetId,
    publicId,
    secureUrl,
    folder,
    resourceType: String(result.resource_type ?? 'video'),
    format: typeof result.format === 'string' ? result.format : null,
    bytes: typeof result.bytes === 'number' && Number.isFinite(result.bytes) ? result.bytes : null,
    duration: typeof result.duration === 'number' && Number.isFinite(result.duration) ? result.duration : null,
    canonicalName,
  }
}
