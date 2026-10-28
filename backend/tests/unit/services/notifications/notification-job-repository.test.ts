import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationJob } from '@starway/db/prisma-client'

const mockQueryRaw = vi.fn()
const mockWithRetry = vi.fn(<T>(operation: () => Promise<T>) => operation())
const mockTransaction = vi.fn()
const mockJobFindFirst = vi.fn()
const mockJobCreate = vi.fn()
const mockJobUpdateMany = vi.fn()

vi.mock('../../../../src/db/client.ts', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    notificationJob: {
      findFirst: (...args: unknown[]) => mockJobFindFirst(...args),
      updateMany: (...args: unknown[]) => mockJobUpdateMany(...args),
    },
  },
  withRetry: <T>(operation: () => Promise<T>) => mockWithRetry(operation),
}))

function job(id: string): NotificationJob {
  const now = new Date('2026-10-14T10:00:00.000Z')
  return {
    id,
    type: 'AI_REMINDER',
    payload: { event: 'AB_TEST_FOLLOWUP', userId: 'user-a', payload: {} },
    runAt: new Date('2026-10-14T09:00:00.000Z'),
    status: 'PROCESSING',
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  } as NotificationJob
}

async function loadRepository() {
  const module = await import('../../../../src/services/notifications/repositories/NotificationJobRepository.ts')
  return new module.NotificationJobRepository()
}

function sqlText(query: unknown) {
  return ((query as { strings?: readonly string[] }).strings ?? []).join(' ')
}

function sqlValues(query: unknown) {
  return (query as { values?: readonly unknown[] }).values ?? []
}

