import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindUnique = vi.fn()

vi.mock('../../../../../src/db/client.js', () => ({
  prisma: {
    zoomSession: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

vi.mock('../../../../../src/modules/zoom/audio/zoomInsight.service.js', () => ({
  generateZoomTranscriptInsight: vi.fn(),
}))

import { matchZoomSessionForAudio } from '../../../../../src/core/runtime/zoom/report.js'

describe('matchZoomSessionForAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('attaches Group A recording only to its canonical session when Group B is later', async () => {
    const groupA = {
      id: 'group-a',
      expertId: 'expert-1',
      topic: 'Group A',
      type: 'GROUP',
      scheduledAt: new Date('2026-09-23T16:00:00.000Z'),
      postSessionReport: null,
      attendees: [],
    }
    mockFindUnique.mockResolvedValue(groupA)

    await expect(matchZoomSessionForAudio('group-a')).resolves.toEqual({
      session: groupA,
      matchMethod: 'canonical_id',
    })

    expect(mockFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'group-a' },
    }))
  })

  it('fails safely without canonical identity and never queries a latest session', async () => {
    await expect(matchZoomSessionForAudio(null)).resolves.toEqual({
      session: null,
      matchMethod: 'missing_identity',
    })

    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('fails safely for an invalid canonical ID without selecting another past session', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(matchZoomSessionForAudio('missing-group-a')).resolves.toEqual({
      session: null,
      matchMethod: 'not_found',
    })

    expect(mockFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'missing-group-a' },
    }))
    expect(mockFindUnique).toHaveBeenCalledTimes(1)
  })
})
