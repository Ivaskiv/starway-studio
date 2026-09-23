import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockExpertFindUnique = vi.fn()
const mockExpertUpdate = vi.fn()
const mockZoomSessionFindFirst = vi.fn()
const mockZoomSessionFindMany = vi.fn()
const mockZoomCommerceRequestFindMany = vi.fn()
const mockCreateFullSession = vi.fn()
const mockAvailabilityOverrideFindUnique = vi.fn()
const mockAvailabilityOverrideFindMany = vi.fn()
const mockAvailabilityOverrideUpsert = vi.fn()
const mockAvailabilityOverrideDelete = vi.fn()
const mockTransaction = vi.fn()

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    expert: {
      findUnique: (...args: unknown[]) => mockExpertFindUnique(...args),
      update: (...args: unknown[]) => mockExpertUpdate(...args),
    },
    zoomSession: {
      findFirst: (...args: unknown[]) => mockZoomSessionFindFirst(...args),
      findMany: (...args: unknown[]) => mockZoomSessionFindMany(...args),
    },
    zoomCommerceRequest: {
      findMany: (...args: unknown[]) => mockZoomCommerceRequestFindMany(...args),
    },
    zoomAvailabilityOverride: {
      findUnique: (...args: unknown[]) => mockAvailabilityOverrideFindUnique(...args),
      findMany: (...args: unknown[]) => mockAvailabilityOverrideFindMany(...args),
      upsert: (...args: unknown[]) => mockAvailabilityOverrideUpsert(...args),
      delete: (...args: unknown[]) => mockAvailabilityOverrideDelete(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock('../../../../src/modules/zoom/index.js', () => ({
  createFullSession: (...args: unknown[]) => mockCreateFullSession(...args),
}))

import {
  generateSessionsFromAvailability,
  getIndividualAvailabilityForDate,
  getIndividualAvailabilityForScheduledAt,
  getIndividualAvailabilitySummary,
  getAvailabilityWeek,
  saveAvailabilityWeek,
} from '../../../../src/modules/zoom/booking/zoom.availability.service.js'

describe('generateSessionsFromAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockZoomSessionFindMany.mockResolvedValue([])
    mockZoomCommerceRequestFindMany.mockResolvedValue([])
  })

  it('uses slot timezone instead of hardcoded Kyiv offset', async () => {
    mockExpertFindUnique.mockResolvedValue({
      zoomAvailability: [
        {
          id: 'warsaw-monday',
          dayOfWeek: 1,
          hour: 19,
          minute: 0,
          timezone: 'Europe/Warsaw',
          sessionType: 'group_practice',
          maxSlots: 50,
          priceCents: 0,
          durationMinutes: 60,
          active: true,
        },
      ],
    })
    mockZoomSessionFindFirst.mockResolvedValue(null)
    mockCreateFullSession.mockResolvedValue({ id: 'session-1' })

    await generateSessionsFromAvailability(
      'expert-1',
      1,
      new Date('2026-08-04T09:00:00.000Z'),
    )

    expect(mockCreateFullSession).toHaveBeenCalledTimes(1)
    expect(mockCreateFullSession.mock.calls[0]?.[0]).toMatchObject({
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-10T17:00:00.000Z'),
      topic: 'ФОКУС · Zoom-практика',
    })
  })

  it('is idempotent across repeated runs and preserves existing sessions', async () => {
    mockExpertFindUnique.mockResolvedValue({
      zoomAvailability: [
        {
          id: 'kyiv-monday',
          dayOfWeek: 1,
          hour: 19,
          minute: 0,
          timezone: 'Europe/Kyiv',
          sessionType: 'group_practice',
          maxSlots: 50,
          priceCents: 0,
          durationMinutes: 60,
          active: true,
        },
      ],
    })

    const existingWindows = new Set<string>()
    mockZoomSessionFindFirst.mockImplementation(async ({ where }: { where: { scheduledAt: { gte: Date; lte: Date } } }) => {
      const key = where.scheduledAt.gte.toISOString()
      return existingWindows.has(key) ? { id: `existing:${key}` } : null
    })
    mockCreateFullSession.mockImplementation(async ({ scheduledAt }: { scheduledAt: Date }) => {
      existingWindows.add(new Date(scheduledAt.getTime() - 5 * 60 * 1000).toISOString())
      return { id: `created:${scheduledAt.toISOString()}` }
    })

    const firstRun = await generateSessionsFromAvailability(
      'expert-1',
      2,
      new Date('2026-08-04T09:00:00.000Z'),
    )
    const secondRun = await generateSessionsFromAvailability(
      'expert-1',
      2,
      new Date('2026-08-04T09:00:00.000Z'),
    )

    expect(firstRun).toEqual({ created: 2, skipped: 0 })
    expect(secondRun).toEqual({ created: 0, skipped: 2 })
    expect(mockCreateFullSession).toHaveBeenCalledTimes(2)
  })

  it('carries the full GROUP template contract into generated sessions', async () => {
    mockExpertFindUnique.mockResolvedValue({
      zoomAvailability: [
        {
          id: 'group-slot',
          dayOfWeek: 1,
          hour: 19,
          minute: 0,
          timezone: 'Europe/Kyiv',
          sessionType: 'group_practice',
          maxSlots: 50,
          priceCents: 7500,
          durationMinutes: 90,
          active: true,
        },
      ],
    })
    mockZoomSessionFindFirst.mockResolvedValue(null)
    mockCreateFullSession.mockResolvedValue({ id: 'session-1' })

    await generateSessionsFromAvailability(
      'expert-1',
      1,
      new Date('2026-08-04T09:00:00.000Z'),
    )

    expect(mockCreateFullSession.mock.calls[0]?.[0]).toMatchObject({
      expertId: 'expert-1',
      topic: 'ФОКУС · Zoom-практика',
      requests: {
        type: 'group_practice',
        maxSlots: 50,
        priceCents: 7500,
        durationMinutes: 90,
        slotStatus: 'available',
        starterQuestions: [
          'Як не зриватись на вихідних',
          'Планування тижня з дітьми',
          'Повернення після відпустки',
        ],
        notify24h: true,
        notify2h: true,
        notifiedAt24h: null,
        notifiedAt2h: null,
      },
    })
  })
})

