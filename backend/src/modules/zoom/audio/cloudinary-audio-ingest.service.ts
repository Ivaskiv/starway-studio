import { enqueueRuntimeOutboxItem } from '../../../core/runtime/outbox.js'
import { formatZoomAudioSizeMB } from '../../voice/voice.service.js'

type CloudinaryResource = {
  asset_id?: string
  public_id?: string
  folder?: string | null
  resource_type?: string | null
  format?: string | null
  bytes?: number | null
  duration?: number | null
  secure_url?: string | null
  created_at?: string | null
  original_filename?: string | null
}

type CloudinaryResourcesResponse = {
  resources?: CloudinaryResource[]
  next_cursor?: string | null
}

const CLOUDINARY_AUDIO_FOLDERS = ['zoom/group', 'zoom/individual'] as const
const CLOUDINARY_AUDIO_RESOURCE_TYPES = ['video', 'raw'] as const
const CLOUDINARY_PAGE_SIZE = 500
const CLOUDINARY_AUDIO_INGEST_DEBUG = process.env.CLOUDINARY_AUDIO_INGEST_DEBUG === 'true'

type CloudinaryConfig = {
  cloudName: string
  apiKey: string
  apiSecret: string
}

type CloudinaryIngestFilterRecord = {
  resource: string
  reason: string
  rule: string
}

type CloudinaryFolderQueryResult = {
  resources: CloudinaryResource[]
  diagnostics: {
    queriedFolders: string[]
    queryCount: number
    returnedCount: number
  }
}

type CloudinaryIngestSummary = {
  folder: string
  returned: number
  filtered: number
  accepted: number
  enqueued: number
  duplicates: number
}

function parseCloudinaryUrl(urlValue: string): CloudinaryConfig | null {
  try {
    const parsed = new URL(urlValue)
    if (parsed.protocol !== 'cloudinary:') return null

    const cloudName = String(parsed.hostname ?? '').trim()
    const apiKey = String(parsed.username ?? '').trim()
    const apiSecret = String(parsed.password ?? '').trim()

    if (!cloudName || !apiKey || !apiSecret) return null
    return { cloudName, apiKey, apiSecret }
  } catch {
    return null
  }
}

function hasCloudinaryCredentials(): boolean {
  const cloudinaryUrl = String(process.env.CLOUDINARY_URL ?? '').trim()
  if (cloudinaryUrl && cloudinaryUrl !== 'SET') return true

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME ?? '').trim()
  const apiKey = String(process.env.CLOUDINARY_API_KEY ?? '').trim()
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET ?? '').trim()
  return Boolean(cloudName && cloudName !== 'SET')
    && Boolean(apiKey && apiKey !== 'SET')
    && Boolean(apiSecret && apiSecret !== 'SET')
}

function getCloudinaryConfig() {
  const cloudinaryUrl = String(process.env.CLOUDINARY_URL ?? '').trim()
  if (cloudinaryUrl && cloudinaryUrl !== 'SET') {
    const parsed = parseCloudinaryUrl(cloudinaryUrl)
    if (parsed) return parsed
  }

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME ?? '').trim()
  const apiKey = String(process.env.CLOUDINARY_API_KEY ?? '').trim()
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET ?? '').trim()

  if (!cloudName || !apiKey || !apiSecret) return null
  if (cloudName === 'SET' || apiKey === 'SET' || apiSecret === 'SET') return null

  return { cloudName, apiKey, apiSecret }
}

function toBasicAuth(apiKey: string, apiSecret: string) {
  return Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
}

function normalizeFolderPrefix(folder: string) {
  const trimmed = folder.trim().replace(/^\/+|\/+$/g, '')
  return `${trimmed}/`
}

function resolveZoomTypeFromFolder(folder: string): 'GROUP' | 'INDIVIDUAL' {
  const normalized = folder.toLowerCase()
  return normalized.includes('individual') ? 'INDIVIDUAL' : 'GROUP'
}

function buildCloudinaryFolderCandidates(folder: string): string[] {
  const normalized = folder.trim().replace(/^\/+|\/+$/g, '')
  const candidates = new Set<string>([normalized])

  if (!normalized.startsWith('starway/')) {
    candidates.add(`starway/${normalized}`)
  }

  return Array.from(candidates)
}