describe('NotificationJobRepository.claimDuePendingById', () => {
  beforeEach(() => {
    vi.resetModules()
    mockQueryRaw.mockReset()
    mockWithRetry.mockClear()
    mockTransaction.mockReset()
    mockJobFindFirst.mockReset()
    mockJobCreate.mockReset()
    mockJobUpdateMany.mockReset()
  })

  it('atomically claims only the specified due pending job', async () => {
    const claimed = job('job-for-user-a')
    mockQueryRaw
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([claimed])
    const repository = await loadRepository()

    await expect(repository.claimDuePendingById('job-for-user-a')).resolves.toEqual(claimed)

    const query = mockQueryRaw.mock.calls[1]?.[0]
    expect(sqlText(query)).toContain('id =')
    expect(sqlText(query)).toContain("status = 'PENDING'")
    expect(sqlText(query)).toContain('"runAt" <= NOW()')
    expect(sqlText(query)).toContain('FOR UPDATE SKIP LOCKED')
    expect(sqlValues(query)).toContain('job-for-user-a')
    expect(sqlValues(query)).not.toContain('job-for-user-b')
  })

  it.each(['already-claimed', 'done', 'failed', 'not-due'])('returns null when the job is %s', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([])
    const repository = await loadRepository()

    await expect(repository.claimDuePendingById('job-not-claimable')).resolves.toBeNull()
  })

  it('allows only one concurrent claim for the same job', async () => {
    const claimed = job('single-claim-job')
    let claimedOnce = false
    mockQueryRaw
      .mockResolvedValueOnce([{ exists: true }])
      .mockImplementation(async () => {
        if (claimedOnce) return []
        claimedOnce = true
        return [claimed]
      })
    const repository = await loadRepository()
    await repository.isAvailable()

    const results = await Promise.all([
      repository.claimDuePendingById('single-claim-job'),
      repository.claimDuePendingById('single-claim-job'),
    ])

    expect(results).toEqual([claimed, null])
  })

  it('keeps the global batch claim contract unchanged', async () => {
    const claimed = job('global-job')
    mockQueryRaw
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([claimed])
    const repository = await loadRepository()

    await expect(repository.claimDuePending(25)).resolves.toEqual([claimed])

    const query = mockQueryRaw.mock.calls[1]?.[0]
    expect(sqlText(query)).toContain('LIMIT')
    expect(sqlText(query)).toContain("status = 'PROCESSING'")
  })

  it('returns the existing durable job for the same commerce reminder identity', async () => {
    const existing = job('commerce-reminder-job')
    mockQueryRaw.mockResolvedValueOnce([{ exists: true }])
    mockJobFindFirst.mockResolvedValue(existing)
    mockTransaction.mockImplementation(async (callback) => callback({
      $queryRaw: mockQueryRaw,
      notificationJob: { findFirst: mockJobFindFirst, create: mockJobCreate },
    }))
    const repository = await loadRepository()
    const payload = {
      event: 'PAYMENT_REMINDER_10M', userId: 'user-a',
      payload: { idempotencyKey: 'zoom-commerce:request-a:deadline:PAYMENT_REMINDER_10M' },
    }

    await expect(repository.createOnce({ type: 'AI_REMINDER', payload, runAt: existing.runAt },
      payload.payload.idempotencyKey)).resolves.toEqual(existing)

    expect(mockJobCreate).not.toHaveBeenCalled()
    expect(mockJobFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        payload: expect.objectContaining({ path: ['payload', 'idempotencyKey'] }),
      }),
    }))
  })

  it('lets only the reclaimed worker persist DONE after the original lease expires', async () => {
    const firstLease = new Date('2026-10-14T10:00:00.000Z')
    const secondLease = new Date('2026-10-14T10:15:00.000Z')
    let now = firstLease
    let persisted = { ...job('leased-job'), status: 'PENDING' as const, updatedAt: firstLease }
    let releaseWorkerA: (() => void) | undefined
    let markWorkerAStarted: (() => void) | undefined
    const workerACanFinish = new Promise<void>((resolve) => { releaseWorkerA = resolve })
    const workerAStarted = new Promise<void>((resolve) => { markWorkerAStarted = resolve })
    mockQueryRaw.mockImplementation(async (query: unknown) => {
      const text = `${sqlText(query)} ${String(query)}`
      if (text.includes('information_schema.tables')) return [{ exists: true }]
      if (!text.includes('WITH claimed')) return []

      const leaseExpired = persisted.status === 'PROCESSING'
        && now.getTime() - persisted.updatedAt.getTime() >= 15 * 60 * 1000
      if (persisted.status !== 'PENDING' && !leaseExpired) return []

      persisted = {
        ...persisted,
        status: 'PROCESSING',
        updatedAt: now,
        attempts: persisted.attempts + (leaseExpired ? 1 : 0),
      }
      return [persisted]
    })
    mockJobFindFirst.mockImplementation(async ({ where }: { where: { updatedAt: Date } }) => (
      persisted.status === 'PROCESSING' && persisted.updatedAt.getTime() === where.updatedAt.getTime()
        ? { id: persisted.id }
        : null
    ))
    mockJobUpdateMany.mockImplementation(async ({ where, data }: {
      where: { updatedAt: Date }
      data: { status: 'DONE' }
    }) => {
      if (persisted.status !== 'PROCESSING' || persisted.updatedAt.getTime() !== where.updatedAt.getTime()) {
        return { count: 0 }
      }
      persisted = { ...persisted, status: data.status }
      return { count: 1 }
    })
    const repository = await loadRepository()

    const workerAClaim = (await repository.claimDuePending())[0]!
    const workerA = repository.executeClaimed(workerAClaim.id, Object.assign(async () => {
      expect(mockTransaction).not.toHaveBeenCalled()
      markWorkerAStarted?.()
      await workerACanFinish
      return { status: 'DONE' as const }
    }, { claim: workerAClaim }))
    await workerAStarted

    now = secondLease
    const workerBClaim = (await repository.claimDuePending())[0]!
    expect(workerBClaim.updatedAt).toEqual(secondLease)
    const workerB = await repository.executeClaimed(workerBClaim.id, Object.assign(async () => {
      expect(mockTransaction).not.toHaveBeenCalled()
      return { status: 'DONE' as const }
    }, { claim: workerBClaim }))

    releaseWorkerA?.()
    await expect(workerA).resolves.toBeNull()
    expect(workerB).toEqual({ status: 'DONE' })
    expect(persisted.status).toBe('DONE')
    expect(persisted.updatedAt).toEqual(secondLease)
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockJobUpdateMany).toHaveBeenCalledTimes(2)
    expect(mockJobUpdateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ updatedAt: secondLease }),
    }))
    expect(mockJobUpdateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ updatedAt: firstLease }),
    }))
  })

  it('does not deliver when the claim has already been superseded', async () => {
    const claim = job('superseded-job')
    const execute = Object.assign(vi.fn(async () => ({ status: 'DONE' as const })), { claim })
    mockQueryRaw.mockResolvedValueOnce([{ exists: true }])
    mockJobFindFirst.mockResolvedValue(null)
    const repository = await loadRepository()

    await expect(repository.executeClaimed(claim.id, execute)).resolves.toBeNull()

    expect(execute).not.toHaveBeenCalled()
    expect(mockJobUpdateMany).not.toHaveBeenCalled()
  })
})