describe('Individual canonical availability', () => {
  const mondayIndividualWindow = {
    id: 'monday-individual-window',
    dayOfWeek: 1,
    hour: 17,
    minute: 0,
    endHour: 22,
    endMinute: 0,
    timezone: 'Europe/Kyiv',
    sessionType: 'individual',
    maxSlots: 1,
    priceCents: 0,
    durationMinutes: 60,
    active: true,
  }

  beforeEach(() => {
    mockExpertFindUnique.mockResolvedValue({ zoomAvailability: [mondayIndividualWindow] })
    mockZoomSessionFindMany.mockResolvedValue([])
    mockZoomCommerceRequestFindMany.mockResolvedValue([])
    mockAvailabilityOverrideFindUnique.mockResolvedValue(null)
    mockAvailabilityOverrideFindMany.mockResolvedValue([])
    mockAvailabilityOverrideUpsert.mockResolvedValue(undefined)
    mockAvailabilityOverrideDelete.mockResolvedValue(undefined)
    mockTransaction.mockImplementation(async (callback) => callback({
      zoomAvailabilityOverride: {
        upsert: (...args: unknown[]) => mockAvailabilityOverrideUpsert(...args),
        delete: (...args: unknown[]) => mockAvailabilityOverrideDelete(...args),
      },
    }))
  })

  it('blocks the full 60-minute interval against GROUP but permits a boundary start', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      { scheduledAt: new Date('2026-09-21T15:00:00.000Z'), requests: { type: 'group_practice', durationMinutes: 60 } },
    ])

    const candidates = await getIndividualAvailabilityForDate({ expertId: 'expert-1', date: '2026-09-21' })
    expect(candidates.find((slot) => slot.scheduledAt === '2026-09-21T15:30:00.000Z')).toMatchObject({
      available: false,
      reason: 'Зайнято',
    })
    expect(candidates.find((slot) => slot.scheduledAt === '2026-09-21T16:00:00.000Z')).toMatchObject({ available: true })
  })

  it('blocks overlapping Individual reservations and ignores CANCELLED sessions', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      { scheduledAt: new Date('2026-09-21T17:00:00.000Z'), requests: { type: 'individual', durationMinutes: 60 } },
    ])
    const overlapping = await getIndividualAvailabilityForScheduledAt({
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-21T17:30:00.000Z'),
    })
    expect(overlapping.candidate).toMatchObject({ available: false, reason: 'Зайнято' })

    mockZoomSessionFindMany.mockResolvedValue([])
    const afterCancelledSession = await getIndividualAvailabilityForScheduledAt({
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-21T17:30:00.000Z'),
    })
    expect(afterCancelledSession.candidate).toMatchObject({ available: true })
  })

  it('treats a scheduled Battle as a coach-calendar conflict', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      { scheduledAt: new Date('2026-09-21T18:00:00.000Z'), requests: { type: 'battle_review', durationMinutes: 60 } },
    ])
    const availability = await getIndividualAvailabilityForScheduledAt({
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-21T17:15:00.000Z'),
    })
    expect(availability.candidate).toMatchObject({ available: false, reason: 'Зайнято' })
  })

  it('rejects a date outside the persisted Individual weekly availability', async () => {
    const availability = await getIndividualAvailabilityForScheduledAt({
      expertId: 'expert-1',
      scheduledAt: new Date('2026-09-22T15:00:00.000Z'),
    })
    expect(availability.candidate).toMatchObject({ available: false, reason: 'Час недоступний у розкладі коуча' })
  })

  it('generates 15-minute starts through the final full 60-minute interval', async () => {
    mockExpertFindUnique.mockResolvedValue({
      zoomAvailability: [{
        ...mondayIndividualWindow,
        dayOfWeek: 2,
        hour: 12,
        minute: 0,
        endHour: 18,
        endMinute: 0,
      }],
    })

    const candidates = await getIndividualAvailabilityForDate({ expertId: 'expert-1', date: '2026-09-22' })
    expect(candidates).toHaveLength(21)
    expect(candidates.at(-1)).toMatchObject({ scheduledAt: '2026-09-22T14:00:00.000Z', available: true })
  })

  it('marks every 60-minute candidate overlapping an occupied interval busy and permits back-to-back', async () => {
    mockExpertFindUnique.mockResolvedValue({
      zoomAvailability: [{ ...mondayIndividualWindow, hour: 12, endHour: 18 }],
    })
    mockZoomSessionFindMany.mockResolvedValue([
      { scheduledAt: new Date('2026-09-21T09:30:00.000Z'), requests: { type: 'individual', durationMinutes: 60 } },
    ])

    const candidates = await getIndividualAvailabilityForDate({ expertId: 'expert-1', date: '2026-09-21' })
    for (const time of ['09:00', '09:15', '09:30', '09:45', '10:00', '10:15']) {
      expect(candidates.find((slot) => slot.scheduledAt === `2026-09-21T${time}:00.000Z`)).toMatchObject({
        available: false,
        reason: 'Зайнято',
      })
    }
    expect(candidates.find((slot) => slot.scheduledAt === '2026-09-21T10:30:00.000Z')).toMatchObject({ available: true })
  })

  it('does not reserve inventory for REQUESTED commerce but blocks an active payment hold or PAID request', async () => {
    const scheduledAt = new Date('2030-01-07T12:00:00.000Z')
    mockExpertFindUnique.mockResolvedValue({
      zoomAvailability: [{ ...mondayIndividualWindow, timezone: 'UTC', hour: 12, endHour: 14 }],
    })
    mockZoomCommerceRequestFindMany.mockResolvedValue([
      { scheduledAt, status: 'REQUESTED', approvedAt: null },
    ])
    expect((await getIndividualAvailabilityForDate({ expertId: 'expert-1', date: '2030-01-07' }))
      .find((slot) => slot.scheduledAt === scheduledAt.toISOString())).toMatchObject({ available: true })

    mockZoomCommerceRequestFindMany.mockResolvedValue([
      { scheduledAt, status: 'APPROVED_PENDING_PAYMENT', approvedAt: new Date() },
    ])
    expect((await getIndividualAvailabilityForDate({ expertId: 'expert-1', date: '2030-01-07' }))
      .find((slot) => slot.scheduledAt === scheduledAt.toISOString())).toMatchObject({ available: false, reason: 'Зайнято' })

    mockZoomCommerceRequestFindMany.mockResolvedValue([
      { scheduledAt, status: 'PAID', approvedAt: new Date() },
    ])
    expect((await getIndividualAvailabilityForDate({ expertId: 'expert-1', date: '2030-01-07' }))
      .find((slot) => slot.scheduledAt === scheduledAt.toISOString())).toMatchObject({ available: false, reason: 'Зайнято' })
  })

  it('releases expired, rejected and cancelled payment holds without waiting for cleanup', async () => {
    const scheduledAt = new Date('2030-01-07T12:00:00.000Z')
    mockExpertFindUnique.mockResolvedValue({
      zoomAvailability: [{ ...mondayIndividualWindow, timezone: 'UTC', hour: 12, endHour: 14 }],
    })
    for (const request of [
      { scheduledAt, status: 'APPROVED_PENDING_PAYMENT', approvedAt: new Date(Date.now() - 2 * 60 * 60_000) },
      { scheduledAt, status: 'REJECTED', approvedAt: new Date() },
      { scheduledAt, status: 'EXPIRED', approvedAt: new Date() },
      { scheduledAt, status: 'CANCELLED', approvedAt: new Date() },
    ]) {
      mockZoomCommerceRequestFindMany.mockResolvedValue([request])
      expect((await getIndividualAvailabilityForDate({ expertId: 'expert-1', date: '2030-01-07' }))
        .find((slot) => slot.scheduledAt === scheduledAt.toISOString())).toMatchObject({ available: true })
    }
  })

  it('summarizes a bounded date range from one loaded availability and blocker set', async () => {
    vi.clearAllMocks()
    mockExpertFindUnique.mockResolvedValue({ zoomAvailability: [mondayIndividualWindow] })
    mockZoomSessionFindMany.mockResolvedValue([])
    mockZoomCommerceRequestFindMany.mockResolvedValue([])
    const summary = await getIndividualAvailabilitySummary({
      expertId: 'expert-1', from: '2026-09-21', to: '2026-09-22',
    })
    expect(summary).toEqual([
      expect.objectContaining({ date: '2026-09-21', hasIndividualWindow: true, availableCount: 17, hasAvailableIndividual: true }),
      expect.objectContaining({ date: '2026-09-22', hasIndividualWindow: false, availableCount: 0, hasAvailableIndividual: false }),
    ])
    expect(mockExpertFindUnique).toHaveBeenCalledTimes(1)
    expect(mockZoomSessionFindMany).toHaveBeenCalledTimes(1)
    expect(mockZoomCommerceRequestFindMany).toHaveBeenCalledTimes(1)
    await expect(getIndividualAvailabilitySummary({
      expertId: 'expert-1', from: '2026-09-01', to: '2026-10-13',
    })).rejects.toThrow('invalid_date_range')
  })

  it('distinguishes a declared Individual window with no remaining inventory', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      { scheduledAt: new Date('2026-09-21T14:00:00.000Z'), requests: { type: 'group_practice', durationMinutes: 300 } },
    ])

    await expect(getIndividualAvailabilitySummary({
      expertId: 'expert-1', from: '2026-09-21', to: '2026-09-21',
    })).resolves.toEqual([
      { date: '2026-09-21', hasIndividualWindow: true, availableCount: 0, hasAvailableIndividual: false },
    ])
  })

  it('resolves no override as the recurring weekday template and an empty override as OFF', async () => {
    const thursdayWindow = { ...mondayIndividualWindow, id: 'thu', dayOfWeek: 4, hour: 12, endHour: 18 }
    mockExpertFindUnique.mockResolvedValue({ zoomAvailability: [thursdayWindow] })
    const inherited = await getAvailabilityWeek('expert-1', '2026-09-28')
    expect(inherited.find((day) => day.date === '2026-10-01')).toMatchObject({ source: 'recurring', hasOverride: false, windows: [expect.objectContaining({ hour: 12, endHour: 18 })] })

    mockAvailabilityOverrideFindMany.mockResolvedValue([{ date: new Date('2026-10-01T00:00:00.000Z'), windows: [] }])
    mockAvailabilityOverrideFindUnique.mockResolvedValue({ windows: [] })
    const overridden = await getAvailabilityWeek('expert-1', '2026-09-28')
    expect(overridden.find((day) => day.date === '2026-10-01')).toEqual({ date: '2026-10-01', source: 'override', hasOverride: true, windows: [] })
    await expect(getIndividualAvailabilityForDate({ expertId: 'expert-1', date: '2026-10-01' })).resolves.toEqual([])
  })

  it('replaces one concrete date only and restores recurring inheritance when reset', async () => {
    const recurring = { ...mondayIndividualWindow, id: 'sat-recurring', dayOfWeek: 6, hour: 12, endHour: 18 }
    const override = { ...recurring, id: 'sat-override', hour: 10, endHour: 14 }
    let storedOverride: Array<typeof override> | null = [override]
    mockExpertFindUnique.mockResolvedValue({ zoomAvailability: [recurring] })
    mockAvailabilityOverrideFindMany.mockImplementation(async () => storedOverride ? [{ date: new Date('2026-10-03T00:00:00.000Z'), windows: storedOverride }] : [])
    mockAvailabilityOverrideUpsert.mockImplementation(async ({ create }: { create: { windows: Array<typeof override> } }) => { storedOverride = create.windows })
    mockAvailabilityOverrideDelete.mockImplementation(async () => { storedOverride = null })
    const week = await getAvailabilityWeek('expert-1', '2026-09-28')
    expect(week.find((day) => day.date === '2026-10-03')).toMatchObject({ source: 'override', windows: [expect.objectContaining({ hour: 10, endHour: 14 })] })
    const nextWeek = await getAvailabilityWeek('expert-1', '2026-10-05')
    expect(nextWeek.find((day) => day.date === '2026-10-10')).toMatchObject({ source: 'recurring', windows: [expect.objectContaining({ hour: 12, endHour: 18 })] })

    await saveAvailabilityWeek({ expertId: 'expert-1', from: '2026-09-28', days: [{ date: '2026-10-03', reset: true }] })
    expect(mockAvailabilityOverrideDelete).toHaveBeenCalledWith(expect.objectContaining({ where: { expertId_date: { expertId: 'expert-1', date: new Date('2026-10-03T00:00:00.000Z') } } }))
    expect(mockExpertUpdate).not.toHaveBeenCalled()
    const restored = await getAvailabilityWeek('expert-1', '2026-09-28')
    expect(restored.find((day) => day.date === '2026-10-03')).toMatchObject({ source: 'recurring', hasOverride: false, windows: [expect.objectContaining({ hour: 12, endHour: 18 })] })
  })

  it('rejects non-quarter-hour, shorter-than-60-minute, and overlapping override windows', async () => {
    const base = { ...mondayIndividualWindow, dayOfWeek: 1, hour: 10, minute: 0, endHour: 11, endMinute: 0 }
    await expect(saveAvailabilityWeek({ expertId: 'expert-1', from: '2026-09-28', days: [{ date: '2026-09-28', windows: [{ ...base, minute: 10 }] }] })).rejects.toThrow('invalid_availability_window')
    await expect(saveAvailabilityWeek({ expertId: 'expert-1', from: '2026-09-28', days: [{ date: '2026-09-28', windows: [{ ...base, endHour: 10, endMinute: 45 }] }] })).rejects.toThrow('invalid_availability_window')
    await expect(saveAvailabilityWeek({ expertId: 'expert-1', from: '2026-09-28', days: [{ date: '2026-09-28', windows: [base, { ...base, id: 'overlap', hour: 10, minute: 30, endHour: 11, endMinute: 30 }] }] })).rejects.toThrow('overlapping_availability_windows')
  })
})
