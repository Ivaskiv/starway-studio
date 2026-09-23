import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionFindUnique = vi.fn()
const mockZoomSessionUpdate = vi.fn()
const mockZoomSessionAttendeeUpdateMany = vi.fn()
const mockPrismaTransaction = vi.fn()
const mockActivateAbsystemTrialAfterFirstZoom = vi.fn()

const mockDb = vi.hoisted(() => ({
  tx: null as null | Record<string, unknown>,
}))

vi.mock('../../../../src/db/client.js', () => {
  const tx = {
    zoomSession: {
      findUnique: (...args: unknown[]) => mockZoomSessionFindUnique(...args),
      update: (...args: unknown[]) => mockZoomSessionUpdate(...args),
    },
    zoomSessionAttendee: {
      updateMany: (...args: unknown[]) => mockZoomSessionAttendeeUpdateMany(...args),
    },
  }
  mockDb.tx = tx

  return {
    prisma: {
      ...tx,
      $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
    },
  }
})

vi.mock('../../../../src/modules/access/service.js', () => ({
  activateAbsystemTrialAfterFirstZoom: (...args: unknown[]) =>
    mockActivateAbsystemTrialAfterFirstZoom(...args),
}))

import { completeZoomSession } from '../../../../src/modules/zoom/attendance/zoom.attendance.service.js'

function scheduledSession() {
  return {
    id: 'session-1',
    expertId: 'expert-1',
    status: 'SCHEDULED',
    postSessionReport: null,
    attendees: [
      { userId: 'user-1', attended: false },
      { userId: 'user-2', attended: false },
    ],
  }
}

describe('completeZoomSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaTransaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(mockDb.tx))
    mockZoomSessionFindUnique.mockResolvedValue(scheduledSession())
    mockZoomSessionAttendeeUpdateMany.mockResolvedValue({ count: 1 })
    mockZoomSessionUpdate.mockImplementation(async (args) => ({
      id: args.where.id,
      status: args.data.status,
      postSessionReport: args.data.postSessionReport,
    }))
    mockActivateAbsystemTrialAfterFirstZoom.mockResolvedValue(undefined)
  })

  it('manually completes a session through one transactional owner and persists actual attendance separately', async () => {
    const completed = await completeZoomSession({
      sessionId: 'session-1',
      actor: { userId: 'coach-user', role: 'EXPERT', expertId: 'expert-1' },
      source: 'manual',
      actualParticipantUserIds: ['user-1'],
      attendeeCount: 1,
      topic: 'Запуск воронки',
      summary: 'Домовились перевірити структуру перед запуском.',
      recordingRef: 'https://zoom.us/rec/1',
      completedAt: '2026-09-08T18:00:00.000Z',
    })

    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1)
    expect(mockZoomSessionAttendeeUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { sessionId: 'session-1' },
      data: { attended: false },
    })
    expect(mockZoomSessionAttendeeUpdateMany).toHaveBeenNthCalledWith(2, {
      where: { sessionId: 'session-1', userId: { in: ['user-1'] } },
      data: { attended: true },
    })
    expect(mockZoomSessionUpdate).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        status: 'COMPLETED',
        postSessionReport: expect.objectContaining({
          source: 'manual',
          completedAt: '2026-09-08T18:00:00.000Z',
          actualAttendeeCount: 1,
          actualParticipantUserIds: ['user-1'],
          topic: 'Запуск воронки',
          summary: 'Домовились перевірити структуру перед запуском.',
          audioUrl: 'https://zoom.us/rec/1',
          recordingAvailable: true,
        }),
      },
    })
    expect(mockZoomSessionUpdate.mock.calls[0][0].data).not.toHaveProperty('capacity')
    expect(mockActivateAbsystemTrialAfterFirstZoom).toHaveBeenCalledWith({
      userId: 'user-1',
      attendedAt: new Date('2026-09-08T18:00:00.000Z'),
      tx: mockDb.tx,
    })
    expect(completed.status).toBe('COMPLETED')
  })

  it('does not create duplicate attendance rows when the same completion is repeated', async () => {
    await completeZoomSession({
      sessionId: 'session-1',
      actor: { userId: 'coach-user', role: 'EXPERT', expertId: 'expert-1' },
      source: 'manual',
      actualParticipantUserIds: ['user-1'],
    })
    await completeZoomSession({
      sessionId: 'session-1',
      actor: { userId: 'coach-user', role: 'EXPERT', expertId: 'expert-1' },
      source: 'manual',
      actualParticipantUserIds: ['user-1'],
    })

    expect(mockZoomSessionAttendeeUpdateMany).toHaveBeenCalledTimes(4)
    expect(mockZoomSessionUpdate).toHaveBeenCalledTimes(2)
  })

  it('rejects a non-owner coach actor', async () => {
    await expect(completeZoomSession({
      sessionId: 'session-1',
      actor: { userId: 'other-coach', role: 'EXPERT', expertId: 'expert-2' },
      source: 'manual',
    })).rejects.toThrow('FORBIDDEN')

    expect(mockZoomSessionUpdate).not.toHaveBeenCalled()
  })

  it('allows future Zoom provider source to call the same owner contract', async () => {
    await completeZoomSession({
      sessionId: 'session-1',
      source: 'zoom',
      actualParticipantUserIds: ['user-2'],
      recordingRef: 'https://zoom.us/rec/provider',
    })

    expect(mockZoomSessionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'COMPLETED',
        postSessionReport: expect.objectContaining({
          source: 'zoom',
          actualParticipantUserIds: ['user-2'],
          audioUrl: 'https://zoom.us/rec/provider',
        }),
      }),
    }))
  })
})