function resolveMimeTypeFromFormat(format?: string | null): string {
  const normalized = String(format ?? '').toLowerCase()
  switch (normalized) {
    case 'mp3':
      return 'audio/mpeg'
    case 'm4a':
    case 'mp4':
      return 'audio/mp4'
    case 'ogg':
    case 'oga':
      return 'audio/ogg'
    case 'wav':
      return 'audio/wav'
    case 'aac':
      return 'audio/aac'
    case 'flac':
      return 'audio/flac'
    case 'webm':
      return 'audio/webm'
    default:
      return normalized ? `audio/${normalized}` : 'audio/mpeg'
  }
}

function buildFileName(resource: CloudinaryResource): string {
  const base = resource.original_filename?.trim()
    || resource.public_id?.split('/').pop()?.trim()
    || 'zoom_audio'
  const extension = resource.format?.trim()
  return extension ? `${base}.${extension}` : base
}

export type CloudinaryZoomAudioItem = {
  folder: string
  publicId: string
  assetId: string
  secureUrl: string
  fileName: string
  format: string | null
  bytes: number | null
  duration: number | null
  createdAt: string | null
}

async function fetchCloudinaryFolderResources(folder: string): Promise<CloudinaryFolderQueryResult> {
  const config = getCloudinaryConfig()
  if (!config) {
    console.warn('[cloudinaryZoomAudio] missing Cloudinary admin credentials, skip ingest')
    return {
      resources: [],
      diagnostics: {
        queriedFolders: [],
        queryCount: 0,
        returnedCount: 0,
      },
    }
  }

  const collected: CloudinaryResource[] = []
  const queriedFolders: string[] = []
  let queryCount = 0

  for (const folderCandidate of buildCloudinaryFolderCandidates(folder)) {
    for (const resourceType of CLOUDINARY_AUDIO_RESOURCE_TYPES) {
      const folderPrefix = normalizeFolderPrefix(folderCandidate)
      queriedFolders.push(`${resourceType}:${folderPrefix}`)
      let nextCursor: string | null | undefined

      do {
        const url = new URL(`https://api.cloudinary.com/v1_1/${config.cloudName}/resources/${resourceType}/upload`)
        url.searchParams.set('prefix', folderPrefix)
        url.searchParams.set('max_results', String(CLOUDINARY_PAGE_SIZE))
        if (nextCursor) {
          url.searchParams.set('next_cursor', nextCursor)
        }

        queryCount += 1
        console.info('[cloudinaryZoomAudio][query]', {
          folder,
          folderCandidate,
          resource_type: resourceType,
          prefix: folderPrefix,
          max_results: CLOUDINARY_PAGE_SIZE,
          next_cursor: nextCursor ?? null,
          cloud_name: config.cloudName,
        })
        const response = await fetch(url, {
          headers: {
            Authorization: `Basic ${toBasicAuth(config.apiKey, config.apiSecret)}`,
          },
        })

        if (!response.ok) {
          console.error('[CLOUDINARY_INGEST] auth failed', {
            folder,
            folderCandidate,
            resourceType,
            endpoint: url.toString(),
            status: response.status,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
            apiKey: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
            apiSecret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
          })
          throw new Error(`cloudinary_list_resources_failed:${response.status}`)
        }

        const body = await response.json() as CloudinaryResourcesResponse
        console.info('[cloudinaryZoomAudio][query_result]', {
          folder,
          folderCandidate,
          resource_type: resourceType,
          prefix: folderPrefix,
          returned_count: body.resources?.length ?? 0,
        })
        if (CLOUDINARY_AUDIO_INGEST_DEBUG && body.resources?.length) {
          for (const resource of body.resources) {
            console.info('[cloudinaryZoomAudio][resource]', {
              folder,
              folderCandidate,
              resource_type: resource.resource_type ?? null,
              public_id: resource.public_id ?? null,
              format: resource.format ?? null,
              bytes: typeof resource.bytes === 'number' && Number.isFinite(resource.bytes) ? resource.bytes : null,
              created_at: resource.created_at ?? null,
            })
          }
        }
        collected.push(...(body.resources ?? []))
        nextCursor = body.next_cursor ?? null
      } while (nextCursor)
    }
  }

  return {
    resources: collected,
    diagnostics: {
      queriedFolders,
      queryCount,
      returnedCount: collected.length,
    },
  }
}

type ListCloudinaryZoomAudioOptions = {
  limitPerFolder?: number
  from?: Date
  to?: Date
}

