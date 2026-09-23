import { describe, expect, it } from 'vitest'
import {
  getIndividualSessionStatusLabel,
  resolveIndividualSessionState,
} from '../../../../src/modules/zoom/domain/individual-session-lifecycle.js'

describe('canonical Individual lifecycle', () => {
  it.each([
    ['SCHEDULED', 'REQUESTED', 'PENDING_CONFIRMATION', '🟡 Очікує підтвердження'],
    ['SCHEDULED', 'APPROVED_PENDING_PAYMENT', 'PENDING_PAYMENT', '🟠 Очікує оплати'],
    ['SCHEDULED', 'PAID', 'SCHEDULED', '🔵 Заплановано'],
    ['ACTIVE', 'PAID', 'ACTIVE', '🔵 Триває'],
    ['COMPLETED', 'PAID', 'COMPLETED', '🟢 Проведено'],
    ['CANCELLED', 'PAID', 'CANCELLED', '🔴 Скасовано'],
    ['SCHEDULED', 'REJECTED', 'REJECTED', '🔴 Відхилено'],
    ['SCHEDULED', 'EXPIRED', 'EXPIRED', '⚪️ Час оплати вичерпано'],
    ['SCHEDULED', 'CANCELLED', 'CANCELLED', '🔴 Скасовано'],
    ['SCHEDULED', null, 'PAYMENT_UNVERIFIED', '⚪️ Оплату не підтверджено'],
  ] as const)(
    '%s + %s -> %s',
    (sessionStatus, commerceStatus, state, label) => {
      expect(
        resolveIndividualSessionState({
          sessionStatus,
          commerceStatus,
        }),
      ).toBe(state)

      expect(
        getIndividualSessionStatusLabel({
          role: 'user',
          sessionStatus,
          commerceStatus,
        }),
      ).toBe(label)

      expect(
        getIndividualSessionStatusLabel({
          role: 'coach',
          sessionStatus,
          commerceStatus,
        }),
      ).toBe(label)
    },
  )

  it('session terminal state wins over stale PAID commerce state', () => {
    expect(
      resolveIndividualSessionState({
        sessionStatus: 'COMPLETED',
        commerceStatus: 'PAID',
      }),
    ).toBe('COMPLETED')

    expect(
      resolveIndividualSessionState({
        sessionStatus: 'CANCELLED',
        commerceStatus: 'PAID',
      }),
    ).toBe('CANCELLED')
  })
})
