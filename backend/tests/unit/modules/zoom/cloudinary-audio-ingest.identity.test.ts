import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockEnqueueRuntimeOutboxItem = vi.fn()

vi.mock('../../../../src/core/runtime/outbox.js', () => ({
  enqueueRuntimeOutboxItem: (...args: unknown[]) => mockEnqueueRuntimeOutboxItem(...args),
}))

vi.mock('../../../../src/modules/voice/voice.service.js', () => ({
  formatZoomAudioSizeMB: () => '1.00',
}))

import { ingestCloudinaryZoomAudio } from '../../../../src/modules/zoom/audio/cloudinary-audio-ingest.service.js'

const originalCloudinaryUrl = process.env.CLOUDINARY_URL

function groupRecording(context?: { custom?: Record<string, unknown> }) {
  return {
    asset_id: 'asset-group-a',
    public_id: 'starway/zoom/group/group-a-recording',
    folder: 'starway/zoom/group',
    resource_type: 'video',
    format: 'mp4',
    bytes: 1000,
    duration: 3600,
    secure_url: 'https://cloudinary.example/group-a-recording.mp4',
    created_at: '2026-09-23T18:00:00.000Z',
    original_filename: 'group-a-recording',
    context,
  }
}

function mockCloudinaryResources(resource: ReturnType<typeof groupRecording>) {
  vi.stubGlobal('fetch', vi.fn(async (input: URL | string) => {
    const url = new URL(String(input))
    const isGroupRecordingQuery = url.searchParams.get('prefix') === 'starway/zoom/group/'
      && url.pathname.includes('/resources/video/upload')

    return {
      ok: true,
      status: 200,
      json: async () => ({ resources: isGroupRecordingQuery ? [resource] : [] }),
    }
  }))
}

describe('cloudinary Zoom audio ingest identity', () => {
  beforeEach(() => {
    process.env.CLOUDINARY_URL = 'cloudinary://api-key:api-secret@test-cloud'
    vi.clearAllMocks()
    mockEnqueueRuntimeOutboxItem.mockResolvedValue({ duplicate: false, dedupeKey: 'asset-group-a' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalCloudinaryUrl === undefined) delete process.env.CLOUDINARY_URL
    else process.env.CLOUDINARY_URL = originalCloudinaryUrl
  })

  it('enqueues Group A with its Cloudinary canonical ID, never selecting nearby Group B', async () => {
    mockCloudinaryResources(groupRecording({ custom: { zoomSessionId: 'group-a' } }))

    await ingestCloudinaryZoomAudio()

    expect(mockEnqueueRuntimeOutboxItem).toHaveBeenCalledTimes(1)
    expect(mockEnqueueRuntimeOutboxItem).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ zoomSessionId: 'group-a' }),
    }))
    expect(mockEnqueueRuntimeOutboxItem).not.toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ zoomSessionId: 'group-b' }),
    }))
  })

  it('leaves Cloudinary recordings without a canonical ID unmatched', async () => {
    mockCloudinaryResources(groupRecording())

    const result = await ingestCloudinaryZoomAudio()

    expect(mockEnqueueRuntimeOutboxItem).not.toHaveBeenCalled()
    expect(result.find((item) => item.folder === 'zoom/group')).toMatchObject({
      filtered: 1,
      enqueued: 0,
    })
  })

  it('keeps repeated cron ingestion idempotent through the existing asset outbox key', async () => {
    mockCloudinaryResources(groupRecording({ custom: { zoomSessionId: 'group-a' } }))
    mockEnqueueRuntimeOutboxItem
      .mockResolvedValueOnce({ duplicate: false, dedupeKey: 'asset-group-a' })
      .mockResolvedValueOnce({ duplicate: true, dedupeKey: 'asset-group-a' })

    await ingestCloudinaryZoomAudio()
    const retry = await ingestCloudinaryZoomAudio()

    expect(mockEnqueueRuntimeOutboxItem).toHaveBeenCalledTimes(2)
    expect(retry.find((item) => item.folder === 'zoom/group')).toMatchObject({
      enqueued: 0,
      duplicates: 1,
    })
  })
})