function isWithinDateRange(value: string | null, from?: Date, to?: Date): boolean {
  if (!from && !to) return true
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

export async function listCloudinaryZoomAudio(
  options: number | ListCloudinaryZoomAudioOptions = 10,
): Promise<CloudinaryZoomAudioItem[]> {
  const normalizedOptions = typeof options === 'number'
    ? { limitPerFolder: options }
    : options
  const limitPerFolder = Math.max(1, normalizedOptions.limitPerFolder ?? 10)
  const items: CloudinaryZoomAudioItem[] = []

  for (const folder of CLOUDINARY_AUDIO_FOLDERS) {
    const { resources, diagnostics } = await fetchCloudinaryFolderResources(folder)
    if (CLOUDINARY_AUDIO_INGEST_DEBUG) {
      console.info('[cloudinaryZoomAudio][diagnostics] list', {
        folder,
        ...diagnostics,
      })
    }
    const recent = [...resources]
      .filter((resource) => isWithinDateRange(resource.created_at ?? null, normalizedOptions.from, normalizedOptions.to))
      .sort((left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? '')))
      .slice(0, limitPerFolder)

    for (const resource of recent) {
      const publicId = String(resource.public_id ?? '').trim()
      const assetId = String(resource.asset_id ?? '').trim()
      const secureUrl = String(resource.secure_url ?? '').trim()
      if (!publicId || !assetId || !secureUrl) continue

      items.push({
        folder,
        publicId,
        assetId,
        secureUrl,
        fileName: buildFileName(resource),
        format: resource.format ?? null,
        bytes: typeof resource.bytes === 'number' && Number.isFinite(resource.bytes) ? resource.bytes : null,
        duration: typeof resource.duration === 'number' && Number.isFinite(resource.duration) ? resource.duration : null,
        createdAt: resource.created_at ?? null,
      })
    }
  }

  return items.sort((left, right) => String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')))
}

export async function findCloudinaryZoomAudioById(
  audioId: string,
  options: ListCloudinaryZoomAudioOptions = {},
): Promise<CloudinaryZoomAudioItem | null> {
  const normalizedAudioId = String(audioId ?? '').trim()
  if (!normalizedAudioId) {
    return null
  }

  const items = await listCloudinaryZoomAudio({
    limitPerFolder: Math.max(options.limitPerFolder ?? CLOUDINARY_PAGE_SIZE, CLOUDINARY_PAGE_SIZE),
    from: options.from,
    to: options.to,
  })

  return items.find((item) => item.assetId === normalizedAudioId || item.publicId === normalizedAudioId) ?? null
}

async function ingestCloudinaryFolder(folder: string) {
  const { resources, diagnostics } = await fetchCloudinaryFolderResources(folder)
  const zoomType = resolveZoomTypeFromFolder(folder)
  const seenResources = new Set<string>()
  const filteredResources: CloudinaryIngestFilterRecord[] = []
  let enqueued = 0
  let duplicates = 0

  console.info('[cloudinaryZoomAudio] ingest scan', {
    folder,
    ...diagnostics,
  })
  console.info('[cloudinaryZoomAudio] env', {
    cloud_name: getCloudinaryConfig()?.cloudName ?? null,
    debug: CLOUDINARY_AUDIO_INGEST_DEBUG,
    folders: CLOUDINARY_AUDIO_FOLDERS,
    resource_types: CLOUDINARY_AUDIO_RESOURCE_TYPES,
  })

  for (const resource of resources) {
    const resourceLabel = `${resource.resource_type ?? 'unknown'}:${resource.public_id ?? 'missing_public_id'}`
    const publicId = String(resource.public_id ?? '').trim()
    const assetId = String(resource.asset_id ?? '').trim()
    const secureUrl = String(resource.secure_url ?? '').trim()
    if (!publicId || !assetId || !secureUrl) {
      filteredResources.push({
        resource: resourceLabel,
        reason: !publicId
          ? 'missing_public_id'
          : !assetId
            ? 'missing_asset_id'
            : 'missing_secure_url',
        rule: !publicId
          ? 'public_id'
          : !assetId
            ? 'asset_id'
            : 'secure_url',
      })
      continue
    }

    const resourceKey = `${assetId}:${publicId}`
    if (seenResources.has(resourceKey)) {
      duplicates += 1
      if (CLOUDINARY_AUDIO_INGEST_DEBUG) {
        console.info('[cloudinaryZoomAudio][diagnostic] duplicate resource skipped', {
          folder,
          zoomType,
          publicId,
          assetId,
          resourceType: resource.resource_type ?? null,
          format: resource.format ?? null,
          createdAt: resource.created_at ?? null,
        })
      }
      continue
    }
    seenResources.add(resourceKey)

    const fileName = buildFileName(resource)
    const sizeBytes = typeof resource.bytes === 'number' && Number.isFinite(resource.bytes) && resource.bytes > 0
      ? resource.bytes
      : null
    const duration = typeof resource.duration === 'number' && Number.isFinite(resource.duration) && resource.duration > 0
      ? resource.duration
      : null
    const sizeMB = formatZoomAudioSizeMB(sizeBytes)
    const observedAt = typeof resource.created_at === 'string' && resource.created_at.trim()
      ? resource.created_at.trim()
      : null

    const outbox = await enqueueRuntimeOutboxItem({
      scope: 'zoom_audio_ingest',
      type: 'ZOOM_AUDIO_UPLOADED',
      source: 'cloudinary',
      userId: null,
      state: 'uploaded',
      tenantId: folder,
      runtime: {
        requestFingerprint: assetId,
        orchestrationPath: ['cloudinary_zoom_audio_ingest', folder],
      },
      payload: {
        fileId: publicId,
        fileUniqueId: assetId,
        mediaType: 'audio',
        fileName,
        mimeType: resolveMimeTypeFromFormat(resource.format),
        caption: null,
        source: 'cloudinary',
        zoomType,
        duration,
        sizeBytes,
        sizeMB,
        observedAt,
        uploadedAt: observedAt,
        cloudinaryUrl: secureUrl,
        cloudinaryPublicId: publicId,
        cloudinaryAssetId: assetId,
        cloudinaryFolder: resource.folder ?? folder,
        cloudinaryFormat: resource.format ?? null,
        cloudinaryResourceType: resource.resource_type ?? 'video',
        downloadUrl: secureUrl,
      },
    })

    if (outbox.duplicate) {
      duplicates += 1
      if (CLOUDINARY_AUDIO_INGEST_DEBUG) {
        console.info('[cloudinaryZoomAudio][diagnostic] enqueue duplicate', {
          folder,
          zoomType,
          publicId,
          assetId,
          fileName,
          sizeMB,
          dedupeKey: outbox.dedupeKey,
          resourceType: resource.resource_type ?? null,
          format: resource.format ?? null,
          createdAt: resource.created_at ?? null,
        })
      }
      continue
    }

    enqueued += 1
    console.info('[cloudinaryZoomAudio] enqueued', {
      folder,
      zoomType,
      publicId,
      assetId,
      sizeMB,
      dedupeKey: outbox.dedupeKey,
    })
  }

  if (filteredResources.length > 0) {
    console.info('[cloudinaryZoomAudio] filtered resources', {
      folder,
      filteredCount: filteredResources.length,
      samples: filteredResources.slice(0, 10),
    })
  }

  const accepted = resources.length - filteredResources.length - duplicates
  const summary: CloudinaryIngestSummary = {
    folder,
    returned: resources.length,
    filtered: filteredResources.length,
    accepted,
    enqueued,
    duplicates,
  }

  console.info('[cloudinaryZoomAudio] folder summary', summary)

  return summary
}

export async function ingestCloudinaryZoomAudio(): Promise<CloudinaryIngestSummary[]> {
  const results: CloudinaryIngestSummary[] = []
  for (const folder of CLOUDINARY_AUDIO_FOLDERS) {
    results.push(await ingestCloudinaryFolder(folder))
  }
  return results
}

export async function cloudinaryZoomAudioIngestCron(): Promise<void> {
  if (!hasCloudinaryCredentials()) {
    console.warn('[cloudinary-ingest] credentials missing — skipping')
    return
  }

  try {
    const results = await ingestCloudinaryZoomAudio()
    console.info('[cloudinaryZoomAudio] final table', results.map((item) => ({
      Folder: item.folder,
      Returned: item.returned,
      Filtered: item.filtered,
      Accepted: item.accepted,
      Enqueued: item.enqueued,
      Duplicates: item.duplicates,
    })))
    console.info('[cloudinaryZoomAudio] ingest complete', { results })
  } catch (error) {
    console.error('[cloudinaryZoomAudio] ingest failed', error)
    throw error
  }
}
