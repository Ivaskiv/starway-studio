import { beforeEach, describe, expect, it, vi } from 'vitest'

const findUnique = vi.fn()
const update = vi.fn()
const transaction = vi.fn()
const activateTrial = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    $transaction: (callback: (tx: unknown) => unknown) => transaction(callback),
  },
}))

vi.mock('../../../../src/modules/access/service.js', () => ({
  activateAbsystemTrialAfterFirstZoom: (...args: unknown[]) => activateTrial(...args),
}))

import { saveSelfReportedAttendance } from '../../../../src/modules/zoom/attendance/zoom.attendance.service.js'

const completedGroupAttendee = {
  id: 'attendee-1',
  userId: 'user-1',
  sessionId: 'group-1',
  attended: false,
  selfReportedAttended: null,
  selfReportedAt: null,
  session: {
    scheduledAt: new Date('2026-10-20T15:00:00.000Z'),
    status: 'COMPLETED',
    type: 'GROUP',
    requests: { type: 'group_practice' },
  },
}

describe('saveSelfReportedAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findUnique.mockResolvedValue(completedGroupAttendee)
    update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...completedGroupAttendee,
      ...data,
    }))
    transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      zoomSessionAttendee: { findUnique, update },
    }))
  })

  it('stores a participant-owned checkpoint without changing verified attendance or activating access', async () => {
    await expect(saveSelfReportedAttendance({
      userId: 'user-1', sessionId: 'group-1', attended: true,
    })).resolves.toMatchObject({
      idempotent: false,
      attendee: { selfReportedAttended: true, attended: false },
    })

    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { sessionId_userId: { sessionId: 'group-1', userId: 'user-1' } },
    }))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ selfReportedAttended: true, selfReportedAt: expect.any(Date) }),
    }))
    expect(update.mock.calls[0][0].data).not.toHaveProperty('attended')
    expect(activateTrial).not.toHaveBeenCalled()
  })

  it('is idempotent for the same checkpoint and permits no write', async () => {
    findUnique.mockResolvedValue({ ...completedGroupAttendee, selfReportedAttended: true })

    await expect(saveSelfReportedAttendance({
      userId: 'user-1', sessionId: 'group-1', attended: true,
    })).resolves.toMatchObject({ idempotent: true })

    expect(update).not.toHaveBeenCalled()
    expect(activateTrial).not.toHaveBeenCalled()
  })

  it('allows a participant to correct their own checkpoint without touching verified attendance', async () => {
    findUnique.mockResolvedValue({ ...completedGroupAttendee, selfReportedAttended: true })

    await expect(saveSelfReportedAttendance({
      userId: 'user-1', sessionId: 'group-1', attended: false,
    })).resolves.toMatchObject({
      idempotent: false,
      attendee: { selfReportedAttended: false, attended: false },
    })

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ selfReportedAttended: false }),
    }))
    expect(update.mock.calls[0][0].data).not.toHaveProperty('attended')
    expect(activateTrial).not.toHaveBeenCalled()
  })

  it.each([
    ['a user without an attendee', null, 'ATTENDANCE_CHECKPOINT_FORBIDDEN'],
    ['a future group practice', { ...completedGroupAttendee, session: { ...completedGroupAttendee.session, scheduledAt: new Date('2099-01-01T15:00:00.000Z') } }, 'ATTENDANCE_CHECKPOINT_INELIGIBLE'],
    ['an individual session', { ...completedGroupAttendee, session: { ...completedGroupAttendee.session, type: 'PRIVATE', requests: { type: 'individual' } } }, 'ATTENDANCE_CHECKPOINT_INELIGIBLE'],
  ])('rejects %s without a write', async (_label, attendee, error) => {
    findUnique.mockResolvedValue(attendee)

    await expect(saveSelfReportedAttendance({
      userId: 'user-1', sessionId: 'group-1', attended: true,
    })).rejects.toThrow(error)

    expect(update).not.toHaveBeenCalled()
    expect(activateTrial).not.toHaveBeenCalled()
  })
})
