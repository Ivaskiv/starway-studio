import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.JWT_ACCESS_SECRET ??= 'test-access-secret'
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret'
})

const findUnique = vi.fn()
const remove = vi.fn()
const lockSession = vi.fn()
const transaction = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transaction(...args),
    zoomSession: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      delete: (...args: unknown[]) => remove(...args),
    },
  },
}))

vi.mock('../../../../src/lib/telegram.js', () => ({ bot: {} }))
vi.mock('../../../../src/modules/zoom/core/zoom.operations.service.js', () => ({
  afterZoomOperation: vi.fn(),
}))
vi.mock('../../../../src/modules/zoom/notifications/zoom.subscriber-notifications.service.js', () => ({
  notifySubscribersNewSession: vi.fn(),
}))

import { deleteFreeIndividualSlot } from '../../../../src/modules/zoom/core/zoom.session.service.js'

const freeSlot = {
  id: 'free-slot-1',
  expertId: 'expert-1',
  scheduledAt: new Date('2000-01-01T10:00:00.000Z'),
  type: 'GROUP',
  status: 'SCHEDULED',
  requests: { type: 'individual' },
  postSessionReport: null,
  attendees: [],
  commerceRequests: [],
}

describe('deleteFreeIndividualSlot', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      $queryRaw: (...args: unknown[]) => lockSession(...args),
      zoomSession: {
        findUnique: (...args: unknown[]) => findUnique(...args),
        delete: (...args: unknown[]) => remove(...args),
      },
    }))
    findUnique.mockResolvedValue(freeSlot)
    remove.mockResolvedValue({ id: freeSlot.id })
  })

  it('persists deletion only for an uncommitted Individual slot', async () => {
    await expect(deleteFreeIndividualSlot({
      sessionId: freeSlot.id,
      expertId: 'expert-1',
    })).resolves.toEqual({ id: freeSlot.id })

    expect(lockSession).toHaveBeenCalledOnce()
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: freeSlot.id },
      include: expect.objectContaining({ attendees: expect.anything(), commerceRequests: expect.anything() }),
    }))
    expect(remove).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledWith({ where: { id: freeSlot.id } })
  })

  it.each([
    ['an attendee', { ...freeSlot, attendees: [{ id: 'attendee-1' }] }],
    ['a requested commitment', { ...freeSlot, commerceRequests: [{ id: 'request-1', status: 'REQUESTED' }] }],
    ['an approved commitment', { ...freeSlot, commerceRequests: [{ id: 'request-1', status: 'APPROVED_PENDING_PAYMENT' }] }],
    ['a paid commitment', { ...freeSlot, commerceRequests: [{ id: 'request-1', status: 'PAID' }] }],
    ['an expired payment history', { ...freeSlot, commerceRequests: [{ id: 'request-1', status: 'EXPIRED' }] }],
    ['a rejected request history', { ...freeSlot, commerceRequests: [{ id: 'request-1', status: 'REJECTED' }] }],
    ['a completed session', { ...freeSlot, status: 'COMPLETED' }],
    ['a session report', { ...freeSlot, postSessionReport: { summary: 'history' } }],
    ['a cancelled real session', { ...freeSlot, status: 'CANCELLED', commerceRequests: [{ id: 'cancelled-request', status: 'CANCELLED' }] }],
    ['a non-individual session', { ...freeSlot, requests: { type: 'group_practice' }, type: 'GROUP' }],
  ])('rejects %s without deleting the session', async (_label, session) => {
    findUnique.mockResolvedValueOnce(session)

    await expect(deleteFreeIndividualSlot({
      sessionId: freeSlot.id,
      expertId: 'expert-1',
    })).rejects.toThrow('SLOT_NOT_DELETABLE')

    expect(remove).not.toHaveBeenCalled()
  })

  it('rejects a different coach before deletion', async () => {
    await expect(deleteFreeIndividualSlot({
      sessionId: freeSlot.id,
      expertId: 'expert-2',
    })).rejects.toThrow('FORBIDDEN')

    expect(remove).not.toHaveBeenCalled()
  })

  it('keeps a past uncommitted slot eligible for deletion', async () => {
    await expect(deleteFreeIndividualSlot({
      sessionId: freeSlot.id,
      expertId: 'expert-1',
    })).resolves.toEqual({ id: freeSlot.id })

    expect(remove).toHaveBeenCalledOnce()
  })

  it('deletes a cancelled uncommitted individual slot but not a cancelled booking history', async () => {
    findUnique.mockResolvedValueOnce({ ...freeSlot, status: 'CANCELLED' })

    await expect(deleteFreeIndividualSlot({
      sessionId: freeSlot.id,
      expertId: 'expert-1',
    })).resolves.toEqual({ id: freeSlot.id })

    expect(remove).toHaveBeenCalledOnce()
  })

  it('locks the slot before reading and deleting so a concurrent booking cannot lose its commitment', async () => {
    let releaseLock: (() => void) | undefined
    lockSession.mockImplementationOnce(() => new Promise<void>(resolve => {
      releaseLock = resolve
    }))

    const deletion = deleteFreeIndividualSlot({
      sessionId: freeSlot.id,
      expertId: 'expert-1',
    })
    await Promise.resolve()
    expect(findUnique).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()

    releaseLock?.()
    await expect(deletion).resolves.toEqual({ id: freeSlot.id })
    expect(remove).toHaveBeenCalledOnce()
  })
})
