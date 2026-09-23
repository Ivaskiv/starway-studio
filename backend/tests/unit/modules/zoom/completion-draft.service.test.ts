import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionFindUnique = vi.fn()
const mockZoomSessionUpdate = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    zoomSession: {
      findUnique: (...args: unknown[]) => mockZoomSessionFindUnique(...args),
      update: (...args: unknown[]) => mockZoomSessionUpdate(...args),
    },
  },
}))

import { getZoomCompletionDraft } from '../../../../src/modules/zoom/reports/zoomCompletionDraft.service.js'

function sessionWithReport(report: Record<string, unknown> | null) {
  return {
    id: 'session-1',
    expertId: 'expert-1',
    topic: 'Групова практика',
    type: 'group_practice',
    scheduledAt: new Date('2026-09-07T16:00:00.000Z'),
    postSessionReport: report,
  }
}

describe('getZoomCompletionDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the canonical stored AI draft without regenerating analysis', async () => {
    mockZoomSessionFindUnique.mockResolvedValue(sessionWithReport({
      transcript: 'Обговорили запуск і структуру воронки.',
      topic: 'Запуск воронки',
      audioUrl: 'https://res.cloudinary.com/demo/video/upload/zoom.mp4',
      summary: 'AI підсумок з транскрипту.',
      insights: ['Пункт 1', 'Пункт 2'],
      actualAttendeeCount: 12,
    }))

    const draft = await getZoomCompletionDraft({
      sessionId: 'session-1',
      actor: { userId: 'coach-user', role: 'EXPERT', expertId: 'expert-1' },
    })

    expect(draft).toEqual({
      available: true,
      topic: 'Запуск воронки',
      summary: 'AI підсумок з транскрипту.',
      keyPoints: ['Пункт 1', 'Пункт 2'],
      recordingUrl: 'https://res.cloudinary.com/demo/video/upload/zoom.mp4',
    })
  })

  it('returns unavailable when a recording exists but transcript is absent', async () => {
    mockZoomSessionFindUnique.mockResolvedValue(sessionWithReport({
      audioUrl: 'https://res.cloudinary.com/demo/video/upload/zoom.mp4',
    }))

    await expect(getZoomCompletionDraft({
      sessionId: 'session-1',
      actor: { userId: 'coach-user', role: 'EXPERT', expertId: 'expert-1' },
    })).resolves.toEqual({ available: false, reason: 'transcript_missing' })

  })

  it('does not mutate ZoomSession or status while reading a draft', async () => {
    mockZoomSessionFindUnique.mockResolvedValue(sessionWithReport({
      transcript: 'Транскрипт є.',
    }))

    await getZoomCompletionDraft({
      sessionId: 'session-1',
      actor: { userId: 'coach-user', role: 'ADMIN', expertId: null },
    })

    expect(mockZoomSessionUpdate).not.toHaveBeenCalled()
  })

  it('does not invent attendee count from transcript or AI output', async () => {
    mockZoomSessionFindUnique.mockResolvedValue(sessionWithReport({
      transcript: 'Було багато учасників, точну кількість не підтверджено.',
    }))
    const draft = await getZoomCompletionDraft({
      sessionId: 'session-1',
      actor: { userId: 'coach-user', role: 'EXPERT', expertId: 'expert-1' },
    })

    expect(draft).not.toHaveProperty('attendeeCount')
    expect(draft).not.toHaveProperty('actualAttendeeCount')
  })
})
