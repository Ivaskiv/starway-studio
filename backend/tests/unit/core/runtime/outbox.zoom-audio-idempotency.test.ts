import { beforeEach, describe, expect, it, vi } from 'vitest'

const existingKeys = new Set<string>()
const mockFindUnique = vi.fn()
const mockCreate = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    runtimeOutbox: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

vi.mock('../../../../src/core/runtime/idempotency.js', () => ({
  buildRuntimeTelemetry: (input: { requestFingerprint?: string | null }) => ({
    idempotency_key: `key:${input.requestFingerprint ?? ''}`,
  }),
  claimRuntimeEventReplay: vi.fn(),
  withRuntimeAdvisoryLock: vi.fn(),
}))

vi.mock('../../../../src/core/runtime/zoom/audio.js', () => ({
  processZoomAudioOutboxItem: vi.fn(),
}))

import { enqueueRuntimeOutboxItem } from '../../../../src/core/runtime/outbox.js'

describe('zoom audio outbox identity', () => {
  beforeEach(() => {
    existingKeys.clear()
    vi.clearAllMocks()
    mockFindUnique.mockImplementation(async ({ where }: { where: { dedupeKey: string } }) => (
      existingKeys.has(where.dedupeKey) ? { id: 'outbox-1', status: 'PENDING', createdAt: new Date() } : null
    ))
    mockCreate.mockImplementation(async ({ data }: { data: { dedupeKey: string } }) => {
      existingKeys.add(data.dedupeKey)
      return data
    })
  })

  it('deduplicates retries for the same canonical Group A recording', async () => {
    const input = {
      scope: 'zoom_audio_ingest',
      type: 'ZOOM_AUDIO_UPLOADED',
      source: 'cloudinary',
      tenantId: 'group-a',
      runtime: { requestFingerprint: 'group-a:https://cloudinary.example/recording-a.mp4' },
      payload: {
        zoomSessionId: 'group-a',
        fileId: 'https://cloudinary.example/recording-a.mp4',
        downloadUrl: 'https://cloudinary.example/recording-a.mp4',
      },
    }

    await expect(enqueueRuntimeOutboxItem(input)).resolves.toMatchObject({ duplicate: false })
    await expect(enqueueRuntimeOutboxItem(input)).resolves.toMatchObject({ duplicate: true })

    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
})
