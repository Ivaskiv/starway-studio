import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryRawUnsafe = vi.fn()

vi.mock('@starway/db', () => ({
  prisma: { $queryRawUnsafe: (...args: unknown[]) => queryRawUnsafe(...args) },
  withRetry: vi.fn(),
}))

import { assertZoomAttendanceCheckpointSchema } from '../../../src/db/client.js'

describe('Zoom attendance checkpoint schema preflight', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes only when both additive checkpoint columns are present', async () => {
    queryRawUnsafe.mockResolvedValue([
      { column_name: 'selfReportedAttended' },
      { column_name: 'selfReportedAt' },
    ])

    await expect(assertZoomAttendanceCheckpointSchema()).resolves.toBeUndefined()
  })

  it('fails explicitly instead of allowing a later P2022 read failure', async () => {
    queryRawUnsafe.mockResolvedValue([{ column_name: 'selfReportedAttended' }])

    await expect(assertZoomAttendanceCheckpointSchema()).rejects.toThrow(
      '[DB_SCHEMA_DRIFT] ZoomSessionAttendee is missing selfReportedAt',
    )
  })
})
