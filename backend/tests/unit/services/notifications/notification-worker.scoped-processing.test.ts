import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationJob } from '@starway/db/prisma-client'

const mockClaimDuePending = vi.fn()
const mockClaimDuePendingById = vi.fn()
const mockMarkDone = vi.fn()
const mockMarkFailed = vi.fn()
const mockRescheduleRetry = vi.fn()
const mockProcessJob = vi.fn()
const mockExecuteClaimed = vi.fn()

vi.mock('../../../../src/services/notifications/NotificationService.ts', () => ({
  notificationService: {
    processJob: (...args: unknown[]) => mockProcessJob(...args),
  },
}))

vi.mock('../../../../src/services/notifications/services/NotificationJobService.ts', () => ({
  notificationJobService: {
    claimDuePending: (...args: unknown[]) => mockClaimDuePending(...args),
    claimDuePendingById: (...args: unknown[]) => mockClaimDuePendingById(...args),
    markDone: (...args: unknown[]) => mockMarkDone(...args),
    markFailed: (...args: unknown[]) => mockMarkFailed(...args),
    rescheduleRetry: (...args: unknown[]) => mockRescheduleRetry(...args),
  },
}))

vi.mock('../../../../src/services/notifications/repositories/NotificationJobRepository.ts', () => ({
  notificationJobRepository: {
    executeClaimed: (...args: unknown[]) => mockExecuteClaimed(...args),
  },
}))

function claimedJob(id = 'selected-job', attempts = 0): NotificationJob {
  const now = new Date('2026-10-14T10:00:00.000Z')
  return {
    id,
    type: 'AI_REMINDER',
    payload: { event: 'AB_TEST_FOLLOWUP', userId: 'user-a', payload: {} },
    runAt: new Date('2026-10-14T09:00:00.000Z'),
    status: 'PROCESSING',
    attempts,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  } as NotificationJob
}

async function loadWorker() {
  return import('../../../../src/services/notifications/worker.ts')
}

