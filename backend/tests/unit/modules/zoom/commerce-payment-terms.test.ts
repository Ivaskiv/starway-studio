import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getCalendarRequests,
  resolveIndividualPaymentDeadline,
  resolveZoomIndividualPaymentTerms,
} from '../../../../src/modules/zoom/commerce/zoom.commerce-request.service.ts'

const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
})

describe('Zoom Individual payment terms', () => {
  it('uses 1 UAH only for development and test runtimes', () => {
    process.env.NODE_ENV = 'development'
    expect(resolveZoomIndividualPaymentTerms()).toEqual({ amount: 1, currency: 'UAH' })

    process.env.NODE_ENV = 'test'
    expect(resolveZoomIndividualPaymentTerms()).toEqual({ amount: 1, currency: 'UAH' })
  })

  it('preserves the production 60 EUR contract', () => {
    process.env.NODE_ENV = 'production'
    expect(resolveZoomIndividualPaymentTerms()).toEqual({ amount: 60, currency: 'EUR' })
  })

  it('uses the shorter of one hour after approval and thirty minutes before the session', () => {
    expect(resolveIndividualPaymentDeadline({
      approvedAt: new Date('2026-09-21T12:00:00.000Z'),
      scheduledAt: new Date('2026-09-21T15:00:00.000Z'),
    }).toISOString()).toBe('2026-09-21T13:00:00.000Z')

    expect(resolveIndividualPaymentDeadline({
      approvedAt: new Date('2026-09-21T11:00:00.000Z'),
      scheduledAt: new Date('2026-09-21T12:00:00.000Z'),
    }).toISOString()).toBe('2026-09-21T11:30:00.000Z')
  })

  it('keeps the calendar commerce projection read-only', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const transaction = vi.fn()

    await expect(getCalendarRequests({
      zoomSessionIds: ['session-1'],
      requesterUserId: 'user-1',
    }, {
      zoomCommerceRequest: { findMany },
      $transaction: transaction,
    } as never)).resolves.toEqual([])

    expect(findMany).toHaveBeenCalledOnce()
    expect(transaction).not.toHaveBeenCalled()
  })
})
