import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rows: [] as any[],
  updates: [] as any[],
  events: [] as any[],
  users: new Set<string>(),
  lockHeld: false,
  forceEventUserFk: false,
}))

vi.mock('../../../../src/db/client.js', () => ({ prisma: {
  runtimeOutbox: {
    findMany: vi.fn(async () => mocks.rows.filter((row) => row.status === 'PENDING')),
    update: vi.fn(async ({ where, data }: any) => {
      const row = mocks.rows.find((candidate) => candidate.id === where.id)
      Object.assign(row, data, { attempts: (row.attempts ?? 0) + (data.attempts?.increment ?? 0) })
      mocks.updates.push({ id: where.id, data })
      return row
    }),
  },
  user: { findUnique: vi.fn(async ({ where }: any) => mocks.users.has(where.id) ? { id: where.id } : null) },
  event: {
    create: vi.fn(async ({ data }: any) => {
      if (mocks.forceEventUserFk) {
        throw { code: 'P2003', meta: { constraint: 'Event_userId_fkey' } }
      }
      mocks.events.push(data)
      return data
    }),
  },
} }))

vi.mock('../../../../src/core/runtime/idempotency.js', () => ({
  buildRuntimeTelemetry: () => ({ idempotency_key: 'test-outbox-key' }),
  claimRuntimeEventReplay: vi.fn(async () => ({ duplicate: false })),
  withRuntimeAdvisoryLock: vi.fn(async (_input: unknown, work: () => Promise<unknown>) => {
    if (mocks.lockHeld) return { acquired: false, value: 0 }
    mocks.lockHeld = true
    try {
      return { acquired: true, value: await work() }
    } finally {
      mocks.lockHeld = false
    }
  }),
}))
vi.mock('../../../../src/core/runtime/zoom/audio.js', () => ({ processZoomAudioOutboxItem: vi.fn() }))

import { processRuntimeOutbox } from '../../../../src/core/runtime/outbox.js'

function row(id: string, userId: string | null) {
  return {
    id,
    scope: 'event', type: 'ZOOM_REGISTERED', source: 'test', userId,
    state: null, tenantId: null, payload: {}, createdAt: new Date(),
    dedupeKey: `key:${id}`, runAt: new Date(), status: 'PENDING', attempts: 0,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.rows.length = 0
  mocks.updates.length = 0
  mocks.events.length = 0
  mocks.users.clear()
  mocks.lockHeld = false
  mocks.forceEventUserFk = false
})

describe('RuntimeOutbox Event user reference recovery', () => {
  it('terminally fails an orphaned Event user reference and continues a valid row', async () => {
    mocks.rows.push(row('orphan', 'missing-user'), row('valid', 'active-user'))
    mocks.users.add('active-user')

    await expect(processRuntimeOutbox()).resolves.toBe(2)

    expect(mocks.rows.find((candidate) => candidate.id === 'orphan')).toMatchObject({
      status: 'FAILED', attempts: 1, lastError: 'EVENT_USER_REFERENCE_MISSING',
    })
    expect(mocks.rows.find((candidate) => candidate.id === 'valid')).toMatchObject({ status: 'DONE', attempts: 1 })
    expect(mocks.events).toEqual([expect.objectContaining({ userId: 'active-user' })])
  })

  it('handles a delete race reported by Event_userId_fkey without blocking the batch', async () => {
    mocks.rows.push(row('race', 'active-user'))
    mocks.users.add('active-user')
    mocks.forceEventUserFk = true

    await expect(processRuntimeOutbox()).resolves.toBe(1)

    expect(mocks.rows[0]).toMatchObject({ status: 'FAILED', attempts: 1, lastError: 'EVENT_USER_REFERENCE_MISSING' })
  })

  it('serializes repeated worker invocations and does not duplicate a valid Event', async () => {
    mocks.rows.push(row('valid', 'active-user'))
    mocks.users.add('active-user')

    await Promise.all([processRuntimeOutbox(), processRuntimeOutbox()])

    expect(mocks.events).toHaveLength(1)
    expect(mocks.rows[0]).toMatchObject({ status: 'DONE', attempts: 1 })
  })
})