describe('processNotificationJobByIdForOperator', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockClaimDuePending.mockResolvedValue([])
    mockClaimDuePendingById.mockResolvedValue(null)
    mockMarkDone.mockResolvedValue(undefined)
    mockMarkFailed.mockResolvedValue(undefined)
    mockRescheduleRetry.mockResolvedValue(undefined)
    mockProcessJob.mockResolvedValue(undefined)
    mockExecuteClaimed.mockImplementation(async (jobId, execute) => {
      const attempts = jobId === 'failed-job' ? 3 : 0
      const job = claimedJob(jobId, attempts)
      const result = await execute(job)
      return { ...job, ...result }
    })
  })

  it('requires explicit operator confirmation before it claims or delivers', async () => {
    const { processNotificationJobByIdForOperator } = await loadWorker()

    await expect(processNotificationJobByIdForOperator({
      jobId: 'selected-job',
      operatorConfirmed: false,
    })).resolves.toEqual({ status: 'confirmation_required', jobId: 'selected-job' })

    expect(mockClaimDuePendingById).not.toHaveBeenCalled()
    expect(mockClaimDuePending).not.toHaveBeenCalled()
    expect(mockProcessJob).not.toHaveBeenCalled()
  })

  it('claims and processes only the explicitly selected job', async () => {
    const job = claimedJob('selected-job')
    mockClaimDuePendingById.mockResolvedValue(job)
    const { processNotificationJobByIdForOperator } = await loadWorker()

    await expect(processNotificationJobByIdForOperator({
      jobId: 'selected-job',
      operatorConfirmed: true,
    })).resolves.toEqual({ status: 'processed', jobId: 'selected-job' })

    expect(mockClaimDuePendingById).toHaveBeenCalledWith('selected-job')
    expect(mockClaimDuePending).not.toHaveBeenCalled()
    expect(mockProcessJob).toHaveBeenCalledTimes(1)
    expect(mockProcessJob).toHaveBeenCalledWith(job)
    expect(mockExecuteClaimed).toHaveBeenCalledWith('selected-job', expect.any(Function))
    expect(mockMarkDone).not.toHaveBeenCalled()
  })

  it('skips a non-claimable job without delivery', async () => {
    const { processNotificationJobByIdForOperator } = await loadWorker()

    await expect(processNotificationJobByIdForOperator({
      jobId: 'not-due-job',
      operatorConfirmed: true,
    })).resolves.toEqual({ status: 'not_claimable', jobId: 'not-due-job' })

    expect(mockProcessJob).not.toHaveBeenCalled()
    expect(mockMarkDone).not.toHaveBeenCalled()
  })

  it('cannot deliver twice when concurrent callers claim the same job', async () => {
    const job = claimedJob('single-claim-job')
    mockClaimDuePendingById
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce(null)
    const { processNotificationJobByIdForOperator } = await loadWorker()

    const results = await Promise.all([
      processNotificationJobByIdForOperator({ jobId: 'single-claim-job', operatorConfirmed: true }),
      processNotificationJobByIdForOperator({ jobId: 'single-claim-job', operatorConfirmed: true }),
    ])

    expect(results).toEqual([
      { status: 'processed', jobId: 'single-claim-job' },
      { status: 'not_claimable', jobId: 'single-claim-job' },
    ])
    expect(mockProcessJob).toHaveBeenCalledTimes(1)
  })

  it('does not run a stale-reclaimed job while another worker owns its delivery lock', async () => {
    const job = claimedJob('stale-job')
    let rowLocked = false
    let releaseFirstExecution: (() => void) | undefined
    const firstExecutionCanFinish = new Promise<void>((resolve) => {
      releaseFirstExecution = resolve
    })
    const firstExecutionStarted = new Promise<void>((resolve) => {
      mockExecuteClaimed.mockImplementation(async (_jobId, execute) => {
        if (rowLocked) return null
        rowLocked = true
        resolve()
        const result = await execute(job)
        rowLocked = false
        return { ...job, ...result }
      })
    })
    mockClaimDuePendingById.mockResolvedValue(job)
    mockProcessJob.mockImplementation(async () => firstExecutionCanFinish)
    const { processNotificationJobByIdForOperator } = await loadWorker()

    const first = processNotificationJobByIdForOperator({ jobId: 'stale-job', operatorConfirmed: true })
    await firstExecutionStarted
    const second = processNotificationJobByIdForOperator({ jobId: 'stale-job', operatorConfirmed: true })

    await expect(second).resolves.toEqual({ status: 'not_claimable', jobId: 'stale-job' })
    expect(mockProcessJob).toHaveBeenCalledTimes(1)

    releaseFirstExecution?.()
    await first
  })

  it('uses the canonical retry and terminal-failure transitions', async () => {
    mockClaimDuePendingById
      .mockResolvedValueOnce(claimedJob('retry-job', 0))
      .mockResolvedValueOnce(claimedJob('failed-job', 3))
    mockProcessJob.mockRejectedValue(new Error('telegram_transport_unavailable'))
    const { processNotificationJobByIdForOperator } = await loadWorker()

    await expect(processNotificationJobByIdForOperator({ jobId: 'retry-job', operatorConfirmed: true }))
      .resolves.toEqual({ status: 'retry_scheduled', jobId: 'retry-job' })
    await expect(processNotificationJobByIdForOperator({ jobId: 'failed-job', operatorConfirmed: true }))
      .resolves.toEqual({ status: 'failed', jobId: 'failed-job' })

    expect(mockExecuteClaimed).toHaveBeenCalledWith('retry-job', expect.any(Function))
    expect(mockExecuteClaimed).toHaveBeenCalledWith('failed-job', expect.any(Function))
    expect(mockRescheduleRetry).not.toHaveBeenCalled()
    expect(mockMarkFailed).not.toHaveBeenCalled()
  })

  it('keeps the global worker batch path unchanged', async () => {
    const job = claimedJob('global-job')
    mockClaimDuePending.mockResolvedValue([job])
    const { processDueNotificationJobs } = await loadWorker()

    await processDueNotificationJobs(25)

    expect(mockClaimDuePending).toHaveBeenCalledWith(25)
    expect(mockProcessJob).toHaveBeenCalledWith(job)
    expect(mockExecuteClaimed).toHaveBeenCalledWith('global-job', expect.any(Function))
    expect(mockMarkDone).not.toHaveBeenCalled()
  })
})
